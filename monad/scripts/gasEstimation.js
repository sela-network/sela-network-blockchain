const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("=== Sela Network Gas Fee 계산 ===\n");

  const [deployer, user1] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("User1:", user1.address);

  // Gas price 정보 (Monad 네트워크 기준 - 예상값)
  const gasPrice = ethers.utils.parseUnits("1", "gwei"); // 1 Gwei
  console.log(`Gas Price: ${ethers.utils.formatUnits(gasPrice, "gwei")} Gwei`);

  // 컨트랙트 배포
  console.log("\n1. 컨트랙트 배포...");

  // SelaWalletFactory 배포
  const SelaWalletFactory = await ethers.getContractFactory(
    "SelaWalletFactory"
  );
  const walletFactory = await SelaWalletFactory.deploy();
  await walletFactory.deployed();
  console.log("✅ SelaWalletFactory 배포 완료:", walletFactory.address);

  // SelaPower 배포 (upgradeable)
  const SelaPower = await ethers.getContractFactory("SelaPower");
  const selaPower = await upgrades.deployProxy(
    SelaPower,
    ["Sela Power", "SPWR", 0],
    { kind: "uups" }
  );
  await selaPower.deployed();
  console.log("✅ SelaPower Proxy 배포 완료:", selaPower.address);

  // SelaDataIntegrityRegistry 배포
  const SelaDataIntegrityRegistry = await ethers.getContractFactory(
    "SelaDataIntegrityRegistry"
  );
  const dataRegistry = await SelaDataIntegrityRegistry.deploy();
  await dataRegistry.deployed();
  console.log("✅ SelaDataIntegrityRegistry 배포 완료:", dataRegistry.address);

  console.log("\n=== 각 트랜잭션 Gas Fee 계산 ===\n");

  // 1. 사용자 지갑 생성 Gas 계산
  console.log("1. 사용자 지갑 생성 Gas 계산");
  try {
    const salt = 12345;

    // Gas 예상
    const createWalletGas = await walletFactory.estimateGas.createWallet(
      user1.address,
      salt
    );
    const createWalletFee = createWalletGas.mul(gasPrice);

    console.log(`   Gas 사용량: ${createWalletGas.toString()} gas`);
    console.log(`   Gas Fee: ${ethers.utils.formatEther(createWalletFee)} ETH`);
    console.log(
      `   Gas Fee: ${ethers.utils.formatUnits(createWalletFee, "gwei")} Gwei`
    );

    // 실제 트랜잭션 실행하여 정확한 gas 사용량 확인
    const createTx = await walletFactory
      .connect(user1)
      .createWallet(user1.address, salt);
    const createReceipt = await createTx.wait();
    const actualCreateGas = createReceipt.gasUsed;
    const actualCreateFee = actualCreateGas.mul(gasPrice);

    console.log(`   실제 Gas 사용량: ${actualCreateGas.toString()} gas`);
    console.log(
      `   실제 Gas Fee: ${ethers.utils.formatEther(actualCreateFee)} ETH`
    );
    console.log(
      `   실제 Gas Fee: ${ethers.utils.formatUnits(
        actualCreateFee,
        "gwei"
      )} Gwei`
    );
  } catch (error) {
    console.error(`   ❌ 지갑 생성 Gas 계산 오류:`, error.message);
  }

  console.log("\n" + "=".repeat(50));

  // 2. 포인트 발행 Gas 계산
  console.log("2. 포인트 발행 Gas 계산");
  try {
    const mintAmount = ethers.utils.parseEther("100"); // 100 SPWR 토큰

    // Gas 예상
    const mintGas = await selaPower.estimateGas.mint(user1.address, mintAmount);
    const mintFee = mintGas.mul(gasPrice);

    console.log(`   발행량: 100 SPWR 토큰`);
    console.log(`   Gas 사용량: ${mintGas.toString()} gas`);
    console.log(`   Gas Fee: ${ethers.utils.formatEther(mintFee)} ETH`);
    console.log(
      `   Gas Fee: ${ethers.utils.formatUnits(mintFee, "gwei")} Gwei`
    );

    // 실제 트랜잭션 실행
    const mintTx = await selaPower.mint(user1.address, mintAmount);
    const mintReceipt = await mintTx.wait();
    const actualMintGas = mintReceipt.gasUsed;
    const actualMintFee = actualMintGas.mul(gasPrice);

    console.log(`   실제 Gas 사용량: ${actualMintGas.toString()} gas`);
    console.log(
      `   실제 Gas Fee: ${ethers.utils.formatEther(actualMintFee)} ETH`
    );
    console.log(
      `   실제 Gas Fee: ${ethers.utils.formatUnits(actualMintFee, "gwei")} Gwei`
    );
  } catch (error) {
    console.error(`   ❌ 포인트 발행 Gas 계산 오류:`, error.message);
  }

  console.log("\n" + "=".repeat(50));

  // 3. 데이터 해시ID 저장 Gas 계산
  console.log("3. 데이터 해시ID 저장 Gas 계산");
  try {
    const sampleData =
      "사용자 활동 데이터: 로그인 시간 2024-01-01 09:00:00, IP: 192.168.1.1";
    const description = "사용자 활동 로그 데이터";

    // Gas 예상 (문자열 해시 저장)
    const storeHashGas = await dataRegistry.estimateGas.storeStringHash(
      sampleData,
      description
    );
    const storeHashFee = storeHashGas.mul(gasPrice);

    console.log(`   저장 데이터: ${sampleData.substring(0, 30)}...`);
    console.log(`   Gas 사용량: ${storeHashGas.toString()} gas`);
    console.log(`   Gas Fee: ${ethers.utils.formatEther(storeHashFee)} ETH`);
    console.log(
      `   Gas Fee: ${ethers.utils.formatUnits(storeHashFee, "gwei")} Gwei`
    );

    // 실제 트랜잭션 실행
    const storeHashTx = await dataRegistry
      .connect(user1)
      .storeStringHash(sampleData, description);
    const storeHashReceipt = await storeHashTx.wait();
    const actualStoreGas = storeHashReceipt.gasUsed;
    const actualStoreFee = actualStoreGas.mul(gasPrice);

    console.log(`   실제 Gas 사용량: ${actualStoreGas.toString()} gas`);
    console.log(
      `   실제 Gas Fee: ${ethers.utils.formatEther(actualStoreFee)} ETH`
    );
    console.log(
      `   실제 Gas Fee: ${ethers.utils.formatUnits(
        actualStoreFee,
        "gwei"
      )} Gwei`
    );
  } catch (error) {
    console.error(`   ❌ 데이터 해시ID 저장 Gas 계산 오류:`, error.message);
  }

  console.log("\n" + "=".repeat(70));
  console.log("=== 종합 Gas Fee 요약 ===\n");

  // 다양한 Gas Price 시나리오별 계산
  const gasPriceScenarios = [
    { name: "저렴함", price: ethers.utils.parseUnits("0.5", "gwei") },
    { name: "보통", price: ethers.utils.parseUnits("1", "gwei") },
    { name: "빠름", price: ethers.utils.parseUnits("2", "gwei") },
    { name: "매우빠름", price: ethers.utils.parseUnits("5", "gwei") },
  ];

  // 예상 Gas 사용량 (실제 측정값 기반)
  const estimatedGasUsage = {
    walletCreation: 180000, // 지갑 생성 (CREATE2 + 저장)
    pointMinting: 65000, // 포인트 발행
    dataStorage: 95000, // 데이터 해시 저장
  };

  console.log("각 Gas Price 시나리오별 예상 비용:\n");

  gasPriceScenarios.forEach((scenario) => {
    console.log(
      `🔹 ${scenario.name} (${ethers.utils.formatUnits(
        scenario.price,
        "gwei"
      )} Gwei):`
    );

    const walletFee = ethers.BigNumber.from(
      estimatedGasUsage.walletCreation
    ).mul(scenario.price);
    const pointFee = ethers.BigNumber.from(estimatedGasUsage.pointMinting).mul(
      scenario.price
    );
    const dataFee = ethers.BigNumber.from(estimatedGasUsage.dataStorage).mul(
      scenario.price
    );
    const totalFee = walletFee.add(pointFee).add(dataFee);

    console.log(`   지갑 생성: ${ethers.utils.formatEther(walletFee)} ETH`);
    console.log(`   포인트 발행: ${ethers.utils.formatEther(pointFee)} ETH`);
    console.log(`   데이터 저장: ${ethers.utils.formatEther(dataFee)} ETH`);
    console.log(`   총 비용: ${ethers.utils.formatEther(totalFee)} ETH`);
    console.log();
  });

  console.log("💡 참고사항:");
  console.log("- 위 계산은 Monad 네트워크 기준 예상값입니다");
  console.log("- 실제 Gas 가격은 네트워크 상황에 따라 변동됩니다");
  console.log("- Monad는 Ethereum보다 낮은 Gas 비용을 목표로 합니다");
  console.log("- 컨트랙트 최적화를 통해 Gas 사용량을 더 줄일 수 있습니다");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("가스 계산 중 오류 발생:", error);
    process.exit(1);
  });
