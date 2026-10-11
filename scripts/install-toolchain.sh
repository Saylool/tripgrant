#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PWD/.tooling/bin:$PWD/.tooling/solana-release/bin:$PATH"
if command -v anchor >/dev/null && command -v solana >/dev/null && command -v solana-test-validator >/dev/null && command -v cargo-build-sbf >/dev/null \
  && [[ "$(anchor --version)" == "anchor-cli 1.2.1" && "$(solana --version)" == "solana-cli 4.3.0 "* ]]; then
  printf 'Pinned Solana and Anchor tooling is already available.\n'
  exit 0
fi
if ! command -v cargo >/dev/null; then
  printf 'Install Rust from https://rustup.rs before continuing.\n' >&2
  exit 1
fi
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) platform="aarch64-apple-darwin" ;;
  Darwin-x86_64) platform="x86_64-apple-darwin" ;;
  Linux-x86_64) platform="x86_64-unknown-linux-gnu" ;;
  *) printf 'Use the official Solana and Anchor installers for this platform.\n' >&2; exit 1 ;;
esac
mkdir -p .tooling/bin .tooling/downloads
# Pin official releases, verify the digest published by GitHub, and never modify shell profiles.
PLATFORM_NAME="$platform" python3 - <<'PY'
import hashlib,json,os,pathlib,urllib.request
platform=os.environ['PLATFORM_NAME']
items=[('otter-sec/anchor','v1.2.1','anchor-1.2.1-'+platform,pathlib.Path('.tooling/bin/anchor')),('anza-xyz/agave','v4.3.0','solana-release-'+platform+'.tar.bz2',pathlib.Path('.tooling/downloads/solana.tar.bz2'))]
for repo,tag,name,file in items:
 req=urllib.request.Request(f'https://api.github.com/repos/{repo}/releases/tags/{tag}',headers={'User-Agent':'TripGrant-toolchain-setup'})
 release=json.load(urllib.request.urlopen(req))
 asset=next(a for a in release['assets'] if a['name']==name)
 digest=asset.get('digest','')
 if not digest.startswith('sha256:'): raise RuntimeError('The official release has no SHA-256 digest; installation stopped.')
 print('Downloading official release:',name,flush=True)
 urllib.request.urlretrieve(asset['browser_download_url'],file)
 actual=hashlib.sha256(file.read_bytes()).hexdigest()
 if actual != digest.split(':',1)[1]: file.unlink();raise RuntimeError('Release checksum mismatch.')
 print('Verified SHA-256:',name,flush=True)
PY
chmod +x .tooling/bin/anchor
tar -xjf .tooling/downloads/solana.tar.bz2 -C .tooling
anchor --version
solana --version
