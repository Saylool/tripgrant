import { LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { connection, demo, network, mint, keypair } from "../server/config.js";
import { ata } from "../server/chain.js";

export async function airdrop(wallet: Keypair, amount = 5) {
  const signature = await connection.requestAirdrop(
    wallet.publicKey,
    amount * LAMPORTS_PER_SOL,
  );
  const latest = await connection.getLatestBlockhash();
  const result = await connection.confirmTransaction(
    { signature, ...latest },
    "confirmed",
  );
  if (result.value.err) throw new Error("Local SOL faucet failed.");
}
export async function bootstrapLocal() {
  if (!demo || network !== "localnet")
    throw new Error("Disposable fixtures require localnet demo mode.");
  const sponsor = keypair("sponsor");
  const student = keypair("student");
  const reviewer = keypair("reviewer");
  for (const role of [sponsor, student, reviewer]) {
    if ((await connection.getBalance(role.publicKey)) < LAMPORTS_PER_SOL)
      await airdrop(role, role === sponsor ? 100 : 5);
  }
  if (!(await connection.getAccountInfo(mint)))
    await createMint(
      connection,
      sponsor,
      sponsor.publicKey,
      null,
      6,
      keypair("mint"),
    );
  for (const role of [sponsor, student, reviewer])
    await getOrCreateAssociatedTokenAccount(
      connection,
      sponsor,
      mint,
      role.publicKey,
    );
  const balance = (await getAccount(connection, ata(sponsor.publicKey))).amount;
  if (balance < 1_000_000_000n)
    await mintTo(
      connection,
      sponsor,
      mint,
      ata(sponsor.publicKey),
      sponsor,
      1_000_000_000n - balance,
    );
  return { sponsor, student, reviewer };
}
