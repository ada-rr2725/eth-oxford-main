import { ethers } from "hardhat";

async function main() {
    console.log("Deploying Sonar...");

    // DEPLOY THE SONAR CONTRACT (Lumiscan Core)
    const Sonar = await ethers.getContractFactory("Sonar");
    const sonar = await Sonar.deploy();

    await sonar.waitForDeployment();

    const address = await sonar.getAddress();
    console.log("Sonar Deployed to:", address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
