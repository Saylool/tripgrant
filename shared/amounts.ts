export const DECIMALS = 6;
export const SCALE = 1_000_000n;
export const U64_MAX = (1n << 64n) - 1n;

// Never pass currency through floating point when creating a transaction.
export function parseAmount(input: string, allowZero = false): bigint {
  const value = input.trim();
  if (!/^(0|[1-9]\d*)(\.\d{1,6})?$/.test(value)) {
    throw new Error("Enter a valid amount with up to 6 decimal places.");
  }
  const [whole, fraction = ""] = value.split(".");
  const units = BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0"));
  if ((!allowZero && units === 0n) || units > U64_MAX)
    throw new Error("Amount is outside the supported range.");
  return units;
}

export function formatAmount(units: string | bigint, precision = 2): string {
  const value = BigInt(units);
  const fraction = (value % SCALE).toString().padStart(6, "0");
  const whole = (value / SCALE)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const visible = fraction.slice(
    0,
    Math.max(precision, fraction.replace(/0+$/, "").length),
  );
  return `${whole}${visible ? "." + visible : ""}`;
}

export function decimalAmount(units: string | bigint): string {
  const value = BigInt(units);
  const tail = (value % SCALE).toString().padStart(6, "0").replace(/0+$/, "");
  return `${value / SCALE}${tail ? "." + tail : ""}`;
}

export function shortAddress(address: string, size = 4): string {
  return address.length > size * 2 + 2
    ? `${address.slice(0, size)}…${address.slice(-size)}`
    : address;
}
