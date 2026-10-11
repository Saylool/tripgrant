import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Connection, PublicKey } from "@solana/web3.js";

if (existsSync(".env")) process.loadEnvFile(".env");
if (process.env.SOLANA_NETWORK && process.env.SOLANA_NETWORK !== "localnet")
  throw new Error(
    "The guided demo requires localnet. Use npm start for wallet mode.",
  );
const children: ChildProcess[] = [];
function shutdown() {
  children.forEach((child) => child.kill("SIGTERM"));
}
process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});
async function run(command: string, args: string[]) {
  const child = spawn(command, args, { stdio: "inherit" });
  children.push(child);
  await new Promise<void>((resolve, reject) => {
    child.on("error", (error) => {
      shutdown();
      reject(error);
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else {
        shutdown();
        reject(new Error(`${command} ${args.join(" ")} failed (${code}).`));
      }
    });
  });
}
await run("bash", ["scripts/install-toolchain.sh"]);
await run("npm", ["run", "setup"]);
const source = createHash("sha256")
  .update(readFileSync("programs/tripgrant/src/lib.rs"))
  .digest("hex");
const build = existsSync("shared/build.json")
  ? JSON.parse(readFileSync("shared/build.json", "utf8"))
  : null;
const binaryHash = existsSync("target/deploy/tripgrant.so")
  ? createHash("sha256")
      .update(readFileSync("target/deploy/tripgrant.so"))
      .digest("hex")
  : null;
if (
  binaryHash !== build?.binarySha256 ||
  build?.network !== "localnet" ||
  build?.sourceSha256 !== source
)
  await run("bash", ["scripts/build-program.sh"]);
const rpc = new Connection("http://127.0.0.1:8899", "confirmed");
let alive = false;
try {
  await rpc.getSlot();
  alive = true;
} catch {
  /* Start this project's validator when no RPC responds. */
}
if (!alive) {
  const validator = spawn("bash", ["scripts/start-validator.sh"], {
    stdio: "inherit",
  });
  children.push(validator);
  const deadline = Date.now() + 45_000;
  while (!alive && Date.now() < deadline) {
    try {
      await rpc.getSlot();
      alive = true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (!alive) {
    shutdown();
    throw new Error(
      "The local Solana validator did not start. See .local/validator-console.log.",
    );
  }
}
const deployment = JSON.parse(readFileSync("shared/deployment.json", "utf8"));
const currentBuild = JSON.parse(readFileSync("shared/build.json", "utf8"));
const previous = existsSync(".local/deployments/localnet.json")
  ? JSON.parse(readFileSync(".local/deployments/localnet.json", "utf8"))
  : null;
const genesisHash = await rpc.getGenesisHash();
if (
  !(await rpc.getAccountInfo(new PublicKey(deployment.programId)))
    ?.executable ||
  previous?.binarySha256 !== currentBuild.binarySha256 ||
  previous?.genesisHash !== genesisHash
) {
  await run(process.execPath, ["--import", "tsx", "scripts/bootstrap.ts"]);
  await run("bash", ["scripts/deploy-program.sh"]);
}
await run("npm", ["run", "demo:seed"]);
const appUrl = `http://127.0.0.1:${process.env.PORT || 5173}`;
let running = false;
try {
  const response = await fetch(`${appUrl}/api/config`, {
    signal: AbortSignal.timeout(1500),
  });
  if (response.ok) {
    const config = await response.json();
    running =
      config.demo &&
      config.ready &&
      config.network === "localnet" &&
      config.programId === deployment.programId;
  }
} catch {
  // No matching app is listening; start this project's server below.
}
console.log(
  `${running ? "Already running" : "Open"}: ${appUrl}. Switch Sponsor → Student → Reviewer to try a real localnet grant.`,
);
if (!running) await run("npm", ["run", "dev"]);
