import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { demo, network, connection, keypair } from "../server/config.js";
import {
  addresses,
  ata,
  chainTime,
  fundTransaction,
  hash,
  send,
} from "../server/chain.js";
import {
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Keypair } from "@solana/web3.js";
import { airdrop } from "./local-fixtures.js";
import { mint } from "../server/config.js";
import { waitForProgramActivation } from "./wait-activation.js";
import { programId } from "../server/config.js";

test("canonical USDC build rejects a different mint and rolls back funding", async () => {
  assert.ok(
    demo && network === "localnet",
    "This binary check only runs on disposable localnet.",
  );
  const originalBuild = JSON.parse(readFileSync("shared/build.json", "utf8"));
  assert.equal(originalBuild.network, "localnet");
  assert.equal(
    createHash("sha256")
      .update(readFileSync("target/deploy/tripgrant.so"))
      .digest("hex"),
    originalBuild.binarySha256,
    "Rebuild the local binary before testing the canonical USDC build.",
  );
  const directory = ".local/artifacts";
  mkdirSync(`${directory}/localnet`, { recursive: true });
  mkdirSync(`${directory}/devnet`, { recursive: true });
  const originals = [
    "target/deploy/tripgrant.so",
    "shared/build.json",
    "shared/idl.json",
  ].map((file) => ({ file, content: readFileSync(file) }));
  copyFileSync(
    "target/deploy/tripgrant.so",
    `${directory}/localnet/tripgrant.so`,
  );
  const deploy = async (file: string) => {
    execFileSync(
      ".tooling/solana-release/bin/solana",
      [
        "--url",
        "http://127.0.0.1:8899",
        "--keypair",
        ".local/keys/sponsor.json",
        "program",
        "deploy",
        file,
        "--program-id",
        ".local/keys/program.json",
        "--buffer",
        ".local/keys/buffer.json",
        "--use-rpc",
      ],
      { stdio: "pipe" },
    );
    await waitForProgramActivation(connection, programId);
  };
  let switched = false;
  try {
    execFileSync("bash", ["scripts/build-program.sh", "devnet"], {
      stdio: "pipe",
    });
    copyFileSync(
      "target/deploy/tripgrant.so",
      `${directory}/devnet/tripgrant.so`,
    );
    copyFileSync("shared/build.json", "shared/devnet-build.json");
    switched = true;
    await deploy(`${directory}/devnet/tripgrant.so`);
    const sponsor = Keypair.generate();
    const student = Keypair.generate();
    const reviewer = Keypair.generate();
    await airdrop(sponsor);
    await getOrCreateAssociatedTokenAccount(
      connection,
      keypair("sponsor"),
      mint,
      sponsor.publicKey,
    );
    await mintTo(
      connection,
      keypair("sponsor"),
      mint,
      ata(sponsor.publicKey),
      keypair("sponsor"),
      100_000_000n,
    );
    const id = randomBytes(8).readBigUInt64LE();
    const { grant, vault } = addresses(sponsor.publicKey, id);
    const now = await chainTime();
    const balance = (await getAccount(connection, ata(sponsor.publicKey)))
      .amount;
    await assert.rejects(
      async () =>
        send(
          await fundTransaction(
            sponsor.publicKey,
            student.publicKey,
            reviewer.publicKey,
            id,
            100_000_000n,
            now + 1000,
            now + 2000,
            hash("USDC whitelist check"),
          ),
          sponsor,
        ),
      /UnsupportedMint/,
    );
    assert.equal(
      (await getAccount(connection, ata(sponsor.publicKey))).amount,
      balance,
    );
    assert.equal(await connection.getAccountInfo(grant), null);
    assert.equal(await connection.getAccountInfo(vault), null);
  } finally {
    originals.forEach(({ file, content }) => writeFileSync(file, content));
    if (switched) await deploy(`${directory}/localnet/tripgrant.so`);
  }
});
