# TripGrant — pitch script

**Target length:** about two minutes. This script describes the built MVP. Use an actual recording of the app; do not present synthetic demo data as a real pilot.

Talented students miss opportunities when travel support is uncertain. A student may have an invitation to a hackathon or conference, while a sponsor has a budget. But the reimbursement process still leaves basic questions open: how much is reserved, who can approve it, and where does the unused money go?

TripGrant gives each trip a clear budget and a verifiable settlement.

A sponsor funds a travel grant on Solana. The grant fixes the student, reviewer, spending cap and deadlines. The student can see that the budget has been reserved, then submit an eligible expense with its original receipt.

A human checks the evidence. One approval does two things in the same transaction: it pays the approved amount to the student and returns the entire remaining balance to the sponsor.

Here is the simplest example: reserve one hundred, approve seventy-two, pay seventy-two and return twenty-eight. The grant cannot pay twice. If the reviewer rejects the claim, all funds return. If the review window expires, anyone can trigger a refund to the fixed sponsor.

Solana is central to the product. The budget sits in a program-controlled token vault, and signer checks, spending limits and both transfers are enforced by the program. The website displays the resulting on-chain state.

The original receipt stays off chain and is accessible to the grant participants. Its hash is recorded on chain so the reviewer can verify that the downloaded file matches the submission. The hash does not replace a human authenticity or eligibility check.

Our first users would be student communities and small event sponsors managing a few travel grants. The built MVP has sponsor, student and reviewer workspaces, private evidence, atomic reimbursement, sponsor refunds and transaction verification. Its full flow has been tested with disposable funds on a local Solana validator. The devnet-USDC build is prepared; public deployment remains the next delivery step.

The next validation is small and concrete: work with one student community, test the process with three to five students, and measure reimbursement time and returned unused budgets. No pilot partnership has been established yet.

TripGrant. Ideas deserve a ticket.
