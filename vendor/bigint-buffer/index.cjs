"use strict";
const { Buffer } = require("buffer");
function bytes(input) {
  if (!(input instanceof Uint8Array))
    throw new TypeError("Expected a byte array.");
  if (input.length > 1024)
    throw new RangeError("Integer exceeds the supported 1024-byte width.");
  return Buffer.from(input);
}
function toBigIntBE(input) {
  const hex = bytes(input).toString("hex");
  return hex ? BigInt("0x" + hex) : 0n;
}
function toBigIntLE(input) {
  return toBigIntBE(bytes(input).reverse());
}
function toBufferBE(value, width) {
  if (typeof value !== "bigint" || value < 0n)
    throw new RangeError("Expected an unsigned bigint.");
  if (!Number.isSafeInteger(width) || width < 0 || width > 1024)
    throw new RangeError("Invalid integer width.");
  if (value >= 1n << BigInt(width * 8))
    throw new RangeError("Integer does not fit the specified width.");
  if (width === 0) return Buffer.alloc(0);
  return Buffer.from(value.toString(16).padStart(width * 2, "0"), "hex");
}
function toBufferLE(value, width) {
  return toBufferBE(value, width).reverse();
}
module.exports = { toBigIntBE, toBigIntLE, toBufferBE, toBufferLE };
