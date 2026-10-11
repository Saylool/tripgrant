use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, TransferChecked};

// Replaced by scripts/setup.ts with this project's generated public program address.
declare_id!("Ea1JSMwEmnHGG4BUWnzrEFVhkNrtif3919GbdnuaLhd3");

const DECIMALS: u8 = 6;
#[cfg(not(feature = "local-test-mint"))]
const DEVNET_USDC: &str = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const MAX_WINDOW: i64 = 90 * 24 * 60 * 60;

#[program]
pub mod tripgrant {
    use super::*;

    pub fn create_and_fund(
        ctx: Context<CreateAndFund>,
        grant_id: u64,
        cap: u64,
        claim_deadline: i64,
        review_deadline: i64,
        event_hash: [u8; 32],
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        require!(cap > 0, GrantError::InvalidAmount);
        require!(claim_deadline > now && review_deadline > claim_deadline, GrantError::InvalidDeadlines);
        require!(review_deadline <= now.checked_add(MAX_WINDOW).ok_or(GrantError::Arithmetic)?, GrantError::InvalidDeadlines);
        require!(event_hash.iter().any(|b| *b != 0), GrantError::MissingEvidence);
        require!(ctx.accounts.mint.decimals == DECIMALS, GrantError::UnsupportedMint);
        #[cfg(not(feature = "local-test-mint"))]
        require!(ctx.accounts.mint.key().to_string() == DEVNET_USDC, GrantError::UnsupportedMint);
        let sponsor = ctx.accounts.sponsor.key();
        let student = ctx.accounts.student.key();
        let reviewer = ctx.accounts.reviewer.key();
        require!(sponsor != student && sponsor != reviewer && student != reviewer, GrantError::DistinctRolesRequired);
        require!(student != Pubkey::default() && reviewer != Pubkey::default(), GrantError::DistinctRolesRequired);

        token::transfer_checked(
            CpiContext::new(ctx.accounts.token_program.key(), TransferChecked {
                from: ctx.accounts.sponsor_token.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.sponsor.to_account_info(),
            }), cap, DECIMALS,
        )?;

        let grant = &mut ctx.accounts.grant;
        grant.grant_id = grant_id;
        grant.sponsor = sponsor;
        grant.student = student;
        grant.reviewer = reviewer;
        grant.mint = ctx.accounts.mint.key();
        grant.cap = cap;
        grant.claimed = 0;
        grant.approved = 0;
        grant.refunded = 0;
        grant.claim_deadline = claim_deadline;
        grant.review_deadline = review_deadline;
        grant.created_at = now;
        grant.submitted_at = 0;
        grant.settled_at = 0;
        grant.event_hash = event_hash;
        grant.receipt_hash = [0; 32];
        grant.status = GrantStatus::Funded;
        grant.bump = ctx.bumps.grant;
        grant.vault_bump = ctx.bumps.vault;
        emit!(GrantFunded { grant: grant.key(), sponsor, student, cap });
        Ok(())
    }

    pub fn submit_claim(ctx: Context<SubmitClaim>, amount: u64, receipt_hash: [u8; 32]) -> Result<()> {
        let grant = &mut ctx.accounts.grant;
        let now = Clock::get()?.unix_timestamp;
        require!(grant.status == GrantStatus::Funded, GrantError::InvalidState);
        require!(now < grant.claim_deadline, GrantError::ClaimWindowClosed);
        require!(amount > 0, GrantError::InvalidAmount);
        require!(receipt_hash.iter().any(|b| *b != 0), GrantError::MissingEvidence);
        grant.claimed = amount;
        grant.receipt_hash = receipt_hash;
        grant.submitted_at = now;
        grant.status = GrantStatus::Submitted;
        emit!(ClaimSubmitted { grant: grant.key(), student: grant.student, amount, receipt_hash });
        Ok(())
    }

