const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("=== Sela Network 함수 호출 Gas Fee 계산 ===\n");

  const [deployer, user1, user2] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("User1:", user1.address);

  // Gas price 정보 (Monad testnet 기준)
  const gasPrice = ethers.utils.parseUnits("0.5", "gwei"); // 0.5 Gwei
  console.log(`Gas Price: ${ethers.utils.formatUnits(gasPrice, "gwei")} Gwei`);

  // 컨트랙트 배포 (테스트 환경 준비)
  console.log("\n🔧 테스트 환경 준비 중...");

  const SelaWalletFactory = await ethers.getContractFactory(
    "SelaWalletFactory"
  );
  const walletFactory = await SelaWalletFactory.deploy();
  await walletFactory.deployed();

  const SelaPower = await ethers.getContractFactory("SelaPower");
  const selaPower = await upgrades.deployProxy(
    SelaPower,
    ["Sela Power", "SPWR", 0],
    { kind: "uups" }
  );
  await selaPower.deployed();

  const SelaDataIntegrityRegistry = await ethers.getContractFactory(
    "SelaDataIntegrityRegistry"
  );
  const dataRegistry = await SelaDataIntegrityRegistry.deploy();
  await dataRegistry.deployed();

  // 사전에 지갑 생성 (테스트용)
  const salt = 12345;
  const createTx = await walletFactory
    .connect(user1)
    .createWallet(user1.address, salt);
  const createReceipt = await createTx.wait();

  // 생성된 지갑 주소 가져오기
  let walletAddress;
  for (const log of createReceipt.logs) {
    try {
      const parsedLog = walletFactory.interface.parseLog(log);
      if (parsedLog.name === "WalletCreated") {
        walletAddress = parsedLog.args[1];
        break;
      }
    } catch (e) {
      // Skip logs that can't be parsed by this contract
      continue;
    }
  }

  // SelaWallet 인스턴스 생성
  const SelaWallet = await ethers.getContractFactory("SelaWallet");
  const wallet = SelaWallet.attach(walletAddress);

  console.log("✅ 테스트 환경 준비 완료\n");

  console.log("=== 순수 함수 호출 Gas Fee 측정 ===\n");

  // 1. 지갑에서 트랜잭션 실행 (execute 함수)
  console.log("1. 스마트 지갑 트랜잭션 실행 Gas 계산");
  try {
    // 지갑에 ETH 보내기 (테스트용)
    await user1.sendTransaction({
      to: walletAddress,
      value: ethers.utils.parseEther("0.1"),
    });

    // execute 함수 gas 측정
    const executeAmount = ethers.utils.parseEther("0.01");
    const executeGas = await wallet
      .connect(user1)
      .estimateGas.execute(user2.address, executeAmount, "0x");
    const executeFee = executeGas.mul(gasPrice);

    console.log(`   함수: execute() - ETH 전송`);
    console.log(`   Gas 사용량: ${executeGas.toString()} gas`);
    console.log(`   Gas Fee: ${ethers.utils.formatEther(executeFee)} ETH`);
    console.log(
      `   Gas Fee: ${ethers.utils.formatUnits(executeFee, "gwei")} Gwei`
    );

    // 실제 실행
    const executeTx = await wallet
      .connect(user1)
      .execute(user2.address, executeAmount, "0x");
    const executeReceipt = await executeTx.wait();
    console.log(`   실제 Gas 사용량: ${executeReceipt.gasUsed.toString()} gas`);
  } catch (error) {
    console.error(`   ❌ 지갑 실행 Gas 계산 오류:`, error.message);
  }

  console.log("\n" + "=".repeat(50));

  // 2. 포인트 발행 (mint 함수)
  console.log("2. 포인트 발행 (mint) Gas 계산");
  try {
    const mintAmount = ethers.utils.parseEther("100");

    const mintGas = await selaPower.estimateGas.mint(user1.address, mintAmount);
    const mintFee = mintGas.mul(gasPrice);

    console.log(`   함수: mint() - 100 SPWR 토큰 발행`);
    console.log(`   Gas 사용량: ${mintGas.toString()} gas`);
    console.log(`   Gas Fee: ${ethers.utils.formatEther(mintFee)} ETH`);
    console.log(
      `   Gas Fee: ${ethers.utils.formatUnits(mintFee, "gwei")} Gwei`
    );

    // 실제 실행
    const mintTx = await selaPower.mint(user1.address, mintAmount);
    const mintReceipt = await mintTx.wait();
    console.log(`   실제 Gas 사용량: ${mintReceipt.gasUsed.toString()} gas`);
  } catch (error) {
    console.error(`   ❌ 포인트 발행 Gas 계산 오류:`, error.message);
  }

  console.log("\n" + "=".repeat(50));

  // 3. 포인트 전송 (transfer 함수)
  console.log("3. 포인트 전송 (transfer) Gas 계산");
  try {
    const transferAmount = ethers.utils.parseEther("10");

    const transferGas = await selaPower
      .connect(user1)
      .estimateGas.transfer(user2.address, transferAmount);
    const transferFee = transferGas.mul(gasPrice);

    console.log(`   함수: transfer() - 10 SPWR 토큰 전송`);
    console.log(`   Gas 사용량: ${transferGas.toString()} gas`);
    console.log(`   Gas Fee: ${ethers.utils.formatEther(transferFee)} ETH`);
    console.log(
      `   Gas Fee: ${ethers.utils.formatUnits(transferFee, "gwei")} Gwei`
    );

    // 실제 실행
    const transferTx = await selaPower
      .connect(user1)
      .transfer(user2.address, transferAmount);
    const transferReceipt = await transferTx.wait();
    console.log(
      `   실제 Gas 사용량: ${transferReceipt.gasUsed.toString()} gas`
    );
  } catch (error) {
    console.error(`   ❌ 포인트 전송 Gas 계산 오류:`, error.message);
  }

  console.log("\n" + "=".repeat(50));

  // 4. 데이터 해시 저장 (storeStringHash 함수)
  console.log("4. 데이터 해시 저장 (storeStringHash) Gas 계산");
  try {
    const sampleData = "사용자 로그인 데이터: 2024-01-01 09:00:00";
    const description = "로그인 이벤트 데이터";

    const storeGas = await dataRegistry.estimateGas.storeStringHash(
      sampleData,
      description
    );
    const storeFee = storeGas.mul(gasPrice);

    console.log(`   함수: storeStringHash() - 해시 데이터 저장`);
    console.log(`   Gas 사용량: ${storeGas.toString()} gas`);
    console.log(`   Gas Fee: ${ethers.utils.formatEther(storeFee)} ETH`);
    console.log(
      `   Gas Fee: ${ethers.utils.formatUnits(storeFee, "gwei")} Gwei`
    );

    // 실제 실행
    const storeTx = await dataRegistry
      .connect(user1)
      .storeStringHash(sampleData, description);
    const storeReceipt = await storeTx.wait();
    console.log(`   실제 Gas 사용량: ${storeReceipt.gasUsed.toString()} gas`);
  } catch (error) {
    console.error(`   ❌ 데이터 저장 Gas 계산 오류:`, error.message);
  }

  console.log("\n" + "=".repeat(50));

  // 5. 데이터 검증 (verifyDataByHashId 함수)
  console.log("5. 데이터 검증 (verifyDataByHashId) Gas 계산");
  try {
    const hashId = 1; // 위에서 저장한 해시 ID
    const originalData = "사용자 로그인 데이터: 2024-01-01 09:00:00";

    const verifyGas = await dataRegistry.estimateGas.verifyDataByHashId(
      hashId,
      ethers.utils.toUtf8Bytes(originalData)
    );
    const verifyFee = verifyGas.mul(gasPrice);

    console.log(`   함수: verifyDataByHashId() - 데이터 무결성 검증`);
    console.log(`   Gas 사용량: ${verifyGas.toString()} gas`);
    console.log(`   Gas Fee: ${ethers.utils.formatEther(verifyFee)} ETH`);
    console.log(
      `   Gas Fee: ${ethers.utils.formatUnits(verifyFee, "gwei")} Gwei`
    );

    // 실제 실행
    const verifyTx = await dataRegistry.verifyDataByHashId(
      hashId,
      ethers.utils.toUtf8Bytes(originalData)
    );
    const verifyReceipt = await verifyTx.wait();
    console.log(`   실제 Gas 사용량: ${verifyReceipt.gasUsed.toString()} gas`);
  } catch (error) {
    console.error(`   ❌ 데이터 검증 Gas 계산 오류:`, error.message);
  }

  console.log("\n" + "=".repeat(70));
  console.log("=== 함수별 Gas Fee 요약 (Monad Testnet 기준) ===\n");

  // 실측 기반 예상 gas 사용량
  const functionGasUsage = {
    walletExecute: 23000, // 스마트 지갑 실행
    pointMint: 77000, // 포인트 발행
    pointTransfer: 65000, // 포인트 전송
    dataStore: 214000, // 데이터 저장
    dataVerify: 45000, // 데이터 검증
  };

  // 다양한 Gas Price 시나리오
  const testnetGasPrices = [
    { name: "매우저렴", price: ethers.utils.parseUnits("0.1", "gwei") },
    { name: "저렴", price: ethers.utils.parseUnits("0.5", "gwei") },
    { name: "보통", price: ethers.utils.parseUnits("1", "gwei") },
    { name: "빠름", price: ethers.utils.parseUnits("2", "gwei") },
  ];

  console.log("| 함수 | Gas 사용량 | 0.1 Gwei | 0.5 Gwei | 1 Gwei | 2 Gwei |");
  console.log("|------|------------|----------|----------|--------|--------|");

  Object.entries(functionGasUsage).forEach(([func, gas]) => {
    const costs = testnetGasPrices.map((scenario) => {
      const fee = ethers.BigNumber.from(gas).mul(scenario.price);
      return ethers.utils.formatEther(fee);
    });

    const funcNames = {
      walletExecute: "지갑 실행",
      pointMint: "포인트 발행",
      pointTransfer: "포인트 전송",
      dataStore: "데이터 저장",
      dataVerify: "데이터 검증",
    };

    console.log(
      `| ${funcNames[func]} | ${gas.toLocaleString()} | ${costs[0]} ETH | ${
        costs[1]
      } ETH | ${costs[2]} ETH | ${costs[3]} ETH |`
    );
  });

  console.log("\n💰 한국 원화 기준 (ETH = 3,000,000원):");
  console.log("| 함수 | 0.1 Gwei | 0.5 Gwei | 1 Gwei | 2 Gwei |");
  console.log("|------|----------|----------|--------|--------|");

  Object.entries(functionGasUsage).forEach(([func, gas]) => {
    const costs = testnetGasPrices.map((scenario) => {
      const fee = ethers.BigNumber.from(gas).mul(scenario.price);
      const ethAmount = parseFloat(ethers.utils.formatEther(fee));
      return Math.round(ethAmount * 3000000);
    });

    const funcNames = {
      walletExecute: "지갑 실행",
      pointMint: "포인트 발행",
      pointTransfer: "포인트 전송",
      dataStore: "데이터 저장",
      dataVerify: "데이터 검증",
    };

    console.log(
      `| ${funcNames[func]} | ${costs[0]}원 | ${costs[1]}원 | ${costs[2]}원 | ${costs[3]}원 |`
    );
  });

  console.log("\n🎯 일반적인 사용 시나리오 비용 (0.5 Gwei 기준):");
  console.log("- 포인트 10개 전송: 약 98원");
  console.log("- 활동 데이터 1개 저장: 약 321원");
  console.log("- 데이터 무결성 검증: 약 68원");
  console.log("- 일일 사용 예상 비용: 약 500-1000원");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("함수 호출 Gas 계산 중 오류 발생:", error);
    process.exit(1);
  });
