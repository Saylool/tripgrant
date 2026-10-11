import { describe, it, expect } from "vitest";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";
import {
  authorizeReceipt,
  issueChallenge,
  verifyChallenge,
  validateReceipt,
  sameOrigin,
} from "../server/security";
import { sampleReceipt } from "../server/sample";
import { fundSchema, validate } from "../server/validation";

describe("private evidence and wallet authentication", () => {
  it("verifies the wallet signature, binds the origin and consumes the nonce", () => {
    const wallet = Keypair.generate();
    const challenge = issueChallenge(
      wallet.publicKey.toBase58(),
      "http://127.0.0.1:5173",
    );
    expect(challenge.message).toContain("Origin: http://127.0.0.1:5173");
    const signature = bs58.encode(
      nacl.sign.detached(Buffer.from(challenge.message), wallet.secretKey),
    );
    expect(verifyChallenge(challenge.nonce, signature).address).toBe(
      wallet.publicKey.toBase58(),
    );
    expect(() => verifyChallenge(challenge.nonce, signature)).toThrow(
      "already used",
    );
  });
  it("rejects an impersonator and consumes the failed challenge", () => {
    const legitimate = Keypair.generate();
    const attacker = Keypair.generate();
    const challenge = issueChallenge(
      legitimate.publicKey.toBase58(),
      "http://localhost:5173",
    );
    const signature = bs58.encode(
      nacl.sign.detached(Buffer.from(challenge.message), attacker.secretKey),
    );
    expect(() => verifyChallenge(challenge.nonce, signature)).toThrow(
      "could not be verified",
    );
    expect(() => verifyChallenge(challenge.nonce, signature)).toThrow(
      "already used",
    );
  });
  it("allows only the three fixed grant participants to read receipts", () => {
    const keys = [
      Keypair.generate(),
      Keypair.generate(),
      Keypair.generate(),
      Keypair.generate(),
    ];
    const grant = {
      sponsor: keys[0].publicKey,
      student: keys[1].publicKey,
      reviewer: keys[2].publicKey,
    };
    keys
      .slice(0, 3)
      .forEach((k) =>
        expect(() =>
          authorizeReceipt(k.publicKey.toBase58(), grant),
        ).not.toThrow(),
      );
    expect(() => authorizeReceipt(keys[3].publicKey.toBase58(), grant)).toThrow(
      "Only the grant participants",
    );
  });
  it("checks magic bytes, size and allowed receipt formats", () => {
    expect(() =>
      validateReceipt(sampleReceipt(), "application/pdf"),
    ).not.toThrow();
    expect(() =>
      validateReceipt(
        Buffer.from("<script>alert(1)</script>"),
        "application/pdf",
      ),
    ).toThrow("valid PDF");
    expect(() => validateReceipt(sampleReceipt(), "text/html")).toThrow();
    expect(() =>
      validateReceipt(Buffer.alloc(5 * 1024 * 1024 + 1), "image/png"),
    ).toThrow("5 MB");
    expect(() => validateReceipt(Buffer.alloc(0), "image/png")).toThrow();
  });
  it.each([
    { host: "malicious.example", origin: undefined },
    { host: "127.0.0.1:5173", origin: "https://malicious.example" },
    {
      host: "localhost:5173",
      origin: "http://localhost:5173",
      site: "cross-site",
    },
  ])("rejects cross-origin localhost access: %j", (data) => {
    let failure: Error | undefined;
    sameOrigin(
      {
        get: (name: string) =>
          name === "host"
            ? data.host
            : name === "origin"
              ? data.origin
              : name === "sec-fetch-site"
                ? data.site
                : undefined,
      } as any,
      {} as any,
      (err?: any) => {
        failure = err;
      },
    );
    expect(failure).toBeDefined();
  });
  it("accepts only a valid funded-grant request", () => {
    const student = Keypair.generate().publicKey.toBase58();
    const reviewer = Keypair.generate().publicKey.toBase58();
    const input = {
      eventName: "Synthetic event",
      studentName: "Demo student",
      destination: "Demo city",
      purpose: "Conference transport",
      student,
      reviewer,
      amount: "100",
      claimDeadline: 1000,
      reviewDeadline: 2000,
    };
    expect(validate(fundSchema, input).amount).toBe("100");
    expect(() => validate(fundSchema, { ...input, amount: "-3" })).toThrow();
    expect(() =>
      validate(fundSchema, { ...input, student: "not-a-wallet" }),
    ).toThrow();
  });
});