    pub fn settle(ctx: Context<Settle>, approved: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let grant = &ctx.accounts.grant;
        require!(grant.status == GrantStatus::Submitted, GrantError::InvalidState);
        require!(now < grant.review_deadline, GrantError::ReviewWindowClosed);
        require!(approved <= grant.cap && approved <= grant.claimed, GrantError::ApprovalExceedsLimit);
        let refund = ctx.accounts.vault.amount.checked_sub(approved).ok_or(GrantError::InsufficientVault)?;
        let id_bytes = grant.grant_id.to_le_bytes();
        let bump = [grant.bump];
        let seeds: &[&[u8]] = &[b"grant", grant.sponsor.as_ref(), &id_bytes, &bump];
        let signer = &[seeds];

        if approved > 0 {
            token::transfer_checked(CpiContext::new(ctx.accounts.token_program.key(), TransferChecked {
                from: ctx.accounts.vault.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.student_token.to_account_info(),
                authority: grant.to_account_info(),
            }).with_signer(signer), approved, DECIMALS)?;
        }
        if refund > 0 {
            token::transfer_checked(CpiContext::new(ctx.accounts.token_program.key(), TransferChecked {
                from: ctx.accounts.vault.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.sponsor_token.to_account_info(),
                authority: grant.to_account_info(),
            }).with_signer(signer), refund, DECIMALS)?;
        }
        // Closing only the empty vault returns its SOL rent to the fixed sponsor.
        // The terminal grant record remains, preventing replay of the grant ID.
        token::close_account(CpiContext::new(ctx.accounts.token_program.key(), CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.sponsor.to_account_info(),
            authority: grant.to_account_info(),
        }).with_signer(signer))?;
        let grant = &mut ctx.accounts.grant;
        grant.approved = approved;
        grant.refunded = refund;
        grant.settled_at = now;
        grant.status = if approved == 0 { GrantStatus::Rejected } else { GrantStatus::Paid };
        emit!(GrantSettled { grant: grant.key(), approved, refunded: refund, status: grant.status });
        Ok(())
    }

    pub fn expire_and_refund(ctx: Context<ExpireAndRefund>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let grant = &ctx.accounts.grant;
        require!(matches!(grant.status, GrantStatus::Funded | GrantStatus::Submitted), GrantError::InvalidState);
        require!(now >= grant.review_deadline, GrantError::RefundTooEarly);
        let refund = ctx.accounts.vault.amount;
        let id_bytes = grant.grant_id.to_le_bytes();
        let bump = [grant.bump];
        let seeds: &[&[u8]] = &[b"grant", grant.sponsor.as_ref(), &id_bytes, &bump];
        let signer = &[seeds];
        if refund > 0 {
            token::transfer_checked(CpiContext::new(ctx.accounts.token_program.key(), TransferChecked {
                from: ctx.accounts.vault.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.sponsor_token.to_account_info(),
                authority: grant.to_account_info(),
            }).with_signer(signer), refund, DECIMALS)?;
        }
        token::close_account(CpiContext::new(ctx.accounts.token_program.key(), CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.sponsor.to_account_info(),
            authority: grant.to_account_info(),
        }).with_signer(signer))?;
        let grant = &mut ctx.accounts.grant;
        grant.approved = 0;
        grant.refunded = refund;
        grant.settled_at = now;
        grant.status = GrantStatus::Expired;
        emit!(GrantSettled { grant: grant.key(), approved: 0, refunded: refund, status: grant.status });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(grant_id: u64)]
pub struct CreateAndFund<'info> {
    #[account(mut)]
    pub sponsor: Signer<'info>,
    pub student: SystemAccount<'info>,
    pub reviewer: SystemAccount<'info>,
    pub mint: Account<'info, Mint>,
    #[account(init, payer = sponsor, space = 8 + Grant::INIT_SPACE,
        seeds = [b"grant", sponsor.key().as_ref(), &grant_id.to_le_bytes()], bump)]
    pub grant: Account<'info, Grant>,
    #[account(init, payer = sponsor, seeds = [b"vault", grant.key().as_ref()], bump,
        token::mint = mint, token::authority = grant)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint, token::authority = sponsor)]
    pub sponsor_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitClaim<'info> {
    pub student: Signer<'info>,
    #[account(mut, has_one = student @ GrantError::Unauthorized,
        seeds = [b"grant", grant.sponsor.as_ref(), &grant.grant_id.to_le_bytes()], bump = grant.bump)]
    pub grant: Account<'info, Grant>,
}

