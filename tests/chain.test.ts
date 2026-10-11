import { before, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createTransferInstruction,
  freezeAccount,
  thawAccount,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { BN } from "@anchor-lang/core";
import { airdrop, bootstrapLocal } from "../scripts/local-fixtures.js";
import { connection, keypair, mint, programId } from "../server/config.js";
import {
  addresses,
  ata,
  chainTime,
  claimTransaction,
  fundTransaction,
  grantAccount,
  hash,
  program,
  refundTransaction,
  send,
  settlementTransaction,
} from "../server/chain.js";

const sponsor = Keypair.generate();
const student = Keypair.generate();
const reviewer = Keypair.generate();
const attacker = Keypair.generate();
const SCALE = 1_000_000n;
let counter = 1;
const unique = (tx: Transaction) => {
  tx.instructions.unshift(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: counter++ }),
  );
  return tx;
};
const execute = (tx: Transaction, payer: Keypair) => send(unique(tx), payer);
const balance = async (owner: PublicKey, tokenMint = mint) =>
  (await getAccount(connection, ata(owner, tokenMint))).amount;
const state = (g: any) => Object.keys(g.status)[0];
async function create(
  cap = 100n * SCALE,
  window?: { claim: number; review: number },
  id = randomBytes(8).readBigUInt64LE(),
) {
  const now = await chainTime();
  const claim = window?.claim ?? now + 86400;
  const review = window?.review ?? now + 2 * 86400;
  const address = addresses(sponsor.publicKey, id).grant.toBase58();
  await execute(
    await fundTransaction(
      sponsor.publicKey,
      student.publicKey,
      reviewer.publicKey,
      id,
      cap,
      claim,
      review,
      hash("Synthetic integration test"),
    ),
    sponsor,
  );
  return {
    address,
    id,
    cap,
    claim,
    review,
    vault: addresses(sponsor.publicKey, id).vault,
  };
}
async function submitted(cap = 100n * SCALE, claimed = 72n * SCALE) {
  const grant = await create(cap);
  await execute(
    await claimTransaction(
      student.publicKey,
      grant.address,
      claimed,
      hash("Synthetic receipt"),
    ),
    student,
  );
  return grant;
}
async function rejectWithoutChange(
  address: string,
  action: () => Promise<unknown>,
  expected?: RegExp,
) {
  const before = await grantAccount(address);
  const sponsorBefore = await balance(sponsor.publicKey);
  const studentBefore = await balance(student.publicKey);
  if (expected) await assert.rejects(action, expected);
  else await assert.rejects(action);
  const after = await grantAccount(address);
  assert.equal(state(after), state(before));
  assert.equal(after.approved.toString(), before.approved.toString());
  assert.equal(await balance(sponsor.publicKey), sponsorBefore);
  assert.equal(await balance(student.publicKey), studentBefore);
}
async function waitForClock(deadline: number) {
  const timeout = Date.now() + 45_000;
  while ((await chainTime()) < deadline) {
    if (Date.now() > timeout)
      throw new Error("Local validator Clock did not advance.");
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

before(async () => {
  await bootstrapLocal();
  const info = await connection.getAccountInfo(programId);
  assert.ok(
    info?.executable,
    "Deploy the local-test-mint build before running chain tests.",
  );
  for (const wallet of [sponsor, student, reviewer, attacker]) {
    await airdrop(wallet);
    await getOrCreateAssociatedTokenAccount(
      connection,
      keypair("sponsor"),
      mint,
      wallet.publicKey,
    );
  }
  await mintTo(
    connection,
    keypair("sponsor"),
    mint,
    ata(sponsor.publicKey),
    keypair("sponsor"),
    10000n * SCALE,
  );
});

test("funding reserves exactly the cap in a program-owned vault", async () => {
  const before = await balance(sponsor.publicKey);
  const g = await create();
  assert.equal(await balance(sponsor.publicKey), before - g.cap);
  assert.equal((await getAccount(connection, g.vault)).amount, g.cap);
  assert.equal(state(await grantAccount(g.address)), "funded");
});
test("100 reserved → 72 paid + 28 returned; vault rent returns to sponsor", async () => {
  const g = await submitted();
  const sponsorBefore = await balance(sponsor.publicKey);
  const studentBefore = await balance(student.publicKey);
  const vaultRent = (await connection.getAccountInfo(g.vault))!.lamports;
  const sponsorSolBefore = await connection.getBalance(sponsor.publicKey);
  await execute(
    await settlementTransaction(reviewer.publicKey, g.address, 72n * SCALE),
    reviewer,
  );
  const stored = await grantAccount(g.address);
  assert.equal(state(stored), "paid");
  assert.equal(stored.approved.toString(), "72000000");
  assert.equal(stored.refunded.toString(), "28000000");
  assert.equal(await balance(student.publicKey), studentBefore + 72n * SCALE);
  assert.equal(await balance(sponsor.publicKey), sponsorBefore + 28n * SCALE);
  assert.equal(await connection.getAccountInfo(g.vault), null);
  assert.equal(
    await connection.getBalance(sponsor.publicKey),
    sponsorSolBefore + vaultRent,
  );
});
test("only the fixed student can submit a claim", async () => {
  const g = await create();
  await rejectWithoutChange(
    g.address,
    async () =>
      execute(
        await claimTransaction(
          attacker.publicKey,
          g.address,
          SCALE,
          hash("receipt"),
        ),
        attacker,
      ),
    /Unauthorized/,
  );
});
test("only the fixed reviewer can settle", async () => {
  const g = await submitted();
  await rejectWithoutChange(
    g.address,
    async () =>
      execute(
        await settlementTransaction(attacker.publicKey, g.address, SCALE),
        attacker,
      ),
    /Unauthorized/,
  );
});
test("approval cannot exceed either the cap or the submitted claim", async () => {
  const g = await submitted();
  for (const amount of [101n * SCALE, 73n * SCALE])
    await rejectWithoutChange(
      g.address,
      async () =>
        execute(
          await settlementTransaction(reviewer.publicKey, g.address, amount),
          reviewer,
        ),
      /ApprovalExceedsLimit/,
    );
});
test("a direct on-chain claim above the cap still cannot increase payout", async () => {
  const g = await submitted(100n * SCALE, 200n * SCALE);
  await rejectWithoutChange(
    g.address,
    async () =>
      execute(
        await settlementTransaction(
          reviewer.publicKey,
          g.address,
          101n * SCALE,
        ),
        reviewer,
      ),
    /ApprovalExceedsLimit/,
  );
  await execute(
    await settlementTransaction(reviewer.publicKey, g.address, 100n * SCALE),
    reviewer,
  );
  assert.equal(
    (await grantAccount(g.address)).approved.toString(),
    "100000000",
  );
});
test("substituted student and refund destinations are rejected", async () => {
  const g = await submitted();
  for (const field of ["studentToken", "sponsorToken"])
    await rejectWithoutChange(g.address, async () =>
      execute(
        await settlementTransaction(
          reviewer.publicKey,
          g.address,
          72n * SCALE,
          { [field]: ata(attacker.publicKey) },
        ),
        reviewer,
      ),
    );
  await rejectWithoutChange(g.address, async () =>
    execute(
      await settlementTransaction(reviewer.publicKey, g.address, 72n * SCALE, {
        sponsor: attacker.publicKey,
      }),
      reviewer,
    ),
  );
});
test("wrong mint, account owner, token program and vault PDA are rejected", async () => {
  const g = await submitted();
  const otherMint = await createMint(
    connection,
    keypair("sponsor"),
    keypair("sponsor").publicKey,
    null,
    6,
  );
  const substitutions: Record<string, PublicKey>[] = [
    { mint: otherMint },
    { studentToken: student.publicKey },
    { tokenProgram: SystemProgram.programId },
    { vault: ata(sponsor.publicKey) },
  ];
  for (const overrides of substitutions)
    await rejectWithoutChange(g.address, async () =>
      execute(
        await settlementTransaction(
          reviewer.publicKey,
          g.address,
          72n * SCALE,
          overrides,
        ),
        reviewer,
      ),
    );
});
test("duplicate claims and settling before a claim are rejected", async () => {
  const g = await create();
  await rejectWithoutChange(
    g.address,
    async () =>
      execute(
        await settlementTransaction(reviewer.publicKey, g.address, 0n),
        reviewer,
      ),
    /InvalidState/,
  );
  await execute(
    await claimTransaction(
      student.publicKey,
      g.address,
      72n * SCALE,
      hash("receipt"),
    ),
    student,
  );
  await rejectWithoutChange(
    g.address,
    async () =>
      execute(
        await claimTransaction(
          student.publicKey,
          g.address,
          1n,
          hash("second receipt"),
        ),
        student,
      ),
    /InvalidState/,
  );
});
test("zero claims and empty evidence commitments are rejected", async () => {
  const g = await create();
  await rejectWithoutChange(
    g.address,
    async () =>
      execute(
        await claimTransaction(
          student.publicKey,
          g.address,
          0n,
          hash("receipt"),
        ),
        student,
      ),
    /InvalidAmount/,
  );
  await rejectWithoutChange(
    g.address,
    async () =>
      execute(
        await claimTransaction(
          student.publicKey,
          g.address,
          1n,
          Buffer.alloc(32),
        ),
        student,
      ),
    /MissingEvidence/,
  );
});
test("a zero approval returns the full cap and ends in Rejected", async () => {
  const g = await submitted();
  const before = await balance(sponsor.publicKey);
  const studentBefore = await balance(student.publicKey);
  await execute(
    await settlementTransaction(reviewer.publicKey, g.address, 0n),
    reviewer,
  );
  const stored = await grantAccount(g.address);
  assert.equal(state(stored), "rejected");
  assert.equal(stored.refunded.toString(), g.cap.toString());
  assert.equal(await balance(sponsor.publicKey), before + g.cap);
  assert.equal(await balance(student.publicKey), studentBefore);
});
test("a terminal grant cannot pay twice or be recreated with the same ID", async () => {
  const g = await submitted();
  await execute(
    await settlementTransaction(reviewer.publicKey, g.address, 72n * SCALE),
    reviewer,
  );
  await rejectWithoutChange(g.address, async () =>
    execute(
      await settlementTransaction(reviewer.publicKey, g.address, 72n * SCALE),
      reviewer,
    ),
  );
  await assert.rejects(() => create(g.cap, undefined, g.id));
  assert.equal(state(await grantAccount(g.address)), "paid");
});
test("two racing settlements pay only once", async () => {
  const g = await submitted();
  const studentBefore = await balance(student.publicKey);
  const txs = await Promise.all([
    settlementTransaction(reviewer.publicKey, g.address, 72n * SCALE),
    settlementTransaction(reviewer.publicKey, g.address, 72n * SCALE),
  ]);
  const results = await Promise.allSettled(
    txs.map((tx) => execute(tx, reviewer)),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(await balance(student.publicKey), studentBefore + 72n * SCALE);
  assert.equal(state(await grantAccount(g.address)), "paid");
});
test("same-mint donations do not enlarge approval; surplus returns to sponsor", async () => {
  const g = await submitted();
  const before = await balance(sponsor.publicKey);
  await execute(
    new Transaction().add(
      createTransferInstruction(
        ata(sponsor.publicKey),
        g.vault,
        sponsor.publicKey,
        5n * SCALE,
      ),
    ),
    sponsor,
  );
  await rejectWithoutChange(
    g.address,
    async () =>
      execute(
        await settlementTransaction(reviewer.publicKey, g.address, 73n * SCALE),
        reviewer,
      ),
    /ApprovalExceedsLimit/,
  );
  await execute(
    await settlementTransaction(reviewer.publicKey, g.address, 72n * SCALE),
    reviewer,
  );
  assert.equal((await grantAccount(g.address)).refunded.toString(), "33000000");
  assert.equal(
    await balance(sponsor.publicKey),
    before - 5n * SCALE + 33n * SCALE,
  );
});
test("funding rejects zero cap, identical roles, unordered and past deadlines", async () => {
  const now = await chainTime();
  await assert.rejects(() => create(0n), /InvalidAmount/);
  await assert.rejects(
    () => create(SCALE, { claim: now - 1, review: now + 100 }),
    /InvalidDeadlines/,
  );
  await assert.rejects(
    () => create(SCALE, { claim: now + 100, review: now + 50 }),
    /InvalidDeadlines/,
  );
  await assert.rejects(
    async () =>
      execute(
        await fundTransaction(
          sponsor.publicKey,
          sponsor.publicKey,
          reviewer.publicKey,
          randomBytes(8).readBigUInt64LE(),
          SCALE,
          now + 1000,
          now + 2000,
          hash("test"),
        ),
        sponsor,
      ),
    /DistinctRolesRequired/,
  );
});
test("failed second token transfer rolls back the first transfer and grant state", async () => {
  const issuer = keypair("sponsor");
  const frozenMint = await createMint(
    connection,
    issuer,
    issuer.publicKey,
    issuer.publicKey,
    6,
  );
  const sponsorToken = (
    await getOrCreateAssociatedTokenAccount(
      connection,
      issuer,
      frozenMint,
      sponsor.publicKey,
    )
  ).address;
  await getOrCreateAssociatedTokenAccount(
    connection,
    issuer,
    frozenMint,
    student.publicKey,
  );
  await mintTo(
    connection,
    issuer,
    frozenMint,
    sponsorToken,
    issuer,
    100n * SCALE,
  );
  const id = randomBytes(8).readBigUInt64LE();
  const { grant, vault } = addresses(sponsor.publicKey, id);
  const now = await chainTime();
  await execute(
    new Transaction().add(
      await program()
        .methods.createAndFund(
          new BN(id.toString()),
          new BN("100000000"),
          new BN(now + 1000),
          new BN(now + 2000),
          [...hash("rollback test")],
        )
        .accountsStrict({
          sponsor: sponsor.publicKey,
          student: student.publicKey,
          reviewer: reviewer.publicKey,
          mint: frozenMint,
          grant,
          vault,
          sponsorToken,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction(),
    ),
    sponsor,
  );
  await execute(
    await claimTransaction(
      student.publicKey,
      grant.toBase58(),
      72n * SCALE,
      hash("receipt"),
    ),
    student,
  );
  await freezeAccount(connection, issuer, sponsorToken, frozenMint, issuer);
  const tx = await settlementTransaction(
    reviewer.publicKey,
    grant.toBase58(),
    72n * SCALE,
  );
  await assert.rejects(() => execute(tx, reviewer));
  assert.equal(await balance(student.publicKey, frozenMint), 0n);
  assert.equal((await getAccount(connection, vault)).amount, 100n * SCALE);
  assert.equal(state(await grantAccount(grant.toBase58())), "submitted");
  await thawAccount(connection, issuer, sponsorToken, frozenMint, issuer);
  await execute(
    await settlementTransaction(
      reviewer.publicKey,
      grant.toBase58(),
      72n * SCALE,
    ),
    reviewer,
  );
  assert.equal(await balance(student.publicKey, frozenMint), 72n * SCALE);
});
test("claim and review deadline boundaries; refund becomes permissionless at expiry", async () => {
  const now = await chainTime();
  const g = await create(100n * SCALE, { claim: now + 7, review: now + 12 });
  const h = await create(100n * SCALE, { claim: now + 7, review: now + 12 });
  await execute(
    await claimTransaction(
      student.publicKey,
      h.address,
      72n * SCALE,
      hash("receipt"),
    ),
    student,
  );
  await rejectWithoutChange(
    g.address,
    async () =>
      execute(await refundTransaction(attacker.publicKey, g.address), attacker),
    /RefundTooEarly/,
  );
  await waitForClock(g.claim);
  await rejectWithoutChange(
    g.address,
    async () =>
      execute(
        await claimTransaction(
          student.publicKey,
          g.address,
          SCALE,
          hash("late"),
        ),
        student,
      ),
    /ClaimWindowClosed/,
  );
  await waitForClock(g.review);
  await rejectWithoutChange(
    h.address,
    async () =>
      execute(
        await settlementTransaction(reviewer.publicKey, h.address, 72n * SCALE),
        reviewer,
      ),
    /ReviewWindowClosed/,
  );
  await rejectWithoutChange(g.address, async () =>
    execute(
      await refundTransaction(attacker.publicKey, g.address, {
        sponsorToken: ata(attacker.publicKey),
      }),
      attacker,
    ),
  );
  const before = await balance(sponsor.publicKey);
  // Racing permissionless expiry and a late review: only the expiry can succeed.
  const results = await Promise.allSettled([
    execute(await refundTransaction(attacker.publicKey, h.address), attacker),
    execute(
      await settlementTransaction(reviewer.publicKey, h.address, 72n * SCALE),
      reviewer,
    ),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  await execute(
    await refundTransaction(attacker.publicKey, g.address),
    attacker,
  );
  assert.equal(await balance(sponsor.publicKey), before + g.cap + h.cap);
  assert.equal(state(await grantAccount(g.address)), "expired");
  assert.equal(state(await grantAccount(h.address)), "expired");
});
