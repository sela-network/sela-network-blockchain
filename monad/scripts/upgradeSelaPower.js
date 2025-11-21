const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Upgrading SelaPower contract with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.utils.formatEther(await deployer.getBalance())
  );

  // IMPORTANT: Replace with your actual proxy address
  const PROXY_ADDRESS = process.env.SELA_POWER_PROXY_ADDRESS || "YOUR_PROXY_ADDRESS_HERE";

  if (PROXY_ADDRESS === "YOUR_PROXY_ADDRESS_HERE") {
    console.error("\n❌ Error: Please set SELA_POWER_PROXY_ADDRESS environment variable");
    console.log("Usage: SELA_POWER_PROXY_ADDRESS=0x... npx hardhat run scripts/upgradeSelaPower.js");
    process.exit(1);
  }

  console.log("\n=== Upgrading SelaPower contract... ===");
  console.log("Proxy address:", PROXY_ADDRESS);

  // Get current implementation
  const currentImplementation = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
  console.log("Current implementation:", currentImplementation);

  // Get the new contract factory
  const SelaPowerV2 = await ethers.getContractFactory("SelaPower");

  // Validate upgrade
  console.log("\nValidating upgrade...");
  await upgrades.validateUpgrade(PROXY_ADDRESS, SelaPowerV2);
  console.log("✅ Upgrade validation passed");

  // Perform upgrade
  console.log("\nUpgrading contract...");
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, SelaPowerV2);
  await upgraded.deployed();

  // Get new implementation address
  const newImplementation = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
  console.log("\n=== Upgrade Completed ===");
  console.log("Proxy address (unchanged):", PROXY_ADDRESS);
  console.log("Old implementation:", currentImplementation);
  console.log("New implementation:", newImplementation);

  // Verify contract state is preserved
  console.log("\n=== Verifying Contract State ===");
  const name = await upgraded.name();
  const symbol = await upgraded.symbol();
  const totalSupply = await upgraded.totalSupply();
  const version = await upgraded.version();

  console.log("Token name:", name);
  console.log("Token symbol:", symbol);
  console.log("Total supply:", ethers.utils.formatEther(totalSupply), "SPWR");
  console.log("Contract version:", version);

  // Check owner
  const owner = await upgraded.owner();
  console.log("Contract owner:", owner);
  console.log("Deployer:", deployer.address);
  console.log("Owner matches deployer:", owner === deployer.address);

  console.log("\n✅ Upgrade successful!");
  console.log("\n💡 Important:");
  console.log("- Proxy address remains the same");
  console.log("- All existing token balances are preserved");
  console.log("- Users don't need to do anything");
  console.log("- Update your frontend/backend to use the new ABI if functions changed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error occurred during upgrade:", error);
    process.exit(1);
  });

