#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PWD/.tooling/solana-release/bin:$PATH"
exec solana-test-validator --ledger "$PWD/.local/ledger" --bind-address 127.0.0.1 --rpc-port 8899 --faucet-port 9900 --limit-blockstore-size 800000 > "$PWD/.local/validator-console.log" 2>&1
