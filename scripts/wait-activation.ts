import { Connection, PublicKey } from "@solana/web3.js";
export async function waitForProgramActivation(
  connection: Connection,
  programId: PublicKey,
) {
  const program = await connection.getAccountInfo(programId, "confirmed");
  if (!program?.executable || program.data.length < 36)
    throw new Error("Program deployment is not visible yet.");
  const data = await connection.getAccountInfo(
    new PublicKey(program.data.subarray(4, 36)),
    "confirmed",
  );
  if (!data || data.data.length < 12)
    throw new Error("Program data is unavailable.");
  // Upgradeable programs become callable after the deployment bank, not inside it.
  const deploymentSlot = Number(data.data.readBigUInt64LE(4));
  const deadline = Date.now() + 30_000;
  while ((await connection.getSlot("confirmed")) < deploymentSlot + 2) {
    if (Date.now() > deadline)
      throw new Error("Program activation did not become visible in time.");
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
