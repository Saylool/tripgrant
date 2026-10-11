import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import { parseAmount } from "../shared/amounts.js";
import { HttpError } from "./security.js";

const address = z.string().refine((v) => {
  try {
    new PublicKey(v);
    return true;
  } catch {
    return false;
  }
}, "Enter a valid Solana wallet address.");
export const fundSchema = z.object({
  eventName: z.string().trim().min(3).max(100),
  studentName: z.string().trim().min(2).max(80),
  destination: z.string().trim().min(2).max(100),
  purpose: z.string().trim().min(5).max(300),
  student: address,
  reviewer: address,
  amount: z
    .string()
    .max(30)
    .refine((v) => {
      try {
        parseAmount(v);
        return true;
      } catch {
        return false;
      }
    }, "Enter a positive amount with up to 6 decimal places."),
  claimDeadline: z.number().int().positive(),
  reviewDeadline: z.number().int().positive(),
});
export function validate<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new HttpError(
      400,
      result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(" "),
    );
  return result.data;
}
export const amountSchema = z.object({ amount: z.string().max(30) });
