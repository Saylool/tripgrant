# TripGrant video narration

Synthetic English narration accompanies actual captures from the working localnet application. This is a screen-by-screen walkthrough, not a continuous screen recording. The voice is macOS Samantha, not the founder's voice. For the Colosseum pitch, a founder-recorded version is preferable because the form asks how the team thinks and communicates. Upload the final videos to YouTube, Loom or Vimeo; direct MP4 links do not satisfy the platform's stated video-host requirement.

## Pitch

TripGrant is a solo project by Samet, a student at Piri Reis University, built with Codex A I assistance. It helps sponsors reserve student travel budgets on Solana, then reimburse approved expenses and return unused funds together.

Travel reimbursement involves allocating a budget, checking evidence, paying the student and returning what is left. TripGrant gives each trip a fixed student, reviewer, spending cap and deadlines. The budget is reserved in an escrow vault. This version reimburses an expense after it is incurred; it does not provide advance financing.

The student submits an expense and an original receipt. The file stays private to the grant participants, while its fingerprint is recorded on chain. A human reviewer checks eligibility and authenticity. A matching fingerprint only proves that the file matches the submission.

One approval executes both transfers. In this example, one hundred test units are reserved, seventy two are paid to the student, and twenty eight return to the sponsor. The grant cannot pay twice. Rejection returns the full budget; after the review deadline, anyone can trigger a refund to the fixed sponsor.

Solana is central to the implementation. The Anchor program enforces signer checks, account ownership, caps, deadlines and atomic settlement. Forty eight checks passed. This is a working local validator prototype with synthetic data and disposable test tokens. Public devnet deployment is still pending.

The first audience is student communities and small event sponsors. The next step is to test the workflow with three to five students and measure reimbursement time and unused funds returned. No pilot partnership or adoption is claimed. TripGrant. Ideas deserve a ticket.

## Demo

This is TripGrant, a student travel reimbursement application with sponsor, student and reviewer workspaces. The screens in this walkthrough come from the working application. Events, names and receipts are synthetic. Disposable test tokens run on a real local Solana validator.

The sponsor creates a travel grant for a fixed student and reviewer, with a budget of one hundred test units and separate claim and review deadlines. The program requires distinct participants and ordered deadlines.

Before funding, the sponsor reviews the fixed wallets and deadlines. Funding creates the program controlled token vault atomically. The budget is reserved; no reimbursement has been paid to the student yet.

The funded grant now appears in the workspace, ready to claim. Its state and remaining vault balance are read from Solana. The sponsor's budget is held for this specific grant.

The student opens the grant and prepares a seventy two unit expense using an explicitly synthetic receipt. The original file stays off chain. Submission records the amount and the receipt's SHA two fifty six commitment in the program.

The grant is now in review. The receipt's fingerprint is visible. The original receipt can be downloaded by the grant participants. The server and browser check that the downloaded bytes match the on chain commitment.

The designated reviewer downloads the receipt and confirms the eligibility check for this synthetic demonstration. A matching hash does not prove an expense is genuine. A real grant requires human review of the original evidence.

The settlement preview shows seventy two units to the student and twenty eight back to the sponsor. Approval executes both transfers in one Solana transaction. The approved amount cannot exceed the claim or the reserved cap.

The grant is paid. Seventy two test units reached the student, twenty eight returned to the sponsor, and the vault is empty. This terminal grant cannot make a second payment.

Here is the confirmed transaction, with its actual signature, slot, fee and program execution logs. This is localnet evidence, not a public devnet transaction. The repository includes the full application, program and setup instructions to reproduce the workflow.
