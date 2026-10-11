import { randomBytes } from "node:crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import type { Request, Response, NextFunction } from "express";
import { demo, walletAddresses, publicOrigin } from "./config.js";
import type { Role } from "../shared/types.js";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const roles: Role[] = ["sponsor", "student", "reviewer"];
const nonces = new Map<
  string,
  { address: string; message: string; expires: number }
>();
const sessions = new Map<string, { address: string; expires: number }>();
const attempts = new Map<string, { count: number; expires: number }>();

export function sameOrigin(req: Request, _res: Response, next: NextFunction) {
  const host = req.get("host") || "";
  const allowedHost = publicOrigin
    ? host === new URL(publicOrigin).host
    : /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host);
  if (!allowedHost)
    return next(new HttpError(403, "Request host is not allowed."));
  const origin = req.get("origin");
  if (
    origin &&
    (publicOrigin
      ? origin !== publicOrigin
      : origin !== `http://${host}` && origin !== `https://${host}`)
  )
    return next(new HttpError(403, "Cross-origin requests are disabled."));
  if (req.get("sec-fetch-site") === "cross-site")
    return next(new HttpError(403, "Cross-site requests are disabled."));
  next();
}
export function rateLimit(req: Request, _res: Response, next: NextFunction) {
  const now = Date.now();
  if (attempts.size > 500)
    for (const [k, v] of attempts) if (v.expires < now) attempts.delete(k);
  const key = req.ip || "loopback";
  let entry = attempts.get(key);
  if (!entry || entry.expires < now) {
    entry = { count: 0, expires: now + 60_000 };
    attempts.set(key, entry);
  }
  if (++entry.count > 150)
    return next(
      new HttpError(429, "Too many requests. Please try again shortly."),
    );
  next();
}
export function actor(req: Request): string {
  if (demo) {
    const role = req.get("x-demo-role") as Role;
    if (!roles.includes(role)) throw new HttpError(401, "Choose a demo role.");
    return walletAddresses[role];
  }
  const token = req.get("authorization")?.replace(/^Bearer /, "") || "";
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    sessions.delete(token);
    throw new HttpError(401, "Connect your wallet and sign in.");
  }
  return session.address;
}
export function demoRole(req: Request): Role {
  if (!demo) throw new HttpError(403, "Demo wallet signing is disabled.");
  actor(req);
  return req.get("x-demo-role") as Role;
}
export function issueChallenge(input: unknown, origin: string) {
  if (typeof input !== "string")
    throw new HttpError(400, "A wallet address is required.");
  let address: string;
  try {
    address = new PublicKey(input).toBase58();
  } catch {
    throw new HttpError(400, "Invalid wallet address.");
  }
  const now = Date.now();
  for (const [k, v] of nonces) if (v.expires < now) nonces.delete(k);
  if (nonces.size > 500)
    throw new HttpError(429, "Too many pending sign-in requests.");
  const nonce = randomBytes(24).toString("hex");
  const expires = now + 5 * 60_000;
  const message = `TripGrant wallet sign-in\nOrigin: ${origin}\nNetwork: devnet\nWallet: ${address}\nNonce: ${nonce}\nExpires: ${new Date(expires).toISOString()}\nThis signature authorizes private receipt access; it does not move funds.`;
  nonces.set(nonce, { address, message, expires });
  return { nonce, message, expires };
}
export function verifyChallenge(nonce: unknown, signature: unknown) {
  if (
    typeof nonce !== "string" ||
    typeof signature !== "string" ||
    signature.length > 100
  )
    throw new HttpError(400, "Invalid sign-in response.");
  const challenge = nonces.get(nonce);
  nonces.delete(nonce); // Consume on every attempt, including an invalid signature.
  if (!challenge || challenge.expires < Date.now())
    throw new HttpError(401, "Sign-in challenge expired or already used.");
  let valid = false;
  try {
    valid = nacl.sign.detached.verify(
      Buffer.from(challenge.message),
      bs58.decode(signature),
      new PublicKey(challenge.address).toBytes(),
    );
  } catch {
    /* Invalid signature format. */
  }
  if (!valid)
    throw new HttpError(401, "The wallet signature could not be verified.");
  for (const [k, v] of sessions) if (v.expires < Date.now()) sessions.delete(k);
  const token = randomBytes(32).toString("hex");
  sessions.set(token, {
    address: challenge.address,
    expires: Date.now() + 60 * 60_000,
  });
  return {
    token,
    address: challenge.address,
    expires: Date.now() + 60 * 60_000,
  };
}
export function authorizeReceipt(
  address: string,
  grant: { sponsor: PublicKey; student: PublicKey; reviewer: PublicKey },
) {
  if (
    ![grant.sponsor, grant.student, grant.reviewer].some(
      (key) => key.toBase58() === address,
    )
  )
    throw new HttpError(
      403,
      "Only the grant participants may access this receipt.",
    );
}
export function validateReceipt(content: Uint8Array, mime: string): void {
  if (!content.length || content.length > 5 * 1024 * 1024)
    throw new HttpError(400, "Receipt must be between 1 byte and 5 MB.");
  const b = Buffer.from(content);
  const pdf = b.subarray(0, 5).toString() === "%PDF-";
  const png = b
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (!(
    (mime === "application/pdf" && pdf) ||
    (mime === "image/png" && png) ||
    (mime === "image/jpeg" && jpeg)
  ))
    throw new HttpError(400, "Upload a valid PDF, PNG or JPEG receipt.");
}
