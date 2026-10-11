import { randomBytes, randomUUID } from "node:crypto";
import { bootstrapLocal } from "./local-fixtures.js";
import {
  addresses,
  allGrants,
  chainTime,
  claimTransaction,
  fundTransaction,
  hash,
  send,
  settlementTransaction,
} from "../server/chain.js";
import { db, metadata, saveActivity, saveMetadata } from "../server/db.js";
import { sampleReceipt } from "../server/sample.js";
import type { FundInput } from "../shared/types.js";

const { sponsor, student, reviewer } = await bootstrapLocal();
const existing = await allGrants();
if (
  existing.some(
    (g) =>
      g.account.sponsor.equals(sponsor.publicKey) &&
      metadata(g.publicKey.toBase58()),
  )
) {
  console.log(
    "Demo grants already exist. Your current progress has been preserved.",
  );
  process.exit(0);
}
const now = await chainTime();
for (const scenario of [
  {
    name: "Student Builders Summit",
    cap: 100n,
    claim: 0n,
    approved: null,
    destination: "Ankara → Istanbul",
    purpose: "Intercity travel to a student builder event",
    studentName: "Ada Y.",
  },
  {
    name: "Open Source Weekend",
    cap: 150n,
    claim: 108n,
    approved: null,
    destination: "Ankara → Izmir",
    purpose: "Train ticket and local transport",
    studentName: "Ada Y.",
  },
  {
    name: "Campus Demo Day",
    cap: 80n,
    claim: 60n,
    approved: 60n,
    destination: "Ankara → Eskisehir",
    purpose: "Present a student project at demo day",
    studentName: "Ada Y.",
  },
]) {
  const id = randomBytes(8).readBigUInt64LE();
  const address = addresses(sponsor.publicKey, id).grant.toBase58();
  const input: FundInput = {
    eventName: scenario.name,
    studentName: scenario.studentName,
    destination: scenario.destination,
    purpose: scenario.purpose,
    amount: scenario.cap.toString(),
    student: student.publicKey.toBase58(),
    reviewer: reviewer.publicKey.toBase58(),
    claimDeadline: now + 7 * 86400,
    reviewDeadline: now + 10 * 86400,
  };
  const cap = scenario.cap * 1_000_000n;
  let signature = await send(
    await fundTransaction(
      sponsor.publicKey,
      student.publicKey,
      reviewer.publicKey,
      id,
      cap,
      input.claimDeadline,
      input.reviewDeadline,
      hash(input.eventName),
    ),
    sponsor,
  );
  saveMetadata(address, input);
  saveActivity({
    signature,
    grant: address,
    kind: "fund",
    actor: sponsor.publicKey.toBase58(),
    createdAt: await chainTime(),
    amount: cap.toString(),
    description: "Travel budget reserved for Ada Y.",
  });
  if (scenario.claim > 0n) {
    const content = sampleReceipt(`${scenario.claim}.00`);
    const commitment = hash(content).toString("hex");
    db.prepare("INSERT INTO receipts VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
      randomUUID(),
      address,
      student.publicKey.toBase58(),
      commitment,
      "synthetic-travel-receipt.pdf",
      "application/pdf",
      content,
      now,
    );
    const amount = scenario.claim * 1_000_000n;
    signature = await send(
      await claimTransaction(student.publicKey, address, amount, hash(content)),
      student,
    );
    saveActivity({
      signature,
      grant: address,
      kind: "claim",
      actor: student.publicKey.toBase58(),
      createdAt: await chainTime(),
      amount: amount.toString(),
      description: "Travel expense submitted for review",
    });
  }
  if (scenario.approved !== null) {
    const approved = scenario.approved * 1_000_000n;
    signature = await send(
      await settlementTransaction(reviewer.publicKey, address, approved),
      reviewer,
    );
    saveActivity({
      signature,
      grant: address,
      kind: "settle",
      actor: reviewer.publicKey.toBase58(),
      createdAt: await chainTime(),
      amount: approved.toString(),
      description: "Student paid · unused budget returned",
    });
  }
  console.log("Created real localnet grant:", scenario.name, address);
}
console.log(
  "Demo ready: sponsor, student and reviewer wallets use disposable test funds.",
);
