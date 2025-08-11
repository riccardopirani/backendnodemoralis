const hre = require("hardhat");

async function main() {
  const C = await hre.ethers.getContractFactory("JETCV");
  const c = await C.deploy();
  await c.waitForDeployment();
  const address = await c.getAddress();
  console.log("JETCV deployed at:", address);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
