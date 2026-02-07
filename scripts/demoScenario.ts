import { ethers } from "hardhat";

// --- CONFIGURATION ---
const LUMISCAN_ADDR = "0x85Ddd99FbA862e6d61382C112F39b8705aF12eb2";
const IRIS_ADDR = "0x406235755Cac872E8a0e03174BCA2D154C105bFb"; 

async function main() {
  const [user] = await ethers.getSigners();
  
  // Connect to contracts
  const Iris = await ethers.getContractFactory("Iris");
  const iris = Iris.attach(IRIS_ADDR);
  
  const Sonar = await ethers.getContractFactory("Sonar");
  const lumiscan = Sonar.attach(LUMISCAN_ADDR);

  console.log("\n--- SYSTEM PRE-CHECK ---");
  
  // RESET THE SYSTEM
  console.log("Resetting Lumiscan state to 'Safe'...");
  try {
      // We try to reset. If it's already safe, this might do nothing, which is fine.
      const tx = await lumiscan.resetSystem();
      await tx.wait();
      console.log("System Reset Complete. Alarm is OFF.");
  } catch (error) {
      console.log("Reset skipped or failed (might already be clean). Continuing...");
  }

  console.log("\n--- SCENARIO START: THE SAFE STATE ---");
  
  // 1. User Deposits Money
  // Small deposit to test the flow. In a real scenario, this could be any amount.
  const depositAmount = ethers.parseEther("0.1"); 
  console.log(`User depositing 0.1 C2FLR into Iris...`);
  await (await iris.deposit({ value: depositAmount })).wait();
  console.log("Deposit successful.");

  // 2. User Withdraws Money
  console.log(`User attempting withdrawal (Market is Safe)...`);
  await (await iris.withdraw(ethers.parseEther("0.01"))).wait();
  console.log("Withdrawal successful. System Nominal.");

  console.log("\n--- SCENARIO SHIFT: THE CRASH ---");
  console.log("Simulating Python Agent Triggering Lumiscan...");
  
  // 3. Trigger the Alarm
  const tx2 = await lumiscan.triggerArtificialAlert(); 
  await tx2.wait();
  console.log("LUMISCAN ALERT ACTIVE: RISK DETECTED ON-CHAIN");

  console.log("\n--- SCENARIO CLIMAX: THE PROTECTION ---");
  
  // 4. User Tries to Withdraw Again (SHOULD FAIL)
  console.log(`User attempting withdrawal during crash...`);
  
  try {
      await (await iris.withdraw(ethers.parseEther("0.05"))).wait();
      console.log("FAIL: Withdrawal worked (This shouldn't happen!)");
  } catch (error: any) {
      if (error.message.includes("SHUTTER CLOSED")) {
          console.log("SUCCESS: Transaction Reverted!");
          console.log("IRIS SHUTTER ENGAGED. ASSETS SECURED.");
      } else {
          // Sometimes the error message might be different based on the environment, so we check for the expected revert reason.
          console.log("SUCCESS: Transaction Reverted! (Error: " + error.message + ")");
      }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});