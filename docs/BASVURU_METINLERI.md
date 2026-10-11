# TripGrant — application text drafts

Prepared 11 October 2026. These describe the current prototype. Update deployment status and links after they are verified. Applicant-provided university: Piri Reis University; GitHub account: Saylool. Personal answers still need the applicant's input.

## Project name

TripGrant

## Brief description

Student travel grants on Solana: reserve a budget, review private expense evidence, then reimburse the approved amount and return unused funds atomically.

## What are you building, and who is it for?

TripGrant is a travel reimbursement workflow for student communities, event organizers and sponsors. A sponsor funds a capped grant for a fixed student and reviewer. The student submits one expense and an original receipt. A human reviewer decides the eligible amount; one Solana transaction pays the student and returns the entire unused vault balance to the sponsor. Rejection returns the full balance, and after the review deadline anyone can trigger a refund to the fixed sponsor. The MVP supports reimbursement after an expense is incurred; it does not provide advance financing.

## Why build this?

Travel support involves several separate steps: allocating a budget, checking evidence, paying a student and returning unused funds. TripGrant makes the allocation visible to the student and enforces the approved payment and sponsor refund together. Existing travel-grant programs informed the product research; none is a confirmed customer or partner. The next validation is to test this narrow workflow with a student community and learn whether sponsors want to reserve individual budgets before reimbursement.

## How does the product use Solana?

An Anchor program holds each grant's six-decimal tokens in a program-controlled vault. It fixes the participants, cap and deadlines, enforces signer and account checks, and atomically transfers the approved reimbursement and sponsor refund. A receipt hash commits to off-chain evidence; the original file is private to the participants. A terminal grant cannot pay twice. The default build accepts devnet USDC; a local-only feature supports disposable test tokens.

## Technologies and AI tools

Solana, Rust, Anchor, classic SPL Token, React, TypeScript, Vite, Express, SQLite, Phantom wallet integration and SHA-256 receipt commitments. Development, documentation and verification were performed with Codex AI assistance. Original receipt authenticity and student eligibility are checked by a human reviewer.

## Current progress

The working MVP includes sponsor, student and reviewer workspaces, private receipt upload/download, settlement confirmations, sponsor refunds and transaction verification. Forty-eight automated test cases passed, including 17 checks against the deployed program and a separate USDC-only binary whitelist/rollback check. The production web build was exercised on desktop and a 390px mobile viewport. A real localnet flow reserved 100 TEST, paid 72 and returned 28. Data and balances are synthetic. Public devnet and application hosting are pending; no external pilot or adoption evidence has been established for this submission.

## Proposed business model

The initial revenue hypothesis is a subscription for organizers and sponsors managing recurring travel-grant programs, with reporting and workflow tools. The MVP does not charge a platform fee. Pricing and willingness to pay remain unvalidated and would be tested in organizer interviews.

## Development period

This TripGrant implementation was created in this workspace on 11 October 2026, inside the hackathon window, using existing open-source libraries and AI coding assistance. The applicant should confirm any additional prior work or human contributions before submitting.

## Links to fill after publication

| Field                  | Current state                                                     |
| ---------------------- | ----------------------------------------------------------------- |
| GitHub repository      | Not published; owner account supplied: https://github.com/Saylool |
| Public project website | Not published; localhost is not the submission URL                |
| Project X link         | Applicant to provide                                              |
| English pitch video    | Script ready in PITCH.md; recording/link pending                  |
| English demo video     | Script ready in DEMO_SCRIPT.md; recording/link pending            |
| Colosseum project link | Created after the applicant registers and saves the project       |

Only answer the Earn question about an official Colosseum submission with **Yes** after the main submission has actually completed. Use the same project name and verified links in all three submissions.

## Applicant details still needed

Full name, Colosseum username, Telegram contact, X link, current student verification as requested by the organizer, and truthful answers about legal entity, investment, fundraising and any live token. No placeholder should be submitted as a real answer. Do not invent founder experience, customer interviews, partnerships or traction.
