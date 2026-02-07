import { ethers } from "hardhat";

async function main() {
  // CONFIGURATION - This is the address of the deployed Sonar contract (Lumiscan Core)
  const LUMISCAN_CORE = "0x85Ddd99FbA862e6d61382C112F39b8705aF12eb2"; 

  console.log("Deploying IRIS...");

  const Iris = await ethers.getContractFactory("Iris");
  const iris = await Iris.deploy(LUMISCAN_CORE);

  await iris.waitForDeployment();

  const address = await iris.getAddress();
  console.log("IRIS Deployed to:", address);
  console.log("Sentinel connected to:", LUMISCAN_CORE);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});