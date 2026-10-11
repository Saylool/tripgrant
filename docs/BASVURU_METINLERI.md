# TripGrant — application text drafts

Updated 11 October 2026. These describe the current prototype and verified publication links. Applicant-provided university: Piri Reis University; GitHub account: Saylool. The founder profile and project/media sections are saved in Colosseum; the final survey and competition submissions are not yet complete.

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

The working MVP includes sponsor, student and reviewer workspaces, private receipt handling, atomic settlement and refunds. Forty-eight test cases passed, including 17 against the deployed program and a USDC-only whitelist/rollback check. The web build was checked on desktop and mobile. A real localnet flow reserved 100 TEST, paid 72 and returned 28. Synthetic data, videos and evidence are available on the public project website; the complete app runs from the public repository. Public devnet and full application hosting are pending. No external pilot or adoption is claimed.

## Proposed business model

The initial revenue hypothesis is a subscription for organizers and sponsors managing recurring travel-grant programs, with reporting and workflow tools. The MVP does not charge a platform fee. Pricing and willingness to pay remain unvalidated and would be tested in organizer interviews.

## Development period

This TripGrant implementation was created in this workspace on 11 October 2026, inside the hackathon window, using existing open-source libraries and AI coding assistance. The applicant should confirm any additional prior work or human contributions before submitting.

## Verified application links

| Field                  | Current state                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| GitHub repository      | https://github.com/Saylool/tripgrant                                                                      |
| Public project website | https://saylool.github.io/tripgrant/ — screenshots, videos and evidence; full escrow app runs from source |
| Applicant X link       | https://x.com/LoolSay — applicant account; no separate project account has been created                   |
| English pitch video    | https://youtu.be/XhlKwcJ8quw — unlisted, English captions, 1:46 on YouTube                                |
| English demo video     | https://youtu.be/0INAL_Qi9b4 — unlisted, English captions, 2:13 screen walkthrough                        |
| Colosseum project link | https://colosseum.com/arena/projects/tripgrant — draft created, final submission pending                  |

Only answer the Earn question about an official Colosseum submission with **Yes** after the main submission has actually completed. Use the same project name and verified links in all three submissions.

## Submission status and remaining applicant details

The applicant's name, Colosseum profile, Telegram contact, X account and prior public GitHub work have been entered and saved. The applicant confirmed this is their first Solana competition. Department and study year have not been provided; do not invent them. Current student verification may still be requested by the organizer.

Colosseum's project review reports **Ready to submit**. The final survey is being prepared. Both Earn forms contain the verified project and video links, but remain unsent. Their official-Colosseum-submission answer stays blank until a successful main submission is verified.

The Superteam Türkiye intake draft is also unsent. The dedicated hackathon Telegram group join request is awaiting administrator approval; membership must be verified before checking the required joined-group answer. The Luma calendar registration step is pending. No staff Telegram group has been created. Do not invent founder experience, customer interviews, partnerships or traction.
