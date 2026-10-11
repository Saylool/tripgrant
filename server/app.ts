import express, { type Request } from "express";
import multer from "multer";
import { randomBytes, randomUUID } from "node:crypto";
import { PublicKey, Transaction } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";
import {
  connection,
  demo,
  endpoint,
  keypair,
  mint,
  network,
  programId,
  publicOrigin,
  walletAddresses,
} from "./config.js";
import {
  addresses,
  allGrants,
  baseView,
  chainTime,
  claimTransaction,
  fundTransaction,
  grantAccount,
  hash,
  prepare,
  receiptHash,
  refundTransaction,
  send,
  settlementTransaction,
  tokenBalance,
} from "./chain.js";
import {
  activities,
  db,
  metadata,
  receiptByCommitment,
  receiptById,
  saveActivity,
  saveMetadata,
} from "./db.js";
import {
  actor,
  authorizeReceipt,
  demoRole,
  HttpError,
  issueChallenge,
  rateLimit,
  sameOrigin,
  validateReceipt,
  verifyChallenge,
} from "./security.js";
import { amountSchema, fundSchema, validate } from "./validation.js";
import { parseAmount } from "../shared/amounts.js";
import type {
  Activity,
  AppConfig,
  FundInput,
  Snapshot,
} from "../shared/types.js";
import { sampleReceipt } from "./sample.js";

interface Pending {
  actor: string;
  grant: string;
  kind: Activity["kind"];
  amount: string;
  message: Buffer;
  expires: number;
  input?: FundInput;
  description: string;
}
const pending = new Map<string, Pending>();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1 },
});
const addressParam = (req: Request) => {
  try {
    return new PublicKey(String(req.params.address)).toBase58();
  } catch {
    throw new HttpError(400, "Invalid grant address.");
  }
};

export async function snapshot(viewer: string): Promise<Snapshot> {
  const [records, now, slot] = await Promise.all([
    allGrants(),
    chainTime(),
    connection.getSlot("confirmed"),
  ]);
  const relevant = records.filter(
    ({ account: g }) =>
      g.mint.equals(mint) &&
      [g.sponsor, g.student, g.reviewer].some(
        (p: PublicKey) => p.toBase58() === viewer,
      ),
  );
  const grants = await Promise.all(
    relevant.map(async ({ publicKey, account: g }) => {
      const data = metadata(publicKey.toBase58());
      let vaultBalance = "0";
      if (
        Object.keys(g.status)[0] === "funded" ||
        Object.keys(g.status)[0] === "submitted"
      ) {
        const vault = addresses(g.sponsor, BigInt(g.grantId.toString())).vault;
        vaultBalance = (await getAccount(connection, vault)).amount.toString();
      }
      return {
        ...baseView(publicKey, g, vaultBalance),
        eventName: data?.event_name || "Travel grant",
        studentName: data?.student_name || "Student",
        destination: data?.destination || "Event travel",
        purpose: data?.purpose || "Travel support",
        receiptAvailable: !!receiptByCommitment(
          publicKey.toBase58(),
          receiptHash(g),
        ),
      };
    }),
  );
  grants.sort(
    (a, b) => b.createdAt - a.createdAt || b.grantId.localeCompare(a.grantId),
  );
  const balances = { sponsor: "0", student: "0", reviewer: "0" };
  if (demo) {
    const values = await Promise.all(
      Object.values(walletAddresses).map((a) => tokenBalance(new PublicKey(a))),
    );
    [balances.sponsor, balances.student, balances.reviewer] = values;
  } else {
    const balance = await tokenBalance(new PublicKey(viewer));
    balances.sponsor = balances.student = balances.reviewer = balance;
  }
  return {
    grants,
    activities: activities(grants.map((g) => g.address)),
    balances,
    chainTime: now,
    slot,
  };
}

async function completeAction(p: Pending, signature: string) {
  if (p.input) saveMetadata(p.grant, p.input);
  saveActivity({
    signature,
    grant: p.grant,
    kind: p.kind,
    actor: p.actor,
    createdAt: await chainTime(),
    amount: p.amount,
    description: p.description,
  });
}

