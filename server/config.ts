import { existsSync, readFileSync } from "node:fs";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import type { Role } from "../shared/types.js";

if (existsSync(".env")) process.loadEnvFile(".env");
const deployment = JSON.parse(readFileSync("shared/deployment.json", "utf8"));
export const network = (process.env.SOLANA_NETWORK || "localnet") as
  "localnet" | "devnet";
if (!["localnet", "devnet"].includes(network))
  throw new Error("Only localnet and devnet are supported.");
export const endpoint =
  process.env.SOLANA_RPC_URL ||
  (network === "localnet"
    ? "http://127.0.0.1:8899"
    : "https://api.devnet.solana.com");
export const connection = new Connection(endpoint, "confirmed");
export const programId = new PublicKey(
  process.env.PROGRAM_ID || deployment.programId,
);
export const mint = new PublicKey(
  process.env.TOKEN_MINT ||
    (network === "localnet"
      ? deployment.localMint
      : "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
);
export const demo = process.env.DEMO_MODE !== "false" && network === "localnet";
if (
  demo &&
  !["127.0.0.1", "localhost", "[::1]"].includes(new URL(endpoint).hostname)
)
  throw new Error("Demo signing is limited to a loopback local validator.");
export const port = Number(process.env.PORT || 5173);
export const host = process.env.HOST || "127.0.0.1";
export const publicOrigin = process.env.PUBLIC_ORIGIN
  ? new URL(process.env.PUBLIC_ORIGIN).origin
  : "";
if (demo && !["127.0.0.1", "localhost", "::1"].includes(host))
  throw new Error(
    "Disposable demo wallets must never be exposed outside localhost.",
  );
if (!["127.0.0.1", "localhost", "::1"].includes(host) && !publicOrigin)
  throw new Error(
    "Set PUBLIC_ORIGIN before exposing wallet mode outside localhost.",
  );
if (
  publicOrigin &&
  new URL(publicOrigin).protocol !== "https:" &&
  !["127.0.0.1", "localhost", "[::1]"].includes(new URL(publicOrigin).hostname)
)
  throw new Error("Public wallet mode requires HTTPS.");
export const walletAddresses: Record<Role, string> = deployment.wallets;
export function keypair(role: Role | "mint"): Keypair {
  if (!demo)
    throw new Error("Server-side demo signing is disabled on this network.");
  return Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(readFileSync(`.local/keys/${role}.json`, "utf8")),
    ),
  );
}
