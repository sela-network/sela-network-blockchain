const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=== SelaWallet getWalletInfo 확인 ===\n");
  console.log("배포자:", deployer.address);

  // 확인할 SelaWallet 주소
  const walletAddress = "0xd76e471cb5b4cF45fbBb1EC6536E20ee30d8b3Fd";
  console.log("확인할 지갑 주소:", walletAddress);

  // getWalletInfo 실행 및 확인
  console.log("\n📋 getWalletInfo 실행 중...");

  try {
    const SelaWallet = await ethers.getContractFactory("SelaWallet");
    const wallet = SelaWallet.attach(walletAddress);

    const walletInfo = await wallet.getWalletInfo();

    console.log("\n✅ 지갑 정보 조회 성공:");
    console.log("═══════════════════════════════════════════════════════");
    console.log("📍 소유자:", walletInfo[0]);
    console.log("🏭 팩토리:", walletInfo[1]);
    console.log(
      "🕐 생성 시간:",
      new Date(Number(walletInfo[2]) * 1000).toLocaleString()
    );
    console.log("💰 잔액:", ethers.utils.formatEther(walletInfo[3]), "ETH");
    console.log("═══════════════════════════════════════════════════════");

    // 추가 정보 확인
    console.log("\n🔍 추가 확인:");

    // 코드가 있는지 확인 (컨트랙트인지 확인)
    const code = await ethers.provider.getCode(walletAddress);
    const isContract = code !== "0x";
    console.log(
      "컨트랙트 여부:",
      isContract ? "✅ SelaWallet 컨트랙트" : "❌ 일반 주소"
    );

    if (isContract) {
      console.log("🎯 이것은 SelaWallet을 통해 만든 사용자 지갑입니다!");

      // 소유자가 배포자인지 확인
      const isOwner =
        walletInfo[0].toLowerCase() === deployer.address.toLowerCase();
      console.log("현재 계정이 소유자:", isOwner ? "✅" : "❌");

      // 잔액이 있는지 확인
      const hasBalance = Number(walletInfo[3]) > 0;
      console.log("잔액 존재:", hasBalance ? "✅" : "❌");
    }
  } catch (error) {
    console.error("❌ 오류 발생:", error.message);

    if (error.message.includes("call revert exception")) {
      console.log("💡 이 주소는 SelaWallet 컨트랙트가 아닐 수 있습니다.");
    } else if (error.message.includes("invalid address")) {
      console.log("💡 주소 형식이 올바르지 않습니다.");
    }
  }

  console.log("\n✅ getWalletInfo 확인 완료!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("오류 발생:", error);
    process.exit(1);
  });
