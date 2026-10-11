import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
const converter = createRequire(import.meta.url)(
  "../vendor/bigint-buffer/index.cjs",
);
describe("pure JavaScript SPL integer compatibility", () => {
  it("round-trips the full u64 range in each endianness without native code", () => {
    const maximum = (1n << 64n) - 1n;
    expect(converter.toBigIntLE(converter.toBufferLE(maximum, 8))).toBe(
      maximum,
    );
    expect(converter.toBigIntBE(converter.toBufferBE(maximum, 8))).toBe(
      maximum,
    );
    expect(converter.toBufferLE(0x0102030405060708n, 8).toString("hex")).toBe(
      "0807060504030201",
    );
    expect(converter.toBufferBE(0x0102030405060708n, 8).toString("hex")).toBe(
      "0102030405060708",
    );
  });
  it("rejects truncation, negative numbers and excessive widths", () => {
    expect(() => converter.toBufferLE(256n, 1)).toThrow();
    expect(() => converter.toBufferLE(-1n, 8)).toThrow();
    expect(() => converter.toBufferBE(0n, 1025)).toThrow();
    expect(() => converter.toBigIntLE(Buffer.alloc(1025))).toThrow();
  });
  it("handles zero and does not mutate the supplied bytes", () => {
    const bytes = Buffer.from([1, 2, 3, 4]);
    const copy = Buffer.from(bytes);
    expect(converter.toBigIntLE(Buffer.alloc(0))).toBe(0n);
    expect(converter.toBufferLE(0n, 0)).toEqual(Buffer.alloc(0));
    converter.toBigIntLE(bytes);
    expect(bytes).toEqual(copy);
  });
});
