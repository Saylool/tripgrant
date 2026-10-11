import { describe, it, expect } from "vitest";
import {
  parseAmount,
  formatAmount,
  decimalAmount,
  U64_MAX,
} from "../shared/amounts";

describe("exact six-decimal money", () => {
  it("keeps the settlement amounts exact", () => {
    expect(parseAmount("100")).toBe(100_000_000n);
    expect(parseAmount("72.00")).toBe(72_000_000n);
    expect(parseAmount("100") - parseAmount("72")).toBe(28_000_000n);
    expect(parseAmount("0.000001")).toBe(1n);
  });
  it.each([
    "",
    "0",
    "-1",
    "1e3",
    "NaN",
    "Infinity",
    "1.0000001",
    ".5",
    "1.",
    "1,000",
    "01",
    "1000000000000000000000000000",
  ])("rejects unsafe input %j", (value) =>
    expect(() => parseAmount(value)).toThrow(),
  );
  it("supports deliberate rejection and the entire u64 range", () => {
    expect(parseAmount("0", true)).toBe(0n);
    expect(parseAmount("18446744073709.551615")).toBe(U64_MAX);
    expect(() => parseAmount("18446744073709.551616")).toThrow();
  });
  it("preserves precision while formatting human readable balances", () => {
    expect(formatAmount(1n)).toBe("0.000001");
    expect(formatAmount(100_000_000n)).toBe("100.00");
    expect(formatAmount(1_234_500_000n)).toBe("1,234.50");
    expect(decimalAmount(U64_MAX)).toBe("18446744073709.551615");
    expect(parseAmount(decimalAmount(U64_MAX))).toBe(U64_MAX);
  });
});
