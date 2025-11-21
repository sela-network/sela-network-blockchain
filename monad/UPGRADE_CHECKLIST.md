# SelaPower 업그레이드 체크리스트

빠른 참조를 위한 업그레이드 체크리스트입니다. 상세한 내용은 [UPGRADE_GUIDE_KO.md](UPGRADE_GUIDE_KO.md)를 참고하세요.

---

## 📋 업그레이드 전 체크리스트

### 1. 코드 검토
```
[ ] 스토리지 변수 순서 변경 안 함
[ ] 기존 변수 타입 변경 안 함
[ ] 새 변수는 맨 끝에 추가
[ ] 기존 변수 삭제 안 함
[ ] 상속 순서 변경 안 함
[ ] 버전 번호 업데이트 (version() 함수)
[ ] 주석 및 문서 업데이트
[ ] 코드 리뷰 완료 (최소 2명)
```

### 2. 로컬 테스트
```
[ ] npm run node (로컬 노드 실행)
[ ] npm run deploy:local (초기 배포)
[ ] SELA_POWER_PROXY_ADDRESS 환경 변수 설정
[ ] npm run upgrade:validate (검증 통과)
[ ] npm run upgrade:power (업그레이드 실행)
[ ] 기존 기능 테스트
[ ] 새 기능 테스트
[ ] 가스 비용 확인
```

### 3. 테스트넷 배포
```
[ ] 테스트넷에 배포 (이미 했다면 생략)
[ ] SELA_POWER_PROXY_ADDRESS 설정
[ ] npm run upgrade:validate (검증)
[ ] npm run upgrade:power --network monad_testnet
[ ] npm run check:version (버전 확인)
[ ] 기존 데이터 보존 확인
[ ] 기존 기능 정상 작동 확인
[ ] 새 기능 정상 작동 확인
[ ] 프론트엔드 통합 테스트
[ ] 24-48시간 모니터링
```

### 4. 문서화
```
[ ] CHANGELOG 업데이트
[ ] 버전 히스토리 기록
[ ] ABI 변경사항 문서화
[ ] 업그레이드 공지문 작성
[ ] 기술 문서 업데이트
```

### 5. 보안
```
[ ] 외부 감사 (필요시)
[ ] Owner 키 안전하게 보관 확인
[ ] 멀티시그 지갑 사용 (권장)
[ ] 롤백 계획 준비
[ ] 긴급 연락망 확인
```

---

## 🚀 메인넷 배포 체크리스트

### D-Day 전날
```
[ ] 위의 모든 체크리스트 완료
[ ] 팀 전체 최종 검토 및 승인
[ ] 배포 시간 공지 (커뮤니티)
[ ] 롤백 절차 팀원 숙지
[ ] 모니터링 시스템 준비
[ ] 긴급 연락망 테스트
```

### 배포 당일
```
[ ] 팀원 대기 상태 확인
[ ] 네트워크 상태 확인
[ ] 가스 가격 확인
[ ] SELA_POWER_PROXY_ADDRESS 재확인
```

### 배포 실행
```bash
# 1. 검증
SELA_POWER_PROXY_ADDRESS=0x... \
  npx hardhat run scripts/validateUpgrade.js --network monad_mainnet

# 2. 업그레이드
SELA_POWER_PROXY_ADDRESS=0x... \
  npx hardhat run scripts/upgradeSelaPower.js --network monad_mainnet

# 3. 확인
SELA_POWER_PROXY_ADDRESS=0x... \
  npx hardhat run scripts/checkVersion.js --network monad_mainnet
```

### 배포 후
```
[ ] 새 implementation 주소 기록
[ ] 버전 확인 (version() 호출)
[ ] 기존 데이터 확인 (totalSupply, balances)
[ ] 기존 기능 테스트 (transfer, mint, burn)
[ ] 새 기능 테스트
[ ] 이벤트 로그 확인
[ ] 프론트엔드 ABI 업데이트
[ ] 업그레이드 완료 공지
[ ] 24시간 집중 모니터링
```

