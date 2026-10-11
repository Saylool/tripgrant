#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PWD/.tooling/solana-release/bin:$PATH"
network="${1:-localnet}"
rpc="http://127.0.0.1:8899"
if [[ "$network" == "devnet" ]]; then rpc="https://api.devnet.solana.com"; fi
if [[ "$network" != "localnet" && "$network" != "devnet" ]]; then
  printf 'Only localnet and devnet are supported.\n' >&2
  exit 1
fi
DEPLOY_NETWORK="$network" node --input-type=module - <<'JS'
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const build=JSON.parse(readFileSync('shared/build.json','utf8'));
const sha=createHash('sha256').update(readFileSync('target/deploy/tripgrant.so')).digest('hex');
if(build.network!==process.env.DEPLOY_NETWORK || build.binarySha256!==sha) throw new Error('Build this exact network artifact before deploying. Local-test-mint builds must never be deployed to devnet.');
JS
solana --url "$rpc" --keypair "$PWD/.local/keys/sponsor.json" program deploy target/deploy/tripgrant.so --program-id "$PWD/.local/keys/program.json" --buffer "$PWD/.local/keys/buffer.json" --use-rpc
DEPLOY_RPC="$rpc" node --import tsx --input-type=module - <<'JS'
import {Connection,PublicKey} from '@solana/web3.js';
import {readFileSync} from 'node:fs';
import {waitForProgramActivation} from './scripts/wait-activation.ts';
const id=JSON.parse(readFileSync('shared/build.json','utf8')).programId;
await waitForProgramActivation(new Connection(process.env.DEPLOY_RPC,'confirmed'),new PublicKey(id));
JS
DEPLOY_NETWORK="$network" DEPLOY_RPC="$rpc" node --input-type=module - <<'JS'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const build=JSON.parse(readFileSync('shared/build.json','utf8'));
const res=await fetch(process.env.DEPLOY_RPC,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getGenesisHash'})});
const result=await res.json();if(!result.result) throw new Error('Deployment succeeded, but cluster identity could not be recorded.');
mkdirSync('.local/deployments',{recursive:true});
writeFileSync(`.local/deployments/${process.env.DEPLOY_NETWORK}.json`,JSON.stringify({...build,genesisHash:result.result,deployedAt:new Date().toISOString()},null,2)+'\n');
JS
