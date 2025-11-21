const { ethers } = require("hardhat");

/**
 * SelaPower 컨트랙트의 현재 버전과 상태를 확인하는 스크립트
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Checking SelaPower contract with account:", deployer.address);

  // 프록시 주소 가져오기
  const PROXY_ADDRESS = process.env.SELA_POWER_PROXY_ADDRESS;

  if (!PROXY_ADDRESS || PROXY_ADDRESS === "YOUR_PROXY_ADDRESS_HERE") {
    console.error("\n❌ Error: Please set SELA_POWER_PROXY_ADDRESS environment variable");
    console.log("Usage: SELA_POWER_PROXY_ADDRESS=0x... npx hardhat run scripts/checkVersion.js");
    process.exit(1);
  }

  console.log("\n=== SelaPower Contract Information ===");
  console.log("Proxy address:", PROXY_ADDRESS);

  try {
    // 컨트랙트 인스턴스 가져오기
    const selaPower = await ethers.getContractAt("SelaPower", PROXY_ADDRESS);

    // 기본 정보
    const name = await selaPower.name();
    const symbol = await selaPower.symbol();
    const decimals = await selaPower.decimals();
    const totalSupply = await selaPower.totalSupply();
    const version = await selaPower.version();
    const owner = await selaPower.owner();
    const paused = await selaPower.paused();

    console.log("\n📋 Basic Information:");
    console.log("  Token name:", name);
    console.log("  Token symbol:", symbol);
    console.log("  Decimals:", decimals);
    console.log("  Total supply:", ethers.formatEther(totalSupply), symbol);
    console.log("  Contract version:", version);
    console.log("  Owner:", owner);
    console.log("  Paused:", paused);

    // 프록시 정보
    const { upgrades } = require("hardhat");
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
    const adminAddress = await upgrades.erc1967.getAdminAddress(PROXY_ADDRESS);

    console.log("\n🔧 Proxy Information:");
    console.log("  Implementation address:", implementationAddress);
    console.log("  Admin address:", adminAddress);

    // 권한 확인
    const isDeployerMinter = await selaPower.isMinter(deployer.address);
    const isDeployerBurner = await selaPower.isBurner(deployer.address);

    console.log("\n👤 Deployer Permissions:");
    console.log("  Is minter:", isDeployerMinter);
    console.log("  Is burner:", isDeployerBurner);
    console.log("  Is owner:", owner === deployer.address);

    // v2.0.0 이상의 기능 확인
    try {
      const hasLockFunction = typeof selaPower.lockAccount === 'function';
      console.log("\n✨ Advanced Features:");
      console.log("  Lock account feature:", hasLockFunction ? "Available (v2.0.0+)" : "Not available");
      
      if (hasLockFunction) {
        // 테스트 주소로 잠금 상태 확인 (존재하지 않는 주소)
        const testAddress = "0x0000000000000000000000000000000000000001";
        const isLocked = await selaPower.isLocked(testAddress);
        console.log("  Lock feature working:", isLocked !== undefined);
      }
    } catch (error) {
      console.log("\n✨ Advanced Features:");
      console.log("  Lock account feature: Not available");
    }

    // 네트워크 정보
    const network = await ethers.provider.getNetwork();
    console.log("\n🌐 Network Information:");
    console.log("  Network name:", network.name);
    console.log("  Chain ID:", network.chainId);

    console.log("\n✅ Contract check completed successfully!");

  } catch (error) {
    console.error("\n❌ Error occurred:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error occurred:", error);
    process.exit(1);
  });

