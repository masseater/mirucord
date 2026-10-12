import { Effect, Schema } from "effect";

import { DIMENSIONS } from "#/shared/ai";
import type { Quantized } from "#/shared/ai";

const HEADER_BYTES = 4;
const FLOAT_BYTES = 4;
const LITTLE_ENDIAN = true;
const START = 0;
const NEXT_ROW = 1;

const BlockHeader = Schema.Struct({
  ordinals: Schema.Array(Schema.Int),
  channelIds: Schema.Array(Schema.String),
});

const BlockHeaderJson = Schema.fromJsonString(BlockHeader);
const encodeHeader = Schema.encodeEffect(BlockHeaderJson);
const decodeHeader = Schema.decodeEffect(BlockHeaderJson);

type VectorEntry = Readonly<{
  ordinal: number;
  channelId: string;
  vector: Quantized;
}>;

type VectorBlock = typeof BlockHeader.Type &
  Readonly<{
    scales: Float32Array;
    values: Int8Array;
  }>;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const alignedTo = (bytes: number, alignment: number): number =>
  Math.ceil(bytes / alignment) * alignment;

const blockOf = (entries: readonly VectorEntry[]): VectorBlock => {
  const values = new Int8Array(entries.length * DIMENSIONS);
  for (const [row, { vector }] of entries.entries()) {
    values.set(vector.values, row * DIMENSIONS);
  }
  return {
    ordinals: entries.map(({ ordinal }) => ordinal),
    channelIds: entries.map(({ channelId }) => channelId),
    scales: Float32Array.from(entries, ({ vector }) => vector.scale),
    values,
  };
};

const entriesOf = (block: VectorBlock): readonly VectorEntry[] =>
  block.ordinals.map((ordinal, row) => ({
    ordinal,
    channelId: block.channelIds[row] ?? "",
    vector: {
      values: block.values.slice(row * DIMENSIONS, (row + NEXT_ROW) * DIMENSIONS),
      scale: block.scales[row] ?? START,
    },
  }));

const asBytes = (view: Float32Array | Int8Array): Uint8Array =>
  new Uint8Array(view.buffer, view.byteOffset, view.byteLength);

const layOut = (block: VectorBlock, header: Uint8Array): Uint8Array => {
  const scalesAt = alignedTo(HEADER_BYTES + header.length, FLOAT_BYTES);
  const valuesAt = scalesAt + block.scales.byteLength;
  const bytes = new Uint8Array(valuesAt + block.values.byteLength);
  new DataView(bytes.buffer).setUint32(START, header.length, LITTLE_ENDIAN);
  bytes.set(header, HEADER_BYTES);
  bytes.set(asBytes(block.scales), scalesAt);
  bytes.set(asBytes(block.values), valuesAt);
  return bytes;
};

const encodeBlock = (block: VectorBlock): Effect.Effect<Uint8Array> =>
  encodeHeader({ ordinals: block.ordinals, channelIds: block.channelIds }).pipe(
    Effect.orDie,
    Effect.map((header) => layOut(block, textEncoder.encode(header))),
  );

const decodeBlock = (bytes: Uint8Array): Effect.Effect<VectorBlock> => {
  const copy = Uint8Array.from(bytes);
  const headerLength = new DataView(copy.buffer).getUint32(START, LITTLE_ENDIAN);
  return decodeHeader(
    textDecoder.decode(copy.subarray(HEADER_BYTES, HEADER_BYTES + headerLength)),
  ).pipe(
    Effect.orDie,
    Effect.map(({ ordinals, channelIds }) => {
      const rows = ordinals.length;
      const scalesAt = alignedTo(HEADER_BYTES + headerLength, FLOAT_BYTES);
      return {
        ordinals,
        channelIds,
        scales: new Float32Array(copy.buffer, scalesAt, rows),
        values: new Int8Array(copy.buffer, scalesAt + rows * FLOAT_BYTES, rows * DIMENSIONS),
      };
    }),
  );
};

export { blockOf, decodeBlock, encodeBlock, entriesOf };
export type { VectorBlock, VectorEntry };
