const { ethers } = require("hardhat");

async function main() {
  const factory = await ethers.getContractFactory("MyContract");
  const contract = await factory.deploy("Hello HanChain!");
  await contract.waitForDeployment();
  console.log("Contract deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
