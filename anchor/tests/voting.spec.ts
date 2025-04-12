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
  it("should fail if poll_end is in the past", async () => {
    const currentTime = new Date().getTime() / 1000; 
    const pollEndInPast = new anchor.BN(currentTime - 1000); 

    try {
        await votingProgram.methods
            .initializePoll(
                new anchor.BN(1),
                "What is your favorite color?",
                new anchor.BN(100),
                pollEndInPast
            )
            .rpc();
        throw new Error("Poll should not be created with poll_end in the past.");
    } catch (err) {
        console.log("Error:", err.message);
        expect(err.message).toContain("Poll end time must be in the future.");
    }
});

it("should fail if poll_end is not a valid Unix timestamp", async () => {
    const invalidPollEnd = new anchor.BN(0); 

    try {
        await votingProgram.methods
            .initializePoll(
                new anchor.BN(1),
                "What is your favorite color?",
                new anchor.BN(100),
                invalidPollEnd
            )
            .rpc();
        throw new Error("Poll should not be created with an invalid poll_end timestamp.");
    } catch (err) {
        console.log("Error:", err.message);
        expect(err.message).toContain("Invalid poll end timestamp.");
    }
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
        new anchor.BN(200),
      ).rpc();
  
      const [pollAddress] = PublicKey.findProgramAddressSync(
        [new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
        votingProgram.programId,
      );
  
      const poll = await votingProgram.account.poll.fetch(pollAddress);
  
      expect(poll.pollId.toNumber()).toBe(1);
      expect(poll.description).toBe("What is your favorite color?");
      expect(poll.pollStart.toNumber()).toBe(100);
      expect(poll.pollEnd.toNumber()).toBe(200);
    });
  
    it("rejects vote before poll starts", async () => {
      try {
        await votingProgram.methods.vote(
          "Pink",
          new anchor.BN(1),
        ).rpc();
      } catch (err) {
        expect(err.message).toContain("The poll has not started yet.");
      }
    });
  
    it("accepts vote within poll start and end", async () => {
      await votingProgram.methods.initializeCandidate(
        "Pink",
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
      expect(pinkCandidate.candidateVotes.toNumber()).toBe(1);
    });
  
    it("rejects vote after poll ends", async () => {
      try {
        await votingProgram.methods.vote(
          "Pink",
          new anchor.BN(1),
        ).rpc();
      } catch (err) {
        expect(err.message).toContain("The poll has already ended.");
      }
    });
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
});
it("updates candidate count in poll", async () => {
  await votingProgram.methods.initializeCandidate(
    "Green",
    new anchor.BN(1),
  ).rpc();

  const [pollAddress] = PublicKey.findProgramAddressSync(
    [new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
    votingProgram.programId,
  );

  const poll = await votingProgram.account.poll.fetch(pollAddress);
  console.log("Candidate count:", poll.candidateAmount.toNumber());
  expect(poll.candidateAmount.toNumber()).toBe(3); // Assuming 2 candidates already existed
});
