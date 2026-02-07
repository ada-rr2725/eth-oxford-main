import { ethers } from "hardhat";

async function main() {
  const [user] = await ethers.getSigners();
  console.log("TESTING WITH ACCOUNT:", user.address);

  // --- DEPLOY CONTRACTS ---
  console.log("\n--- DEPLOYING SYSTEM ---");
  
  // deploy Sonar
  const Sonar = await ethers.getContractFactory("Sonar");
  const lumiscan = await Sonar.deploy();
  await lumiscan.waitForDeployment();
  const sonarAddr = await lumiscan.getAddress();
  console.log("Sonar Deployed to:", sonarAddr);

  // deploy Iris - Connected to Sonar
  const Iris = await ethers.getContractFactory("Iris");
  const iris = await Iris.deploy(sonarAddr);
  await iris.waitForDeployment();
  const irisAddr = await iris.getAddress();
  console.log("Iris Deployed to:", irisAddr);


  // --- THE SCENARIO ---
  console.log("\n--- SCENARIO START: THE SAFE STATE ---");
  
  // user deposits money
  const depositAmount = ethers.parseEther("1.0"); 
  console.log(`User depositing 1.0 FLR into Iris...`);
  await (await iris.deposit({ value: depositAmount })).wait();
  console.log("Deposit successful.");

  // user withdraws money
  console.log(`User attempting withdrawal (Market is Safe)...`);
  await (await iris.withdraw(ethers.parseEther("0.1"))).wait();
  console.log("Withdrawal successful. System Nominal.");


  console.log("\n--- SCENARIO SHIFT: THE CRASH ---");
  console.log("Simulating FDC Triggering Lumiscan Risk State...");
  
  // trigger alarm
  const tx2 = await lumiscan.triggerArtificialAlert(); 
  await tx2.wait();
  
  // verify state
  const isRisk = await lumiscan.isRiskDetected();
  console.log(`LUMISCAN ALERT STATUS: ${isRisk} (RISK DETECTED)`);


  console.log("\n--- SCENARIO CLIMAX: THE PROTECTION ---");
  
  // user try withdraw again (SHOULD FAIL)
  console.log(`User attempting withdrawal during crash...`);
  
  try {
      // try to withdraw 0.5 FLR
      await (await iris.withdraw(ethers.parseEther("0.5"))).wait();
      
      // if here, the protection FAILED
      console.log("\nFAIL: Withdrawal worked (The Iris did NOT close!)");
      process.exit(1); 
      
  } catch (error: any) {
      // expect an error
      if (error.message.includes("SHUTTER CLOSED") || error.message.includes("revert")) {
          console.log("\nSUCCESS: Transaction Reverted!");
          console.log("   REASON: IRIS SHUTTER CLOSED // ASSETS SECURED");
      } else {
          console.log("\nSUCCESS? (Transaction failed, but check error message):");
          console.log(error.message);
      }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});