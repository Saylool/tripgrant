import { Keypair } from "@solana/web3.js";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import path from "node:path";

const root = process.cwd();
mkdirSync(path.join(root, ".local/keys"), { recursive: true, mode: 0o700 });
mkdirSync(path.join(root, ".local/data"), { recursive: true });
mkdirSync(path.join(root, "target/deploy"), { recursive: true });
const wallets: Record<string, string> = {};
for (const name of [
  "program",
  "sponsor",
  "student",
  "reviewer",
  "mint",
  "buffer",
]) {
  const file = path.join(root, `.local/keys/${name}.json`);
  if (!existsSync(file))
    writeFileSync(file, JSON.stringify([...Keypair.generate().secretKey]), {
      mode: 0o600,
    });
  const key = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(file, "utf8"))),
  );
  wallets[name] = key.publicKey.toBase58();
}
copyFileSync(
  ".local/keys/program.json",
  "target/deploy/tripgrant-keypair.json",
);
const lib = "programs/tripgrant/src/lib.rs";
writeFileSync(
  lib,
  readFileSync(lib, "utf8").replace(
    /declare_id!\("[^"\n]+"\);/,
    `declare_id!("${wallets.program}");`,
  ),
);
writeFileSync(
  "Anchor.toml",
  `[toolchain]\nanchor_version = "1.2.1"\n\n[features]\nresolution = true\nskip-lint = false\n\n[programs.localnet]\ntripgrant = "${wallets.program}"\n\n[programs.devnet]\ntripgrant = "${wallets.program}"\n\n[provider]\ncluster = "localnet"\nwallet = ".local/keys/sponsor.json"\n\n[workspace]\nmembers = ["programs/tripgrant"]\n`,
);
writeFileSync(
  "shared/deployment.json",
  JSON.stringify(
    {
      programId: wallets.program,
      localMint: wallets.mint,
      wallets: {
        sponsor: wallets.sponsor,
        student: wallets.student,
        reviewer: wallets.reviewer,
      },
    },
    null,
    2,
  ) + "\n",
);
console.log("Task-local test wallets ready. Private keys are ignored by Git.");
console.log("Program address:", wallets.program);
