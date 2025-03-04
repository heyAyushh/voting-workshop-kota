import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BankrunProvider, startAnchor } from "anchor-bankrun";
import { Voting } from "../target/types/voting";

const IDL = require("../target/idl/voting.json");
const PROGRAM_ID = new PublicKey(IDL.address);

describe("Voting", () => {
  let context;
  let provider;
  let votingProgram: anchor.Program<Voting>;

  beforeAll(async () => {
    context = await startAnchor('', [{ name: "voting", programId: PROGRAM_ID }], []);
    provider = new BankrunProvider(context);
    votingProgram = new anchor.Program<Voting>(
      IDL,
      provider,
    );
  });

  it("initializes a poll", async () => {
    await votingProgram.methods.initializePoll(
      new anchor.BN(1),
      "What is your favorite color?",
      new anchor.BN(100),
      new anchor.BN(1739370789),
    ).rpc();

    const [pollAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
      votingProgram.programId,
    );

    const poll = await votingProgram.account.poll.fetch(pollAddress);

    console.log(poll);

    expect(poll.pollId.toNumber()).toBe(1);
    expect(poll.description).toBe("What is your favorite color?");
    expect(poll.pollStart.toNumber()).toBe(100);
  });

  it("initializes candidates", async () => {
    await votingProgram.methods.initializeCandidate(
      "Pink",
      new anchor.BN(1),
    ).rpc();
    await votingProgram.methods.initializeCandidate(
      "Blue",
      new anchor.BN(1),
    ).rpc();

    const [pinkAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, "le", 8), Buffer.from("Pink")],
      votingProgram.programId,
    );
    const pinkCandidate = await votingProgram.account.candidate.fetch(pinkAddress);
    console.log(pinkCandidate);
    expect(pinkCandidate.candidateVotes.toNumber()).toBe(0);
    expect(pinkCandidate.candidateName).toBe("Pink");

    const [blueAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, "le", 8), Buffer.from("Blue")],
      votingProgram.programId,
    );
    const blueCandidate = await votingProgram.account.candidate.fetch(blueAddress);
    console.log(blueCandidate);
    expect(blueCandidate.candidateVotes.toNumber()).toBe(0);
    expect(blueCandidate.candidateName).toBe("Blue");
  });

  it("vote candidates", async () => {
    await votingProgram.methods.vote(
      "Pink",
      new anchor.BN(1),
    ).rpc();
    await votingProgram.methods.vote(
      "Blue",
      new anchor.BN(1),
    ).rpc();
    await votingProgram.methods.vote(
      "Pink",
      new anchor.BN(1),
    ).rpc();

    const [pinkAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, "le", 8), Buffer.from("Pink")],
      votingProgram.programId,
    );
    const pinkCandidate = await votingProgram.account.candidate.fetch(pinkAddress);
    console.log(pinkCandidate);
    expect(pinkCandidate.candidateVotes.toNumber()).toBe(2);
    expect(pinkCandidate.candidateName).toBe("Pink");

    const [blueAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, "le", 8), Buffer.from("Blue")],
      votingProgram.programId,
    );
    const blueCandidate = await votingProgram.account.candidate.fetch(blueAddress);
    console.log(blueCandidate);
    expect(blueCandidate.candidateVotes.toNumber()).toBe(1);
    expect(blueCandidate.candidateName).toBe("Blue");
  });
  it("Fails to create a poll with an expired poll_end timestamp", async () => {
    try {
        await program.methods.initializePoll(
            new anchor.BN(1),
            "Expired Poll",
            new anchor.BN(1700000000), // Some past timestamp
            new anchor.BN(1700000100)  // Expired timestamp
        )
        .accounts({
            poll: poll.publicKey,
            signer: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId
        })
        .signers([poll])
        .rpc();
    } catch (err) {
        assert.include(err.message, "The poll_end timestamp must be in the future");
        return;
    }
    assert.fail("Poll creation should have failed with expired poll_end timestamp");
});

it("Fails to create a poll with an invalid Unix timestamp", async () => {
    try {
        await program.methods.initializePoll(
            new anchor.BN(2),
            "Invalid Timestamp Poll",
            new anchor.BN(1700000000), 
            new anchor.BN(99999)  // Invalid timestamp (not a real Unix timestamp)
        )
        .accounts({
            poll: poll.publicKey,
            signer: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId
        })
        .signers([poll])
        .rpc();
    } catch (err) {
        assert.include(err.message, "Invalid Unix Timestamp provided");
        return;
    }
    assert.fail("Poll creation should have failed with invalid poll_end timestamp");
});

it("Successfully creates a poll with a valid future poll_end timestamp", async () => {
    try {
        const tx = await program.methods.initializePoll(
            new anchor.BN(3),
            "Valid Poll",
            new anchor.BN(1700000000), 
            new anchor.BN(Math.floor(Date.now() / 1000) + 3600) // Current time + 1 hour
        )
        .accounts({
            poll: poll.publicKey,
            signer: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId
        })
        .signers([poll])
        .rpc();

        console.log("Poll created successfully, Transaction:", tx);
    } catch (err) {
        assert.fail("Poll creation should have succeeded with a valid timestamp");
    }
});

});