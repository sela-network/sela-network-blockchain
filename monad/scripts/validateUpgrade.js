const { ethers, upgrades } = require("hardhat");

/**
 * Validate that a new implementation is compatible with the current proxy
 * This script should be run BEFORE actually upgrading
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Validating upgrade with account:", deployer.address);

  // IMPORTANT: Replace with your actual proxy address
  const PROXY_ADDRESS = process.env.SELA_POWER_PROXY_ADDRESS || "YOUR_PROXY_ADDRESS_HERE";

  if (PROXY_ADDRESS === "YOUR_PROXY_ADDRESS_HERE") {
    console.error("\n❌ Error: Please set SELA_POWER_PROXY_ADDRESS environment variable");
    console.log("Usage: SELA_POWER_PROXY_ADDRESS=0x... npx hardhat run scripts/validateUpgrade.js");
    process.exit(1);
  }

  console.log("\n=== Validating SelaPower Upgrade ===");
  console.log("Proxy address:", PROXY_ADDRESS);

  try {
    // Get current implementation
    const currentImplementation = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
    console.log("Current implementation:", currentImplementation);

    // Get the new contract factory
    const SelaPowerV2 = await ethers.getContractFactory("SelaPower");

    // Validate upgrade compatibility
    console.log("\nValidating upgrade compatibility...");
    await upgrades.validateUpgrade(PROXY_ADDRESS, SelaPowerV2, {
      kind: "uups",
    });

    console.log("\n✅ Upgrade validation PASSED!");
    console.log("\nThe new implementation is compatible with the current proxy.");
    console.log("You can proceed with the upgrade using:");
    console.log("  SELA_POWER_PROXY_ADDRESS=" + PROXY_ADDRESS + " npx hardhat run scripts/upgradeSelaPower.js");
  } catch (error) {
    console.error("\n❌ Upgrade validation FAILED!");
    console.error("\nError details:", error.message);
    console.error("\n⚠️  DO NOT proceed with the upgrade!");
    console.error("Fix the storage layout issues before upgrading.");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error occurred during validation:", error);
    process.exit(1);
  });