async function action(
  req: Request,
  tx: Transaction,
  details: Omit<Pending, "actor" | "message" | "expires">,
) {
  const who = actor(req);
  if (demo) {
    const signature = await send(tx, keypair(demoRole(req)));
    await completeAction(
      { ...details, actor: who, expires: 0, message: Buffer.alloc(0) },
      signature,
    );
    return { signature, grant: details.grant, confirmed: true };
  }
  for (const [id, p] of pending) if (p.expires < Date.now()) pending.delete(id);
  if (pending.size > 500)
    throw new HttpError(429, "Too many pending transactions.");
  const { latest } = await prepare(tx, new PublicKey(who));
  const id = randomUUID();
  pending.set(id, {
    ...details,
    actor: who,
    message: Buffer.from(tx.serializeMessage()),
    expires: Date.now() + 120_000,
  });
  return {
    pendingId: id,
    grant: details.grant,
    transaction: tx
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString("base64"),
    blockhash: latest.blockhash,
    lastValidBlockHeight: latest.lastValidBlockHeight,
    confirmed: false,
  };
}

function storeReceipt(
  address: string,
  uploader: string,
  content: Uint8Array,
  name: string,
  mime: string,
) {
  validateReceipt(content, mime);
  // Preserve earlier uploads: a concurrently submitted commitment must not lose its original.
  const count = db
    .prepare("SELECT count(*) AS n FROM receipts WHERE grant_address = ?")
    .get(address) as { n: number };
  if (count.n >= 10)
    throw new HttpError(
      409,
      "This grant has reached its limit of 10 receipt uploads.",
    );
  const id = randomUUID();
  const commitment = hash(content).toString("hex");
  db.prepare("INSERT INTO receipts VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
    id,
    address,
    uploader,
    commitment,
    name.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 100) || "receipt",
    mime,
    Buffer.from(content),
    Math.floor(Date.now() / 1000),
  );
  return { id, hash: commitment, name, size: content.length, mime };
}

