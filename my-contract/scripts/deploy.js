const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment...");
  
  const factory = await ethers.getContractFactory("JetCVNFT");
  console.log("📋 Contract factory created");
  
  // Estimate gas first
  const deploymentData = factory.interface.encodeDeploy();
  const gasEstimate = await ethers.provider.estimateGas({
    data: deploymentData
  });
  console.log("⛽ Gas estimate:", gasEstimate.toString());
  
  // Deploy with much higher gas limit
  const gasLimit = 2000000n; // 2M gas limit
  const contract = await factory.deploy({
    gasLimit: gasLimit
  });
  
  console.log("📦 Contract deployment transaction sent...");
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("✅ JetCVNFT deployed to:", address);
  
  // Verify the deployment
  console.log("📋 Contract name:", await contract.name());
  console.log("🏷️ Contract symbol:", await contract.symbol());
  console.log("📌 Contract version:", await contract.CONTRACT_VERSION());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
