import {
  AnchorProvider,
  BN,
  Program,
  type Idl,
  type Wallet,
} from "@anchor-lang/core";
import {
  PublicKey,
  Keypair,
  Transaction,
  VersionedTransaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  getAccount,
} from "@solana/spl-token";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { connection, programId, mint } from "./config.js";
import type { GrantView } from "../shared/types.js";

export const hash = (data: string | Uint8Array) =>
  createHash("sha256").update(data).digest();
export function walletFor(payer: Keypair): Wallet {
  return {
    publicKey: payer.publicKey,
    payer,
    async signTransaction<T extends Transaction | VersionedTransaction>(
      tx: T,
    ): Promise<T> {
      if (tx instanceof VersionedTransaction) tx.sign([payer]);
      else tx.partialSign(payer);
      return tx;
    },
    async signAllTransactions<T extends Transaction | VersionedTransaction>(
      txs: T[],
    ): Promise<T[]> {
      return Promise.all(txs.map((tx) => this.signTransaction(tx)));
    },
  };
}
export function program(wallet?: Wallet) {
  const idl = JSON.parse(readFileSync("shared/idl.json", "utf8")) as Idl;
  if (idl.address !== programId.toBase58())
    throw new Error("IDL does not match the configured program. Rebuild it.");
  return new Program(
    idl,
    wallet
      ? new AnchorProvider(connection, wallet, {
          commitment: "confirmed",
          preflightCommitment: "confirmed",
        })
      : { connection },
  );
}
export function addresses(sponsor: PublicKey, id: bigint) {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(id);
  const [grant] = PublicKey.findProgramAddressSync(
    [Buffer.from("grant"), sponsor.toBuffer(), bytes],
    programId,
  );
  const [vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), grant.toBuffer()],
    programId,
  );
  return { grant, vault };
}
export const ata = (owner: PublicKey, tokenMint = mint) =>
  getAssociatedTokenAddressSync(tokenMint, owner);
export function receiptHash(grant: unknown): string {
  return Buffer.from((grant as { receiptHash: number[] }).receiptHash).toString(
    "hex",
  );
}
export async function chainTime() {
  // Clock sysvar offset: slot(8), epoch_start_timestamp(8), epoch(8), leader_schedule_epoch(8), unix_timestamp(8).
  const info = await connection.getAccountInfo(
    new PublicKey("SysvarC1ock11111111111111111111111111111111"),
  );
  if (!info || info.data.length < 40)
    throw new Error("Cannot read Solana Clock.");
  return Number(info.data.readBigInt64LE(32));
}
export async function tokenBalance(owner: PublicKey): Promise<string> {
  const info = await connection.getAccountInfo(ata(owner));
  if (!info) return "0";
  return (await getAccount(connection, ata(owner))).amount.toString();
}
export async function grantAccount(address: string) {
  // Dynamic IDL loaded at runtime, then decoded by Anchor's generated coder.
  return (program().account as any).grant.fetch(new PublicKey(address));
}
export async function allGrants(): Promise<
  Array<{ publicKey: PublicKey; account: any }>