export function createApi() {
  const app = express();
  app.disable("x-powered-by");
  app.use("/api", sameOrigin, rateLimit, express.json({ limit: "32kb" }));
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    next();
  });

  app.get("/api/config", async (_req, res) => {
    let ready = false;
    let now = 0;
    try {
      const [info, token, time] = await Promise.all([
        connection.getAccountInfo(programId),
        connection.getAccountInfo(mint),
        chainTime(),
      ]);
      ready = !!info?.executable && !!token;
      now = time;
    } catch {
      /* Report unavailable instead of fabricating balances. */
    }
    const config: AppConfig = {
      programId: programId.toBase58(),
      mint: mint.toBase58(),
      network,
      endpoint,
      demo,
      wallets: walletAddresses,
      ready,
      chainTime: now,
      tokenLabel: demo ? "TEST" : "USDC",
      upgradeable: true,
    };
    res.json(config);
  });
  app.post("/api/auth/challenge", (req, res) =>
    res.json(
      issueChallenge(
        req.body.address,
        publicOrigin || `${req.protocol}://${req.get("host")}`,
      ),
    ),
  );
  app.post("/api/auth/verify", (req, res) =>
    res.json(verifyChallenge(req.body.nonce, req.body.signature)),
  );
  app.get("/api/snapshot", async (req, res) =>
    res.json(await snapshot(actor(req))),
  );

  app.post("/api/grants", async (req, res) => {
    const who = actor(req);
    const input = validate(fundSchema, req.body);
    const now = await chainTime();
    if (
      input.claimDeadline <= now ||
      input.reviewDeadline <= input.claimDeadline ||
      input.reviewDeadline > now + 90 * 86400
    )
      throw new HttpError(
        400,
        "Choose future deadlines, with review after the claim deadline, within 90 days.",
      );
    if (new Set([who, input.student, input.reviewer]).size !== 3)
      throw new HttpError(
        400,
        "Use three distinct wallets for the sponsor, student and reviewer.",
      );
    const id = randomBytes(8).readBigUInt64LE();
    const sponsor = new PublicKey(who);
    const grant = addresses(sponsor, id).grant.toBase58();
    const amount = parseAmount(input.amount);
    const tx = await fundTransaction(
      sponsor,
      new PublicKey(input.student),
      new PublicKey(input.reviewer),
      id,
      amount,
      input.claimDeadline,
      input.reviewDeadline,
      hash(input.eventName),
    );
    res.json(
      await action(req, tx, {
        grant,
        kind: "fund",
        amount: amount.toString(),
        input,
        description: `Travel budget reserved for ${input.studentName}`,
      }),
    );
  });

  app.post(
    "/api/grants/:address/receipts",
    upload.single("receipt"),
    async (req, res) => {
      const address = addressParam(req);
      const who = actor(req);
      const g = await grantAccount(address);
      if (g.student.toBase58() !== who)
        throw new HttpError(403, "Only this student may upload evidence.");
      if (
        Object.keys(g.status)[0] !== "funded" ||
        (await chainTime()) >= g.claimDeadline.toNumber()
      )
        throw new HttpError(409, "This grant no longer accepts evidence.");
      if (!req.file) throw new HttpError(400, "Choose a receipt to upload.");
      res.json(
        storeReceipt(
          address,
          who,
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
        ),
      );
    },
  );
  app.post("/api/grants/:address/sample-receipt", async (req, res) => {
    if (!demo)
      throw new HttpError(
        403,
        "Synthetic receipts are only available in the local demo.",
      );
    const address = addressParam(req);
    const who = actor(req);
    const g = await grantAccount(address);
    if (g.student.toBase58() !== who)
      throw new HttpError(403, "Only this student may upload evidence.");
    if (
      Object.keys(g.status)[0] !== "funded" ||
      (await chainTime()) >= g.claimDeadline.toNumber()
    )
      throw new HttpError(409, "This grant no longer accepts evidence.");
    res.json(
      storeReceipt(
        address,
        who,
        sampleReceipt(),
        "synthetic-travel-receipt.pdf",
        "application/pdf",
      ),
    );
  });
  app.get("/api/grants/:address/receipt", async (req, res) => {
    const address = addressParam(req);
    const who = actor(req);
    const g = await grantAccount(address);
    authorizeReceipt(who, g);
    const receipt = receiptByCommitment(address, receiptHash(g));
    if (!receipt)
      throw new HttpError(
        404,
        "No matching private receipt is available on this instance.",
      );
    if (hash(receipt.content).toString("hex") !== receipt.hash)
      throw new HttpError(409, "Receipt integrity check failed.");
    res
      .set("Content-Type", receipt.mime)
      .set("Content-Disposition", `attachment; filename="${receipt.name}"`)
      .send(Buffer.from(receipt.content));
  });
  app.post("/api/grants/:address/claim", async (req, res) => {
    const address = addressParam(req);
    const who = actor(req);
    const { amount } = validate(amountSchema, req.body);
    const g = await grantAccount(address);
    if (g.student.toBase58() !== who)
      throw new HttpError(
        403,
        "Only the designated student may submit this claim.",
      );
    if (typeof req.body.receiptId !== "string")
      throw new HttpError(400, "Upload a receipt for this grant first.");
    const receipt = receiptById(req.body.receiptId);
    if (
      !receipt ||
      receipt.grant_address !== address ||
      receipt.uploader !== who
    )
      throw new HttpError(400, "Upload a receipt for this grant first.");
    const units = parseAmount(amount);
    if (units > BigInt(g.cap.toString()))
      throw new HttpError(400, "The claim exceeds your reserved budget.");
    const tx = await claimTransaction(
      new PublicKey(who),
      address,
      units,
      Buffer.from(receipt.hash, "hex"),
    );
    res.json(
      await action(req, tx, {
        grant: address,
        kind: "claim",
        amount: units.toString(),
        description: "Travel expense submitted for review",
      }),
    );
  });
  app.post("/api/grants/:address/settle", async (req, res) => {
    const address = addressParam(req);
    const who = actor(req);
    const { amount } = validate(amountSchema, req.body);
    const g = await grantAccount(address);
    if (g.reviewer.toBase58() !== who)
      throw new HttpError(
        403,
        "Only the designated reviewer may decide this claim.",
      );
    const units = parseAmount(amount, true);
    if (
      units > BigInt(g.cap.toString()) ||
      units > BigInt(g.claimed.toString())
    )
      throw new HttpError(
        400,
        "Approval cannot exceed the claimed amount or the reserved budget.",
      );
    if (!receiptByCommitment(address, receiptHash(g)))
      throw new HttpError(
        409,
        "The committed receipt is unavailable. Review the original evidence before settling.",
      );
    const tx = await settlementTransaction(new PublicKey(who), address, units);
    res.json(
      await action(req, tx, {
        grant: address,
        kind: "settle",
        amount: units.toString(),
        description:
          units === 0n
            ? "Claim rejected · full budget returned"
            : "Student paid · unused budget returned",
      }),
    );
  });
  app.post("/api/grants/:address/refund", async (req, res) => {
    const address = addressParam(req);
    const who = actor(req);
    const g = await grantAccount(address);
    const tx = await refundTransaction(new PublicKey(who), address);
    res.json(
      await action(req, tx, {
        grant: address,
        kind: "refund",
        amount: g.cap.toString(),
        description: "Expired travel budget returned to sponsor",
      }),
    );
  });
  app.post("/api/transactions/confirm", async (req, res) => {
    const who = actor(req);
    const id = req.body.pendingId;
    const signature = req.body.signature;
    if (
      typeof id !== "string" ||
      typeof signature !== "string" ||
      !/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(signature)
    )
      throw new HttpError(400, "Invalid confirmation.");
    const p = pending.get(id);
    if (!p || p.actor !== who || p.expires < Date.now())
      throw new HttpError(
        409,
        "Transaction preparation expired. Refresh the grant state before retrying.",
      );
    const result = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (!result)
      throw new HttpError(
        409,
        "Transaction has not been confirmed yet. Try refreshing shortly.",
      );
    if (
      result.meta?.err ||
      !Buffer.from(result.transaction.message.serialize()).equals(p.message)
    )
      throw new HttpError(
        400,
        "The transaction does not match this prepared action.",
      );
    await completeAction(p, signature);
    pending.delete(id);
    res.json({ confirmed: true, signature, grant: p.grant });
  });
  app.get("/api/transactions/:signature", async (req, res) => {
    actor(req);
    const signature = String(req.params.signature);
    if (!/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(signature))
      throw new HttpError(400, "Invalid signature.");
    const tx = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (!tx)
      throw new HttpError(404, "Transaction is unavailable on this network.");
    res.json({
      signature,
      slot: tx.slot,
      blockTime: tx.blockTime,
      error: tx.meta?.err,
      feeLamports: tx.meta?.fee,
      logs: tx.meta?.logMessages,
    });
  });
  return app;
}

export function errorHandler(
  error: any,
  _req: Request,
  res: express.Response,
  _next: express.NextFunction,
) {
  const status =
    error instanceof HttpError
      ? error.status
      : error instanceof multer.MulterError || error instanceof SyntaxError
        ? 400
        : 500;
  const raw =
    typeof error.message === "string"
      ? error.message
      : "The request could not be completed.";
  const chain = raw.match(/Error Message: ([^\n.]+\.?)/)?.[1];
  const message =
    chain ||
    (status === 500
      ? "The action could not be confirmed. Refresh the grant state and check the local Solana connection before retrying."
      : raw);
  if (status === 500) console.error("[TripGrant]", raw.slice(0, 500));
  res.status(status).json({ error: message });
}
