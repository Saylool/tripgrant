# TripGrant

**Ideas deserve a ticket.** Reserve a student’s travel budget on Solana, review the original expense evidence, then pay the approved amount and return the entire unused balance to the sponsor in one transaction.

This repository contains a working Anchor program, an English React application, a private receipt service, a disposable localnet demo and a Phantom wallet flow for devnet. The student, sponsor and reviewer have separate workspaces. A reserved budget is not an approved reimbursement or an advance payment.

**Project website:** [saylool.github.io/tripgrant](https://saylool.github.io/tripgrant/). This public page includes real app screenshots, a settlement illustration, English videos and validation evidence. The complete application runs locally with the instructions below; the public showcase does not accept funds or private receipt uploads. Public devnet deployment remains pending.

**Colosseum project draft:** [TripGrant](https://colosseum.com/arena/projects/tripgrant). Creating the project draft is separate from completing the final hackathon submission.

The English [pitch](https://youtu.be/XhlKwcJ8quw) is 1:46 on YouTube and the [demo walkthrough](https://youtu.be/0INAL_Qi9b4) is 2:13. Both are published as unlisted videos with English captions. They use synthetic English narration over actual screen captures; the demo is a screen-by-screen walkthrough. Original MP4 files, captions and provenance are in `showcase/videos`.

## Run the working demo

Requirements: Node.js 26+, npm, Rust/Cargo and Python 3. The setup script supports macOS Apple Silicon, macOS Intel and Linux x86-64. The build was verified on macOS Apple Silicon.

```sh
npm ci
npm run demo
```

Open **http://127.0.0.1:5173**. On this Mac, `TripGrant.command` also starts the guided demo. The first run downloads checksum-verified Solana 4.3.0 and Anchor 1.2.1 releases into `.tooling`, generates disposable project wallets, compiles and deploys the program, and creates three sample grants. It does not change the user’s default Solana wallet or shell profile. Solana’s compiler may populate its normal toolchain cache.

If the validator and app are already running, use the existing page. The demo runner preserves the ledger, keys, receipts and previous grant progress. The database lives in `.local/data/tripgrant.sqlite`; private test keys live in `.local/keys`. Neither directory is tracked by Git. Stop processes with Ctrl+C; restart with `npm run demo`.

## Try a grant

1. In **Sponsor**, click **Create a grant**, enter the event, destination and purpose, reserve `100 TEST`, review the fixed wallets and deadlines, and confirm funding.
2. Switch to **Student**, open that grant, select **Use a synthetic demo receipt** or upload a PDF/PNG/JPEG, enter `72`, and submit the expense.
3. Switch to **Reviewer**, download and inspect the original receipt, confirm the eligibility check, and review a settlement of `72`.
4. Confirm **Approve & settle**. The grant reads **Paid**, with `72 TEST` paid, `28 TEST` returned and an empty vault. **View confirmed transaction** shows its actual Solana execution logs.

The sample events, names and receipts are synthetic. `TEST` is a disposable six-decimal SPL token, not USDC and not money. Demo signing is restricted to a loopback validator and a localhost server. The demo does not require a wallet extension or any paid API.

## What the program enforces

| Action              | Signer and result                                                                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create_and_fund`   | Sponsor creates the grant and funds the vault atomically. All three roles must be distinct; deadlines must be ordered and in the future, within 90 days.                                      |
| `submit_claim`      | Only the fixed student can submit one positive claim and a nonzero receipt hash, strictly before the claim deadline.                                                                          |
| `settle`            | Only the fixed reviewer can settle a submitted claim, strictly before the review deadline. Approval cannot exceed either the claim or the cap. Student payment and sponsor refund are atomic. |
| `expire_and_refund` | Anyone can trigger a refund at or after the review deadline. All remaining tokens and vault rent go to the fixed sponsor.                                                                     |

A zero approval rejects the claim and returns all funds. No second claim or settlement can move funds. The empty vault closes, returning its SOL rent to the sponsor; the terminal grant record remains to prevent reuse of its ID. Extra same-mint tokens sent to the vault return to the sponsor and cannot enlarge the approval cap. The classic SPL Token program, account owners, mints, vault seeds and recipient authorities are checked on chain.

The UI limits a claim to the reserved cap. A direct program call may submit a larger claim, but the program still limits its approval to the cap. All money is represented as six-decimal integer units; transaction amounts never pass through floating point.

## Receipt privacy and trust

Original files are stored off chain. The server verifies file type and size, hashes the bytes and stores up to 10 uploads per grant without deleting an earlier potentially committed receipt. The program stores the SHA-256 commitment. On download, both server and browser verify that the bytes match the commitment.

In wallet mode, a single-use, expiring wallet signature creates a session. Receipt retrieval checks the three fixed participants against the on-chain grant. The sign-in message includes the origin, wallet, network, nonce and expiry. API requests enforce the configured host and origin. The private database is not publicly served.

A matching hash does not prove an expense is authentic, that attendance occurred, or that a student is eligible. Human reviewers check those facts. Wallet addresses, amounts and commitments are public on Solana. This prototype stores files unencrypted in the private server database; production needs a retention policy, backups and appropriate encrypted storage.

## Devnet wallet mode

**Current status:** the program is deployed and verified on localnet. A canonical devnet-USDC artifact has also been built and its whitelist tested on the disposable validator. **It has not been deployed to public devnet.** The public SOL faucet returned a daily limit / dry-faucet error during this build.

Program address for this checkout: `Ea1JSMwEmnHGG4BUWnzrEFVhkNrtif3919GbdnuaLhd3`. The same address only has a deployment on localnet. A new checkout generates its own program key and rebuilds the IDL.

The default program build accepts only Circle’s devnet USDC mint:

```text
4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

The `local-test-mint` feature accepts a disposable classic six-decimal mint and is for localnet only. Build metadata and SHA-256 checks prevent the deployment script from sending that artifact to devnet.

When devnet test SOL is available for the generated deployment wallet:

```sh
bash scripts/build-program.sh devnet
bash scripts/deploy-program.sh devnet
```

Then create `.env` from `.env.example` with:

```dotenv
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
DEMO_MODE=false
HOST=127.0.0.1
PORT=5173
TOKEN_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

Use **three different Phantom wallets** for sponsor, student and reviewer. Each acting wallet needs devnet SOL for its transaction fee. The sponsor also needs devnet USDC in its associated token account. The browser signs every transaction; the server does not load demo signing keys on devnet. The server records metadata only after checking that the confirmed transaction exactly matches the prepared action. The wallet extension workflow is implemented but has not been tested with an installed personal Phantom wallet in this session.

For a public HTTPS deployment, set `HOST=0.0.0.0`, `PUBLIC_ORIGIN=https://your-domain.example`, `DEMO_MODE=false` and `SOLANA_NETWORK=devnet`. Preserve the public Host header at the reverse proxy and mount persistent storage for `.local/data`. A Dockerfile is included, but its image has not been built or published here. A public deployment refuses to start without an origin; demo signing cannot be exposed publicly.

Official references: [Circle USDC addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses), [Circle test USDC faucet](https://faucet.circle.com/), [Solana test SOL faucet](https://faucet.solana.com/), [Anchor TypeScript client](https://www.anchor-lang.com/docs/clients/typescript).

## Verification

```sh
npm run verify
# Separate check: builds the USDC-only artifact, tests its whitelist locally,
# then restores the disposable localnet artifact and deployment.
npm run test:usdc
```

`verify` performs strict type checking, 26 unit/security tests, 17 real program integration tests, 4 HTTP integration tests and a production web build. `test:usdc` adds one real binary whitelist/rollback test. The integration checks require a running local validator and seeded demo. See [the validation record](docs/VALIDATION.md) for outcomes and the browser workflow.

Pinned dependencies use a small reviewed pure-JavaScript `bigint-buffer` compatibility implementation to avoid an obsolete native converter. Its bounds and full-u64 byte conversions are tested. Unused mobile-wallet dependencies were removed; vulnerable TOML and UUID transitive versions were updated. The runtime dependency audit reports **0 high, 0 critical and 5 moderate advisories** inherited through the legacy Solana RPC/wallet SDK, including `stream-json`; they remain an explicit release limitation. The program has an upgrade authority and has not received an independent audit. This is a test-network prototype.

## Repository map

- `programs/tripgrant/src/lib.rs`: grant escrow, signer/account checks and atomic settlement.
- `server/`: private receipts, wallet sessions, transaction preparation/verification and on-chain snapshots.
- `app/`: responsive sponsor, student and reviewer workspaces, review confirmations and transaction viewer.
- `shared/`: exact amount handling, generated IDL, public addresses and build metadata.
- `tests/`, `scripts/`: security checks, program tests and project-local setup.
- [Türkçe kullanım rehberi](docs/TURKCE_KULLANIM.md), [English pitch](docs/PITCH.md), [demo recording script](docs/DEMO_SCRIPT.md), [teslim hazırlığı](docs/TESLIM_REHBERI.md).

The activity feed contains transactions confirmed through this app instance. Direct CLI transactions still change the on-chain snapshot but are not automatically indexed into that feed. Transaction details depend on the RPC retaining their execution history; an old entry can remain in the feed after its RPC logs have been pruned. The local validator retains a bounded blockstore. Sessions and unsigned pending actions currently live in memory; restarting the server requires a fresh sign-in. The MVP is one claim and one final decision per grant, with no appeals or partial repeat payouts. Existing grants cannot change their roles, mint or deadlines.
