#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod voting {
    use super::*;

    pub fn initialize_poll(
        ctx: Context<InitializePoll>,
        poll_id: u64,
        description: String,
        poll_start: u64,
        poll_end: u64,
    ) -> Result<()> {
        let current_timestamp = Clock::get()?.unix_timestamp as u64;

        if poll_end <= current_timestamp {
            return Err(error!(PollError::PollEndInThePast));
        }

        if poll_end == 0 {
            return Err(error!(PollError::InvalidPollEndTimestamp));
        }

        let poll = &mut ctx.accounts.poll;
        poll.poll_id = poll_id;
        poll.description = description;
        poll.poll_start = poll_start;
        poll.poll_end = poll_end;
        poll.candidate_amount = 0;
        poll.total_votes = 0;
        poll.voters = Vec::new();

        Ok(())
    }

    pub fn initialize_candidate(
        ctx: Context<InitializeCandidate>,
        candidate_name: String,
        _poll_id: u64,
    ) -> Result<()> {
        let candidate = &mut ctx.accounts.candidate;
        let poll = &mut ctx.accounts.poll;

        candidate.candidate_name = candidate_name;
        candidate.candidate_votes = 0;

        poll.candidate_amount += 1;

        Ok(())
    }

    pub fn vote(
        ctx: Context<Vote>,
        _candidate_name: String,
        _poll_id: u64,
    ) -> Result<()> {
        let current_timestamp = Clock::get()?.unix_timestamp as u64;
        let poll = &mut ctx.accounts.poll;
        let candidate = &mut ctx.accounts.candidate;
        let voter_key = ctx.accounts.signer.key();

        if poll.voters.contains(&voter_key) {
            return Err(error!(ErrorCode::AlreadyVoted));
        }

        if current_timestamp < poll.poll_start || current_timestamp > poll.poll_end {
            return Err(error!(ErrorCode::InvalidVoteTime));
        }

        poll.voters.push(voter_key);
        candidate.candidate_votes += 1;
        poll.total_votes += 1;

        msg!("Voted for candidate: {}", candidate.candidate_name);
        msg!("Total votes for {}: {}", candidate.candidate_name, candidate.candidate_votes);

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct InitializePoll<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = 8 + Poll::INIT_SPACE,
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, Poll>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(poll_id: u64, candidate_name: String)]
pub struct InitializeCandidate<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, Poll>,
    #[account(
        init,
        payer = signer,
        space = 8 + Candidate::INIT_SPACE,
        seeds = [poll_id.to_le_bytes().as_ref(), candidate_name.as_ref()],
        bump
    )]
    pub candidate: Account<'info, Candidate>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(poll_id: u64, candidate_name: String)]
pub struct Vote<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [poll_id.to_le_bytes().as_ref()],
        bump
    )]
    pub poll: Account<'info, Poll>,
    #[account(
        mut,
        seeds = [poll_id.to_le_bytes().as_ref(), candidate_name.as_ref()],
        bump
    )]
    pub candidate: Account<'info, Candidate>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Poll {
    pub poll_id: u64,
    pub description: String,
    pub poll_start: u64,
    pub poll_end: u64,
    pub candidate_amount: u64,
    pub total_votes: u64,
    pub voters: Vec<Pubkey>,
}

impl Poll {
    pub const INIT_SPACE: usize = 
        8 + // Discriminator
        8 + // poll_id
        4 + 200 + // description (String max 200 bytes + prefix)
        8 + // poll_start
        8 + // poll_end
        8 + // candidate_amount
        8 + // total_votes
        4 + (1000 * 32); // voters vec (assuming up to 1000 voters)
}

#[account]
pub struct Candidate {
    pub candidate_name: String,
    pub candidate_votes: u64,
}

impl Candidate {
    pub const INIT_SPACE: usize =
        4 + 32 + // candidate_name (String max 32 bytes + prefix)
        8; // candidate_votes
}

#[error_code]
pub enum ErrorCode {
    #[msg("You have already voted.")]
    AlreadyVoted,
    #[msg("Voting is not allowed at this time.")]
    InvalidVoteTime,
}

#[error_code]
pub enum PollError {
    #[msg("Poll end timestamp must be in the future.")]
    PollEndInThePast,
    #[msg("Poll end timestamp is invalid.")]
    InvalidPollEndTimestamp,
}
