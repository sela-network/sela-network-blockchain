const { ethers } = require("hardhat");

async function main() {
  const [deployer, user1, user2, user3, dappOwner] = await ethers.getSigners();

  console.log("=== Sela Network Integrated Example ===");
  console.log(
    "이 예제는 Sela 네트워크의 모든 핵심 컨트랙트들을 통합적으로 보여줍니다\n"
  );

  console.log("Deployer:", deployer.address);
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);
  console.log("User3:", user3.address);
  console.log("DApp Owner:", dappOwner.address);

  // 1. 모든 컨트랙트 배포
  console.log("\n1. 모든 Sela 컨트랙트 배포 중...");

  // SelaPoint 배포
  console.log("\n1-1. SelaPoint 토큰 배포...");
  const SelaPoint = await ethers.getContractFactory("SelaPoint");
  const selaPoint = await SelaPoint.deploy(
    "Sela Point Token",
    "SELA",
    ethers.utils.parseEther("10000") // 10,000 SELA 초기 공급량
  );
  await selaPoint.deployed();
  const selaPointAddress = selaPoint.address;
  console.log(`✅ SelaPoint deployed: ${selaPointAddress}`);

  // SelaDataIntegrityRegistry 배포
  console.log("\n1-2. SelaDataIntegrityRegistry 배포...");
  const SelaDataIntegrityRegistry = await ethers.getContractFactory(
    "SelaDataIntegrityRegistry"
  );
  const dataRegistry = await SelaDataIntegrityRegistry.deploy();
  await dataRegistry.deployed();
  const dataRegistryAddress = dataRegistry.address;
  console.log(`✅ SelaDataIntegrityRegistry deployed: ${dataRegistryAddress}`);

  // SelaWalletFactory 배포
  console.log("\n1-3. SelaWalletFactory 배포...");
  const SelaWalletFactory = await ethers.getContractFactory(
    "SelaWalletFactory"
  );
  const walletFactory = await SelaWalletFactory.deploy();
  await walletFactory.deployed();
  const walletFactoryAddress = walletFactory.address;
  console.log(`✅ SelaWalletFactory deployed: ${walletFactoryAddress}`);

  // 2. 토큰 시스템 설정
  console.log("\n2. 토큰 시스템 설정...");

  // DApp 소유자를 민터로 추가
  console.log("DApp 소유자를 SELA 토큰 민터로 추가...");
  await selaPoint.addMinter(dappOwner.address);
  console.log(`✅ ${dappOwner.address}가 민터 권한을 획득했습니다`);

  // 사용자들에게 초기 토큰 지급
  console.log("\n사용자들에게 초기 SELA 토큰 지급...");
  const initialTokenAmount = ethers.utils.parseEther("100");

  await selaPoint.mint(user1.address, initialTokenAmount);
  await selaPoint.mint(user2.address, initialTokenAmount);
  await selaPoint.mint(user3.address, initialTokenAmount);

  console.log(
    `✅ 각 사용자에게 ${ethers.utils.formatEther(
      initialTokenAmount
    )} SELA 지급 완료`
  );

  // 3. 스마트 월렛 생성
  console.log("\n3. 스마트 월렛 생성...");

  const wallets = [];

  // 각 사용자별로 스마트 월렛 생성
  const users = [user1, user2, user3];
  const userNames = ["User1", "User2", "User3"];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const userName = userNames[i];
    const salt = i + 1;

    console.log(`\n${userName}의 스마트 월렛 생성 중...`);
    const createTx = await walletFactory
      .connect(user)
      .createWallet(user.address, salt);
    const receipt = await createTx.wait();

    // 이벤트에서 월렛 주소 추출 (ethers v5 방식)
    let walletCreatedEvent = null;
    for (const log of receipt.logs) {
      try {
        const parsedLog = walletFactory.interface.parseLog(log);
        if (parsedLog.name === "WalletCreated") {
          walletCreatedEvent = parsedLog;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (walletCreatedEvent) {
      const walletAddress = walletCreatedEvent.args[1];
      wallets.push({
        name: userName,
        address: walletAddress,
        owner: user.address,
        user: user,
      });
      console.log(`✅ ${userName} 월렛 주소: ${walletAddress}`);
    }
  }

  // 4. 데이터 무결성 시나리오
  console.log("\n4. 데이터 무결성 검증 시나리오...");

  // 시나리오: 사용자가 거래 데이터를 제출하고 해시를 저장
  const transactionData = {
    from: user1.address,
    to: user2.address,
    amount: ethers.utils.parseEther("50"),
    timestamp: Math.floor(Date.now() / 1000),
    description: "SELA 토큰 P2P 거래",
  };

  const dataString = JSON.stringify(transactionData);
  console.log(`\n거래 데이터 저장: ${dataString}`);

  // 데이터 해시 저장
  const hashTx = await dataRegistry
    .connect(user1)
    .storeStringHash(dataString, "User1에서 User2로의 SELA 토큰 거래 데이터");
  const hashReceipt = await hashTx.wait();

  // 이벤트에서 해시 ID 추출 (ethers v5 방식)
  let transactionHashId;
  for (const log of hashReceipt.logs) {
    try {
      const parsedLog = dataRegistry.interface.parseLog(log);
      if (parsedLog.name === "HashStored") {
        transactionHashId = parsedLog.args[0];
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (transactionHashId) {
    console.log(
      `✅ 거래 데이터 해시 저장 완료 (Hash ID: ${transactionHashId})`
    );
  }

  // 5. 통합 시나리오: 리워드 시스템
  console.log("\n5. 통합 리워드 시스템 시나리오...");

  // 시나리오: 사용자가 데이터를 제출하면 리워드로 SELA 토큰을 받음
  const rewardScenarios = [
    {
      user: user1,
      userName: "User1",
      data: "2024년 1월 암호화폐 시장 분석 데이터",
      description: "전문적인 시장 분석 리포트",
      reward: ethers.utils.parseEther("25"),
    },
    {
      user: user2,
      userName: "User2",
      data: "NFT 거래소 가격 트렌드 데이터",
      description: "NFT 마켓플레이스 가격 동향",
      reward: ethers.utils.parseEther("30"),
    },
    {
      user: user3,
      userName: "User3",
      data: "DeFi 프로토콜 수익률 분석",
      description: "각종 DeFi 플랫폼 APY 비교 분석",
      reward: ethers.utils.parseEther("20"),
    },
  ];

  for (const scenario of rewardScenarios) {
    console.log(`\n${scenario.userName} 데이터 제출 및 리워드 지급:`);
    console.log(`  데이터: ${scenario.data}`);

    // 1. 데이터 해시 저장
    const dataHashTx = await dataRegistry
      .connect(scenario.user)
      .storeStringHash(scenario.data, scenario.description);
    await dataHashTx.wait();

    // 2. 리워드 토큰 민팅 (DApp 소유자가 민팅)
    const rewardTx = await selaPoint
      .connect(dappOwner)
      .mint(scenario.user.address, scenario.reward);
    await rewardTx.wait();

    const newBalance = await selaPoint.balanceOf(scenario.user.address);
    console.log(
      `  ✅ 리워드 지급: ${ethers.utils.formatEther(scenario.reward)} SELA`
    );
    console.log(
      `  💰 ${scenario.userName} 현재 잔액: ${ethers.utils.formatEther(
        newBalance
      )} SELA`
    );
  }

  // 6. 스마트 월렛을 통한 토큰 전송
  console.log("\n6. 스마트 월렛을 통한 토큰 전송...");

  if (wallets.length >= 2) {
    const senderWallet = wallets[0];
    const recipientWallet = wallets[1];

    console.log(
      `${senderWallet.name} 월렛에서 ${recipientWallet.name} 월렛으로 SELA 토큰 전송...`
    );

    // SelaWallet 컨트랙트 인스턴스 생성
    const SelaWallet = await ethers.getContractFactory("SelaWallet");
    const wallet = SelaWallet.attach(senderWallet.address);

    // SELA 토큰 전송을 위한 calldata 생성
    const transferAmount = ethers.utils.parseEther("10");
    const transferCalldata = selaPoint.interface.encodeFunctionData(
      "transfer",
      [recipientWallet.address, transferAmount]
    );

    // 먼저 월렛에 SELA 토큰 전송
    await selaPoint
      .connect(senderWallet.user)
      .transfer(senderWallet.address, transferAmount);
    console.log(
      `  💸 ${senderWallet.name} 월렛에 ${ethers.utils.formatEther(
        transferAmount
      )} SELA 입금`
    );

    // 스마트 월렛을 통해 토큰 전송 실행
    const executeTx = await wallet
      .connect(senderWallet.user)
      .execute(selaPointAddress, 0, transferCalldata);
    await executeTx.wait();

    const finalBalance = await selaPoint.balanceOf(recipientWallet.address);
    console.log(
      `  ✅ 전송 완료! ${
        recipientWallet.name
      } 월렛 최종 잔액: ${ethers.utils.formatEther(finalBalance)} SELA`
    );
  }

  // 7. 데이터 무결성 검증
  console.log("\n7. 저장된 데이터의 무결성 검증...");

  if (transactionHashId) {
    console.log(`거래 데이터 무결성 검증 (Hash ID: ${transactionHashId}):`);

    // 원본 데이터로 검증 (view 함수 사용)
    const hashInfo = await dataRegistry.getHashInfo(transactionHashId);
    const originalHash = hashInfo.dataHash;
    const computedHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(dataString)
    );
    const isValid = originalHash === computedHash;
    console.log(`  ✅ 원본 데이터 검증 결과: ${isValid}`);

    // 변조된 데이터로 검증 (실패해야 함)
    const tamperedData = dataString.replace("50", "100"); // 금액 변조
    const tamperedHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(tamperedData)
    );
    const isTamperedValid = originalHash === tamperedHash;
    console.log(
      `  🚨 변조된 데이터 검증 결과: ${isTamperedValid} (false여야 정상)`
    );

    if (!isTamperedValid) {
      console.log(`  ✅ 데이터 변조가 성공적으로 탐지되었습니다!`);
    }
  }

  // 8. 최종 통계
  console.log("\n8. 최종 시스템 통계...");

  console.log("\n📊 토큰 현황:");
  const totalSupply = await selaPoint.totalSupply();
  console.log(`  총 공급량: ${ethers.utils.formatEther(totalSupply)} SELA`);

  for (let i = 0; i < users.length; i++) {
    const balance = await selaPoint.balanceOf(users[i].address);
    console.log(
      `  ${userNames[i]} 잔액: ${ethers.utils.formatEther(balance)} SELA`
    );
  }

  console.log("\n🏦 스마트 월렛 현황:");
  const totalWallets = await walletFactory.getTotalWalletCount();
  console.log(`  총 생성된 월렛 수: ${totalWallets}`);

  for (const wallet of wallets) {
    console.log(`  ${wallet.name} 월렛: ${wallet.address}`);
  }

  console.log("\n🔒 데이터 무결성 현황:");
  const nextHashId = await dataRegistry.nextHashId();
  console.log(`  저장된 해시 수: ${Number(nextHashId) - 1}`);
  console.log(`  다음 해시 ID: ${nextHashId}`);

  console.log("\n=== Sela Network 통합 예제 완료 ===");
  console.log("\n🎯 이 예제에서 보여준 핵심 기능들:");
  console.log("✅ SelaPoint: 토큰 민팅, 전송, 리워드 시스템");
  console.log("✅ SelaDataIntegrityRegistry: 데이터 해시 저장 및 무결성 검증");
  console.log("✅ SelaWallet: 스마트 컨트랙트 월렛을 통한 토큰 관리");
  console.log("✅ 통합 시나리오: 데이터 제출 → 무결성 검증 → 리워드 지급");

  console.log("\n💡 실제 사용 사례:");
  console.log("🔸 데이터 제공자가 검증된 데이터를 제출");
  console.log("🔸 시스템이 데이터 무결성을 보장");
  console.log("🔸 기여도에 따른 자동 리워드 지급");
  console.log("🔸 스마트 월렛을 통한 안전한 자산 관리");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("실행 중 오류 발생:", error);
    process.exit(1);
  });