> {
  return (program().account as any).grant.all();
}
export async function fundTransaction(
  sponsor: PublicKey,
  student: PublicKey,
  reviewer: PublicKey,
  id: bigint,
  amount: bigint,
  claimDeadline: number,
  reviewDeadline: number,
  eventCommitment: Uint8Array,
) {
  const { grant, vault } = addresses(sponsor, id);
  const ix = await program()
    .methods.createAndFund(
      new BN(id.toString()),
      new BN(amount.toString()),
      new BN(claimDeadline),
      new BN(reviewDeadline),
      [...eventCommitment],
    )
    .accountsStrict({
      sponsor,
      student,
      reviewer,
      mint,
      grant,
      vault,
      sponsorToken: ata(sponsor),
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  return new Transaction().add(ix);
}
export async function claimTransaction(
  student: PublicKey,
  address: string,
  amount: bigint,
  evidence: Uint8Array,
) {
  return new Transaction().add(
    await program()
      .methods.submitClaim(new BN(amount.toString()), [...evidence])
      .accountsStrict({ student, grant: new PublicKey(address) })
      .instruction(),
  );
}
export async function settlementTransaction(
  reviewer: PublicKey,
  address: string,
  approved: bigint,
  overrides: Record<string, PublicKey> = {},
) {
  const g = await grantAccount(address);
  const grant = new PublicKey(address);
  const vault = addresses(g.sponsor, BigInt(g.grantId.toString())).vault;
  const accounts = {
    reviewer,
    grant,
    sponsor: g.sponsor,
    student: g.student,
    mint: g.mint,
    vault,
    studentToken: ata(g.student, g.mint),
    sponsorToken: ata(g.sponsor, g.mint),
    tokenProgram: TOKEN_PROGRAM_ID,
    ...overrides,
  };
  const tx = new Transaction();
  if (!overrides.studentToken)
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        reviewer,
        accounts.studentToken,
        g.student,
        g.mint,
      ),
    );
  if (!overrides.sponsorToken)
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        reviewer,
        accounts.sponsorToken,
        g.sponsor,
        g.mint,
      ),
    );
  return tx.add(
    await program()
      .methods.settle(new BN(approved.toString()))
      .accountsStrict(accounts)
      .instruction(),
  );
}
export async function refundTransaction(
  caller: PublicKey,
  address: string,
  overrides: Record<string, PublicKey> = {},
) {
  const g = await grantAccount(address);
  const grant = new PublicKey(address);
  const vault = addresses(g.sponsor, BigInt(g.grantId.toString())).vault;
  const accounts = {
    caller,
    grant,
    sponsor: g.sponsor,
    mint: g.mint,
    vault,
    sponsorToken: ata(g.sponsor, g.mint),
    tokenProgram: TOKEN_PROGRAM_ID,
    ...overrides,
  };
  const tx = new Transaction();
  if (!overrides.sponsorToken)
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        caller,
        accounts.sponsorToken,
        g.sponsor,
        g.mint,
      ),
    );
  return tx.add(
    await program()
      .methods.expireAndRefund()
      .accountsStrict(accounts)
      .instruction(),
  );
}
export async function prepare(tx: Transaction, payer: PublicKey) {
  const latest = await connection.getLatestBlockhash("confirmed");
  tx.feePayer = payer;
  tx.recentBlockhash = latest.blockhash;
  return { tx, latest };
}
export async function send(tx: Transaction, payer: Keypair): Promise<string> {
  const prepared = await prepare(tx, payer.publicKey);
  tx.sign(payer);
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });
  const result = await connection.confirmTransaction(
    { signature, ...prepared.latest },
    "confirmed",
  );
  if (result.value.err)
    throw new Error(`Transaction failed: ${JSON.stringify(result.value.err)}`);
  return signature;
}
export function baseView(
  publicKey: PublicKey,
  g: any,
  vaultBalance: string,
): Omit<
  GrantView,
  "eventName" | "studentName" | "destination" | "purpose" | "receiptAvailable"
> {
  return {
    address: publicKey.toBase58(),
    grantId: g.grantId.toString(),
    sponsor: g.sponsor.toBase58(),
    student: g.student.toBase58(),
    reviewer: g.reviewer.toBase58(),
    mint: g.mint.toBase58(),
    cap: g.cap.toString(),
    claimed: g.claimed.toString(),
    approved: g.approved.toString(),
    refunded: g.refunded.toString(),
    vaultBalance,
    claimDeadline: g.claimDeadline.toNumber(),
    reviewDeadline: g.reviewDeadline.toNumber(),
    createdAt: g.createdAt.toNumber(),
    submittedAt: g.submittedAt.toNumber(),
    settledAt: g.settledAt.toNumber(),
    receiptHash: receiptHash(g),
    status: Object.keys(g.status)[0] as GrantView["status"],
  };
}
