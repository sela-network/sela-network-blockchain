const { ethers } = require("hardhat");

async function main() {
  // SelaPoint 컨트랙트 주소 (배포된 주소로 변경 필요)
  const SELA_POINT_ADDRESS = "0xd43D1530EC32Dc33c95EEA1E5Fd913412eDe1561"; // 실제 배포된 주소로 변경하세요

  // mint 권한을 부여할 주소
  const MINTER_ADDRESS = "0x53e65Ed4f884Bc5520bd57b0AF1D1e3C2DD27bc6";

  console.log("SelaPoint 컨트랙트에 연결 중...");

  // 컨트랙트 인스턴스 가져오기
  const SelaPoint = await ethers.getContractFactory("SelaPoint");
  const selaPoint = SelaPoint.attach(SELA_POINT_ADDRESS);

  // 현재 계정 정보
  const [owner] = await ethers.getSigners();
  console.log("Owner 계정:", owner.address);

  // 현재 minter 상태 확인
  const isMinterBefore = await selaPoint.isMinter(MINTER_ADDRESS);
  console.log(`${MINTER_ADDRESS}의 현재 minter 상태:`, isMinterBefore);

  if (isMinterBefore) {
    console.log("이미 minter 권한을 가지고 있습니다.");
    return;
  }

  try {
    // minter 권한 부여
    console.log("minter 권한 부여 중...");
    const tx = await selaPoint.addMinter(MINTER_ADDRESS);

    console.log("트랜잭션 해시:", tx.hash);
    console.log("블록 확인 대기 중...");

    const receipt = await tx.wait();
    console.log(
      "트랜잭션이 블록에 포함되었습니다. 블록 번호:",
      receipt.blockNumber
    );

    // 결과 확인
    const isMinterAfter = await selaPoint.isMinter(MINTER_ADDRESS);
    console.log(`${MINTER_ADDRESS}의 업데이트된 minter 상태:`, isMinterAfter);

    if (isMinterAfter) {
      console.log("✅ mint 권한이 성공적으로 부여되었습니다!");
    } else {
      console.log("❌ mint 권한 부여에 실패했습니다.");
    }
  } catch (error) {
    console.error("오류 발생:", error.message);

    if (error.message.includes("Not authorized")) {
      console.log("💡 owner 계정으로 실행해야 합니다.");
    } else if (error.message.includes("already a minter")) {
      console.log("💡 해당 주소는 이미 minter 권한을 가지고 있습니다.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