---

## ⚠️ 스토리지 레이아웃 체크리스트

### 절대 금지 사항 (데이터 손상 위험!)
```
[ ] 기존 변수 순서 변경 ❌
[ ] 기존 변수 타입 변경 ❌
[ ] 기존 변수 삭제/주석처리 ❌
[ ] 기존 변수 사이에 새 변수 삽입 ❌
[ ] 상속 컨트랙트 순서 변경 ❌
```

### 안전한 변경사항
```
[ ] 새 변수를 맨 끝에 추가 ✅
[ ] 새 함수 추가 ✅
[ ] 기존 함수 로직 수정 ✅
[ ] 새 이벤트 추가 ✅
[ ] 새 modifier 추가 ✅
[ ] 주석 추가/수정 ✅
```

---

## 🔥 긴급 상황 대응

### 문제 발견 시
```
1. [ ] 즉시 pause() 호출로 컨트랙트 일시정지
2. [ ] 팀에 긴급 연락
3. [ ] 문제 원인 파악
4. [ ] 롤백 필요성 판단
5. [ ] 커뮤니티에 상황 공지
```

### 롤백 절차
```bash
# 1. 이전 구현체 주소 확인
OLD_IMPLEMENTATION=0x...

# 2. 롤백 스크립트 실행
SELA_POWER_PROXY_ADDRESS=0x... \
OLD_IMPLEMENTATION_ADDRESS=0x... \
  npx hardhat run scripts/rollback.js --network monad_mainnet

# 3. 버전 확인
# 4. 기능 테스트
# 5. 상황 공지
```

---

## 📞 연락처

### 긴급 연락처
- 기술 리드: [연락처]
- DevOps: [연락처]
- CEO/CTO: [연락처]

### 커뮤니티
- Discord: [링크]
- Twitter: [링크]
- Telegram: [링크]

---

## 🛠️ 유용한 명령어

```bash
# 버전 및 상태 확인
SELA_POWER_PROXY_ADDRESS=0x... npm run check:version

# 업그레이드 검증
SELA_POWER_PROXY_ADDRESS=0x... npm run upgrade:validate

# 업그레이드 실행
SELA_POWER_PROXY_ADDRESS=0x... npm run upgrade:power

# 컨트랙트 일시정지
npx hardhat console --network monad_mainnet
> const sp = await ethers.getContractAt("SelaPower", "0x...")
> await sp.pause()

# 컨트랙트 재개
> await sp.unpause()
```

---

## 📝 버전별 체크리스트

### v2.0.0 (계정 잠금 기능)
```
코드 변경:
[ ] lockedAccounts 매핑 추가
[ ] lockAccount() 함수 추가
[ ] unlockAccount() 함수 추가
[ ] isLocked() 함수 추가
[ ] _beforeTokenTransfer() 수정
[ ] 이벤트 추가 (AccountLocked, AccountUnlocked)
[ ] version() "2.0.0"으로 변경

테스트:
[ ] lockAccount() 테스트
[ ] unlockAccount() 테스트
[ ] 잠긴 계정의 전송 차단 테스트
[ ] 잠기지 않은 계정의 정상 작동 테스트
[ ] mint/burn은 잠금과 무관하게 작동 테스트
```

### v3.0.0 (스테이킹 기능) - 예시
```
코드 변경:
[ ] stakedAmount 매핑 추가
[ ] rewardDebt 매핑 추가
[ ] totalStaked 변수 추가
[ ] stake() 함수 추가
[ ] unstake() 함수 추가
[ ] claimReward() 함수 추가
[ ] version() "3.0.0"으로 변경

테스트:
[ ] stake() 테스트
[ ] unstake() 테스트
[ ] 보상 계산 테스트
[ ] 잠긴 계정의 스테이킹 차단 테스트
```

---

**마지막 업데이트:** 2024-11-21  
**체크리스트 버전:** 1.0.0

**사용 방법:** 
이 체크리스트를 출력하거나 복사하여 업그레이드 시 각 항목을 체크하세요.

