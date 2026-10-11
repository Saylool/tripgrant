# TripGrant — validation record

Verified on **11 October 2026**, macOS Apple Silicon, Node.js 26.9.0, Anchor 1.2.1 and Solana 4.3.0. The running application is the production web build at `http://127.0.0.1:5173`, using a real, disposable local Solana validator.

## Automated results

| Check                                                                                | Result                  |
| ------------------------------------------------------------------------------------ | ----------------------- |
| Strict TypeScript checks                                                             | Passed                  |
| Unit, amount, authentication and API security checks                                 | 26 passed               |
| Deployed Anchor program integration checks                                           | 17 passed               |
| HTTP integration with actual grant accounts and private receipts                     | 4 passed                |
| Canonical USDC binary: reject another mint, preserve balance, roll back new accounts | 1 passed                |
| Production web build                                                                 | Passed                  |
| **Total automated test cases**                                                       | **48 passed, 0 failed** |

Commands: `npm run verify`, followed separately by `npm run test:usdc`. The final responsive CSS adjustment was followed by another successful type check and production build. The canonical artifact was actually deployed to the disposable validator for its negative mint test, then the local artifact was restored. The build script repacks the selected feature build so a cached local artifact cannot masquerade as the USDC build.

Program checks cover signer substitution, wrong accounts/mints/owners/program IDs, exact cap and claim limits, duplicate operations, concurrent settlements, vault donations, full rejection/refund, SOL vault rent, real clock boundaries and permissionless expiry. A deliberately frozen refund account also verifies that failure of the second token transfer rolls back the first transfer and grant state.

Private execution logs are retained in `.local/data/verification-final.log`, `usdc-check.log`, `production-build-final.log`, `demo-restart-check.log` and `demo-already-running-check.log`. They are not part of the public source repository. Public build fingerprints and the observed browser settlement are recorded in [validation-summary.json](validation-summary.json).

## Browser workflow

The Sponsor flow created and funded the synthetic **Demo Journey** grant with 100 TEST. Student receipt upload and a 72 TEST claim, reviewer download/eligibility confirmation, and settlement completed successfully.

The same claim and settlement workflow was repeated in the **production build** at a **390 × 844** mobile viewport using the seeded **Student Builders Summit** grant. The downloaded synthetic PDF matched its on-chain SHA-256 commitment. Approval remained disabled until the review checkbox was checked; the confirmation showed both destinations before signing.

Observed final state:

| Field                     | Value                         |
| ------------------------- | ----------------------------- |
| Reserved                  | 100 TEST                      |
| Claimed / approved        | 72 TEST                       |
| Returned to sponsor       | 28 TEST                       |
| Status                    | Paid                          |
| Token vault               | Closed; zero remaining tokens |
| Confirmed settlement slot | 7,495                         |
| Transaction error         | None                          |
| Network fee               | 5,000 lamports                |

The confirmed transaction viewer displayed actual program execution logs and a single dialog. Modal input focus remained on the amount field across clock updates. Search, completed filtering, mobile navigation and all three role workspaces were exercised. At 390px, the document width is 390px; the table scrolls inside its own container. Desktop was checked at the browser's normal 1280 × 720 viewport.

The guided runner reused the existing ledger and preserved grant progress. Calling it again while the app was running returned the existing app address successfully. The validator was restarted without resetting its ledger; the Paid grant, closed vault and successful transaction were independently read again afterward.

Screenshots: [desktop](screenshots/desktop.jpg), [mobile](screenshots/mobile.jpg), [settlement](screenshots/settlement.jpg), [transaction](screenshots/transaction.jpg).

## Scope and remaining delivery work

- These are synthetic events, students, receipts and TEST tokens. They do not establish real adoption, an organizer partnership or a student pilot.
- Public devnet deployment was not completed: the SOL faucet returned an internal/dry-faucet error and then a quota response. The USDC-only artifact is built and tested locally; a funded devnet deployment wallet is still required.
- The personal Phantom extension flow is implemented but was not exercised with an installed user wallet. Docker packaging is included but has not been built or published.
- The runtime dependency audit reports 0 high, 0 critical and 5 moderate advisories. No independent program audit was performed; an upgrade authority remains.
- Receipt bytes are private in the server database but are not encrypted at rest. Session and pending-action state is in memory. Transaction detail availability depends on RPC history retention; some early local demo transactions were already pruned by the original smaller blockstore limit. The retained grant state and application activity remain intact. The runner now uses a larger bounded blockstore.
- A public application URL, pitch/demo recordings, applicant university verification and the actual competition submissions remain delivery steps.
