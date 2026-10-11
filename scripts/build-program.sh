#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PWD/.tooling/bin:$PWD/.tooling/solana-release/bin:$PATH"
# Local build allows a disposable six-decimal test mint. Default build is devnet USDC only.
# cargo-build-sbf can retain a newer packed output after switching cached feature builds.
# Remove only the generated output so it always packs the current feature artifact.
rm -f target/deploy/tripgrant.so
if [[ "${1:-localnet}" == "devnet" ]]; then
  anchor build -- --no-default-features
else
  anchor build -- --no-default-features --features local-test-mint
fi
cp target/idl/tripgrant.json shared/idl.json
BUILD_NETWORK="${1:-localnet}" node --input-type=module - <<'JS'
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const idl=JSON.parse(readFileSync('shared/idl.json','utf8'));
writeFileSync('shared/build.json',JSON.stringify({programId:idl.address,network:process.env.BUILD_NETWORK,binarySha256:hash('target/deploy/tripgrant.so'),sourceSha256:hash('programs/tripgrant/src/lib.rs'),anchorVersion:'1.2.1',solanaVersion:'4.3.0'},null,2)+'\n');
JS
