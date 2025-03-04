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
