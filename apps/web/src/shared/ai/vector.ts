import { Boolean } from "effect";

const DIMENSIONS = 1024;
const INT8_MAX = 127;
const NO_SCALE = 0;

type Quantized = Readonly<{ values: Int8Array; scale: number }>;

const lengthOf = (vector: readonly number[]): number => Math.hypot(...vector);

const peakOf = (vector: readonly number[]): number =>
  Math.max(NO_SCALE, ...vector.map((value) => Math.abs(value)));

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
  Array.from(values, (value) => value * scale);

export { DIMENSIONS, dequantize, quantize };
export type { Quantized };
