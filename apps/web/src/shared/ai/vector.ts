import { Array, Boolean, Option, pipe } from "effect";

const DIMENSIONS = 1024;
const INT8_MAX = 127;
const NO_SCALE = 0;
const SCALE_BYTES = 4;
const VECTOR_BYTES = SCALE_BYTES + DIMENSIONS;
const START = 0;
const LITTLE_ENDIAN = true;

type Quantized = Readonly<{ values: Int8Array; scale: number }>;

const lengthOf = (vector: readonly number[]): number => Math.hypot(...vector);

const peakOf = (vector: readonly number[]): number =>
  Math.max(
    NO_SCALE,
    ...pipe(
      vector,
      Array.map((value) => Math.abs(value)),
    ),
  );

const quantize = (raw: readonly number[]): Quantized => {
  const length = lengthOf(raw);
  const peak = peakOf(raw);
  return Boolean.match(length === NO_SCALE || peak === NO_SCALE, {
    onTrue: () => ({ values: new Int8Array(raw.length), scale: NO_SCALE }),
    onFalse: () => {
      const step = peak / INT8_MAX;
      return {
        values: Int8Array.from(raw, (value) => Math.round(value / step)),
        scale: step / length,
      };
    },
  });
};

const dequantize = ({ values, scale }: Quantized): readonly number[] =>
  pipe(
    Array.fromIterable(values),
    Array.map((value) => value * scale),
  );

const encodeVector = ({ values, scale }: Quantized): Uint8Array => {
  const bytes = new Uint8Array(VECTOR_BYTES);
  new DataView(bytes.buffer).setFloat32(START, scale, LITTLE_ENDIAN);
  bytes.set(new Uint8Array(values.buffer, values.byteOffset, values.byteLength), SCALE_BYTES);
  return bytes;
};

const decodeVector = (bytes: Uint8Array): Option.Option<Quantized> =>
  Option.liftPredicate(Uint8Array.from(bytes), ({ length }) => length === VECTOR_BYTES).pipe(
    Option.map((copy) => ({
      scale: new DataView(copy.buffer).getFloat32(START, LITTLE_ENDIAN),
      values: new Int8Array(copy.buffer, SCALE_BYTES, DIMENSIONS),
    })),
  );

export { decodeVector, DIMENSIONS, dequantize, encodeVector, quantize };
export type { Quantized };