#[derive(Accounts)]
pub struct Settle<'info> {
    pub reviewer: Signer<'info>,
    #[account(mut, has_one = reviewer @ GrantError::Unauthorized, has_one = sponsor, has_one = student, has_one = mint,
        seeds = [b"grant", grant.sponsor.as_ref(), &grant.grant_id.to_le_bytes()], bump = grant.bump)]
    pub grant: Account<'info, Grant>,
    #[account(mut)]
    pub sponsor: SystemAccount<'info>,
    pub student: SystemAccount<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut, seeds = [b"vault", grant.key().as_ref()], bump = grant.vault_bump,
        token::mint = mint, token::authority = grant)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint, token::authority = student)]
    pub student_token: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint, token::authority = sponsor)]
    pub sponsor_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ExpireAndRefund<'info> {
    pub caller: Signer<'info>,
    #[account(mut, has_one = sponsor, has_one = mint,
        seeds = [b"grant", grant.sponsor.as_ref(), &grant.grant_id.to_le_bytes()], bump = grant.bump)]
    pub grant: Account<'info, Grant>,
    #[account(mut)]
    pub sponsor: SystemAccount<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut, seeds = [b"vault", grant.key().as_ref()], bump = grant.vault_bump,
        token::mint = mint, token::authority = grant)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint, token::authority = sponsor)]
    pub sponsor_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct Grant {
    pub grant_id: u64,
    pub sponsor: Pubkey,
    pub student: Pubkey,
    pub reviewer: Pubkey,
    pub mint: Pubkey,
    pub cap: u64,
    pub claimed: u64,
    pub approved: u64,
    pub refunded: u64,
    pub claim_deadline: i64,
    pub review_deadline: i64,
    pub created_at: i64,
    pub submitted_at: i64,
    pub settled_at: i64,
    pub event_hash: [u8; 32],
    pub receipt_hash: [u8; 32],
    pub status: GrantStatus,
    pub bump: u8,
    pub vault_bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum GrantStatus { Funded, Submitted, Paid, Rejected, Expired }

#[event]
pub struct GrantFunded { pub grant: Pubkey, pub sponsor: Pubkey, pub student: Pubkey, pub cap: u64 }
#[event]
pub struct ClaimSubmitted { pub grant: Pubkey, pub student: Pubkey, pub amount: u64, pub receipt_hash: [u8; 32] }
#[event]
pub struct GrantSettled { pub grant: Pubkey, pub approved: u64, pub refunded: u64, pub status: GrantStatus }

#[error_code]
pub enum GrantError {
    #[msg("Amount must be positive.")] InvalidAmount,
    #[msg("Claim and review deadlines must be ordered, future dates within 90 days.")] InvalidDeadlines,
    #[msg("This instruction is unavailable in the current grant state.")] InvalidState,
    #[msg("Only the designated wallet may take this action.")] Unauthorized,
    #[msg("The claim deadline has passed.")] ClaimWindowClosed,
    #[msg("The review deadline has passed; refund is now available.")] ReviewWindowClosed,
    #[msg("Approval exceeds the claim or the reserved budget.")] ApprovalExceedsLimit,
    #[msg("The review deadline has not passed.")] RefundTooEarly,
    #[msg("A nonzero evidence commitment is required.")] MissingEvidence,
    #[msg("Unsupported mint or token precision.")] UnsupportedMint,
    #[msg("Sponsor, student and reviewer must be three distinct wallets.")] DistinctRolesRequired,
    #[msg("The vault cannot cover this payment.")] InsufficientVault,
    #[msg("Arithmetic overflow.")] Arithmetic,
}
