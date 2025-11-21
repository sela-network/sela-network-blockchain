# SelaPower 업그레이드 가이드 (한글)

SelaPower는 UUPS (Universal Upgradeable Proxy Standard) 패턴을 사용하는 업그레이드 가능한 스마트 컨트랙트입니다.

## 📚 목차

1. [개요](#개요)
2. [업그레이드 프로세스](#업그레이드-프로세스)
3. [새 버전 만들기](#새-버전-만들기)
4. [스토리지 레이아웃 규칙](#스토리지-레이아웃-규칙)
5. [실전 예제](#실전-예제)
6. [문제 해결](#문제-해결)
7. [보안 체크리스트](#보안-체크리스트)

---

## 개요

### 업그레이드 가능한 컨트랙트 구조

```
사용자/DApp
    ↓
프록시 컨트랙트 (고정된 주소)
    ↓
구현 컨트랙트 (업그레이드 가능)
```

**프록시 컨트랙트 (Proxy)**
- 사용자가 실제로 상호작용하는 주소
- 배포 후 **절대 변경되지 않음**
- 모든 토큰 잔액과 데이터를 저장

**구현 컨트랙트 (Implementation)**
- 실제 로직이 들어있는 컨트랙트
- 업그레이드 시 이 부분만 교체
- 새로운 기능 추가 가능

### 주요 장점

✅ **심리스 업그레이드**: 컨트랙트 주소 변경 없이 새 기능 추가  
✅ **데이터 보존**: 모든 토큰 잔액과 상태가 그대로 유지  
✅ **사용자 조치 불필요**: 사용자는 마이그레이션 등 아무것도 하지 않아도 됨  
✅ **보안**: 오너만 업그레이드 가능  
✅ **버전 관리**: 각 버전을 추적하고 필요시 롤백 가능  

---

## 업그레이드 프로세스

### 전체 흐름도

```
1. 코드 수정 → 2. 로컬 테스트 → 3. 검증 → 4. 테스트넷 배포 → 5. 메인넷 배포
```

### 1단계: 업그레이드 검증 (필수!)

업그레이드를 실행하기 전에 **반드시** 검증해야 합니다:

```bash
# 프록시 주소 설정
export SELA_POWER_PROXY_ADDRESS=0x1234...

# 업그레이드 검증
npm run upgrade:validate

# 또는 특정 네트워크에서
SELA_POWER_PROXY_ADDRESS=0x1234... \
  npx hardhat run scripts/validateUpgrade.js --network monad_testnet
```

**검증 항목:**
- ✓ 스토리지 레이아웃 호환성
- ✓ 함수 시그니처 충돌 여부
- ✓ 초기화 함수 문제
- ✓ 업그레이드 권한

### 2단계: 업그레이드 실행

검증이 통과하면 업그레이드를 실행합니다:

```bash
# 업그레이드 실행
npm run upgrade:power

# 또는 특정 네트워크에서
SELA_POWER_PROXY_ADDRESS=0x1234... \
  npx hardhat run scripts/upgradeSelaPower.js --network monad_testnet
```

**실행 결과:**
```
=== Upgrading SelaPower contract... ===
Proxy address: 0x1234...
Current implementation: 0xOLD_ADDRESS
New implementation: 0xNEW_ADDRESS

=== Upgrade Completed ===
✅ Upgrade successful!

Token name: Sela Power
Token symbol: SPWR
Contract version: 2.0.0
```

### 3단계: 업그레이드 검증

업그레이드 후 확인해야 할 사항:

```javascript
// 간단한 검증 스크립트
const selaPower = await ethers.getContractAt("SelaPower", PROXY_ADDRESS);

// 1. 버전 확인
console.log("Version:", await selaPower.version()); // "2.0.0"

// 2. 기존 데이터 확인
console.log("Total Supply:", await selaPower.totalSupply()); // 이전과 동일해야 함

// 3. 기존 기능 테스트
const balance = await selaPower.balanceOf(USER_ADDRESS);
console.log("User balance:", balance); // 이전과 동일해야 함

// 4. 새 기능 테스트
await selaPower.lockAccount(SOME_ADDRESS); // 새로운 기능
```

---

## 새 버전 만들기

### 예제: 계정 잠금 기능 추가하기

배포된 SelaPower v1.0.0에 계정 잠금 기능을 추가하여 v2.0.0을 만드는 과정입니다.

#### Step 1: 컨트랙트 수정

`contracts/SelaPower.sol` 파일을 수정합니다:

```solidity
contract SelaPower is 
    Initializable, 
    ERC20Upgradeable, 
    OwnableUpgradeable, 
    PausableUpgradeable,
    UUPSUpgradeable 
{
    // ========================================
    // 기존 스토리지 변수 (순서 절대 변경 금지!)
    // ========================================
    mapping(address => bool) public minters;
    mapping(address => bool) public burners;
    
    // ========================================
    // 새로운 스토리지 변수 (맨 끝에 추가)
    // ========================================
    mapping(address => bool) public lockedAccounts;  // v2.0.0에서 추가
    
    // ========================================
    // 기존 이벤트들
    // ========================================
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event BurnerAdded(address indexed burner);
    event BurnerRemoved(address indexed burner);
    event TokensMinted(address indexed to, uint256 amount, address indexed minter);
    event TokensBurned(address indexed from, uint256 amount, address indexed burner);
    event OwnerBurn(address indexed from, uint256 amount);
    
    // ========================================
    // 새로운 이벤트들
    // ========================================
    event AccountLocked(address indexed account);
    event AccountUnlocked(address indexed account);
    
    // ... 기존 modifier들은 그대로 ...
    
    // ========================================
    // 새로운 함수들
    // ========================================
    
    /**
     * @dev 계정 잠금 (토큰 전송 차단)
     * @param _account 잠글 계정 주소
     */
    function lockAccount(address _account) external onlyOwner {
        require(_account != address(0), "Cannot lock zero address");
        require(!lockedAccounts[_account], "Account is already locked");
        
        lockedAccounts[_account] = true;
        emit AccountLocked(_account);
    }
    
    /**
     * @dev 계정 잠금 해제
     * @param _account 잠금 해제할 계정 주소
     */
    function unlockAccount(address _account) external onlyOwner {
        require(_account != address(0), "Cannot unlock zero address");
        require(lockedAccounts[_account], "Account is not locked");
        
        lockedAccounts[_account] = false;
        emit AccountUnlocked(_account);
    }
    
    /**
     * @dev 계정 잠금 상태 조회
     * @param _account 확인할 계정 주소
     * @return 잠금 여부
     */
    function isLocked(address _account) external view returns (bool) {
        return lockedAccounts[_account];
    }
    
    // ========================================
    // 기존 함수 로직 수정
    // ========================================
    
    /**
     * @dev ERC20 토큰 전송 전 체크 (잠금 로직 추가)
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        // 잠긴 계정의 전송 차단 (mint/burn 제외)
        if (from != address(0) && to != address(0)) {
            require(!lockedAccounts[from], "Sender account is locked");
        }
        
        super._beforeTokenTransfer(from, to, amount);
    }
    
    // ========================================
    // 버전 업데이트 (필수!)
    // ========================================
    
    /**
     * @dev 컨트랙트 버전 반환
     * @return 버전 문자열
     */
    function version() public pure virtual override returns (string memory) {
        return "2.0.0";  // 1.0.0 → 2.0.0으로 업데이트
    }
}
```

#### Step 2: 로컬에서 테스트

```bash
# 터미널 1: 로컬 노드 시작
npm run node

# 터미널 2: 초기 배포
npm run deploy:local

# 출력 예시:
# ✅ SelaPower Proxy deployed: 0x5FbDB2315678afecb367f032d93F642f64180aa3
# ✅ SelaPower Implementation: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# 프록시 주소 저장
export SELA_POWER_PROXY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

# 토큰 발행 및 테스트 (v1.0.0 기능 확인)
npx hardhat console --network localhost
> const SelaPower = await ethers.getContractFactory("SelaPower")
> const sp = await SelaPower.attach("0x5FbDB2...")
> await sp.mint("0xUserAddress", ethers.parseEther("1000"))

# 코드 수정 (lock 기능 추가)

# 업그레이드 검증
npm run upgrade:validate
# ✅ Upgrade validation PASSED!

# 업그레이드 실행
npm run upgrade:power
# ✅ Upgrade successful!

# 새 기능 테스트
npx hardhat console --network localhost
> const sp2 = await ethers.getContractAt("SelaPower", "0x5FbDB2...")
> await sp2.version()  // "2.0.0"
> await sp2.lockAccount("0xUserAddress")
> await sp2.isLocked("0xUserAddress")  // true
```

#### Step 3: 테스트넷 배포

```bash
# 1. 테스트넷에 초기 배포 (이미 했다면 생략)
npm run deploy -- --network monad_testnet

# 2. 배포된 프록시 주소 저장
export SELA_POWER_PROXY_ADDRESS=0xYOUR_TESTNET_PROXY_ADDRESS

# 3. 업그레이드 검증
npm run upgrade:validate

# 4. 업그레이드 실행
SELA_POWER_PROXY_ADDRESS=0xYOUR_TESTNET_PROXY_ADDRESS \
  npx hardhat run scripts/upgradeSelaPower.js --network monad_testnet

# 5. 테스트넷에서 테스트
# - Remix, Hardhat console, 또는 프론트엔드로 테스트
# - 기존 기능 정상 작동 확인
# - 새 기능 정상 작동 확인
```

#### Step 4: 메인넷 배포

```bash
# 최종 체크리스트 확인 후 실행

SELA_POWER_PROXY_ADDRESS=0xYOUR_MAINNET_PROXY_ADDRESS \
  npx hardhat run scripts/validateUpgrade.js --network monad_mainnet

SELA_POWER_PROXY_ADDRESS=0xYOUR_MAINNET_PROXY_ADDRESS \
  npx hardhat run scripts/upgradeSelaPower.js --network monad_mainnet
```

---

## 스토리지 레이아웃 규칙

### ⚠️ 가장 중요한 규칙

스토리지 변수의 순서와 타입은 **절대로 변경할 수 없습니다**. 이를 위반하면 기존 데이터가 손상됩니다!

### ❌ 절대 하면 안 되는 것들

#### 1. 기존 변수 순서 변경

```solidity
// ❌ 잘못된 예시
contract SelaPowerV2 {
    mapping(address => bool) public burners;   // 원래 2번째였는데
    mapping(address => bool) public minters;   // 원래 1번째였는데 위치 바뀜 - 데이터 손상!
}
```

#### 2. 기존 변수 타입 변경

```solidity
// ❌ 잘못된 예시
contract SelaPowerV2 {
    mapping(address => uint256) public minters;  // bool → uint256으로 변경 - 데이터 손상!
    mapping(address => bool) public burners;
}
```

#### 3. 기존 변수 삭제

```solidity
// ❌ 잘못된 예시
contract SelaPowerV2 {
    // mapping(address => bool) public minters;  // 주석처리하거나 삭제 - 데이터 손상!
    mapping(address => bool) public burners;
}
```

#### 4. 기존 변수 사이에 새 변수 삽입

```solidity
// ❌ 잘못된 예시
contract SelaPowerV2 {
    mapping(address => bool) public minters;
    mapping(address => bool) public newFeature;  // 중간에 삽입 - 데이터 손상!
    mapping(address => bool) public burners;
}
```

#### 5. 상속 순서 변경

```solidity
// ❌ 잘못된 예시
contract SelaPowerV2 is 
    PausableUpgradeable,  // 순서가
    OwnableUpgradeable,   // 바뀌면
    ERC20Upgradeable {    // 안됨!
}
```

### ✅ 안전하게 할 수 있는 것들

#### 1. 새 변수는 맨 끝에 추가

```solidity
// ✅ 올바른 예시
contract SelaPowerV2 {
    // 기존 변수들 (순서 그대로)
    mapping(address => bool) public minters;
    mapping(address => bool) public burners;
    
    // 새 변수들 (맨 끝에 추가)
    mapping(address => bool) public lockedAccounts;
    mapping(address => uint256) public stakingRewards;
    uint256 public lastUpdateTime;
}
```

#### 2. 새 함수 자유롭게 추가

```solidity
// ✅ 올바른 예시
function lockAccount(address _account) external onlyOwner {
    lockedAccounts[_account] = true;
}

function getAccountStatus(address _account) external view returns (bool, uint256) {
    return (lockedAccounts[_account], stakingRewards[_account]);
}
```

#### 3. 기존 함수 로직 수정

```solidity
// ✅ 올바른 예시
function mint(address _to, uint256 _amount) external onlyMinter {
    // 새로운 체크 로직 추가
    require(!lockedAccounts[_to], "Account is locked");
    
    // 기존 로직
    _mint(_to, _amount);
    emit TokensMinted(_to, _amount, msg.sender);
}
```

#### 4. 새 이벤트 추가

```solidity
// ✅ 올바른 예시
event AccountLocked(address indexed account);
event RewardsClaimed(address indexed user, uint256 amount);
```

#### 5. 새 modifier 추가

```solidity
// ✅ 올바른 예시
modifier notLocked(address _account) {
    require(!lockedAccounts[_account], "Account is locked");
    _;
}
```

### 스토리지 레이아웃 시각화

```
슬롯 0: ERC20 name
슬롯 1: ERC20 symbol
슬롯 2: ERC20 totalSupply
슬롯 3: ERC20 balances mapping
...
슬롯 N: minters mapping        ← 절대 변경 금지
슬롯 N+1: burners mapping       ← 절대 변경 금지
슬롯 N+2: lockedAccounts       ← v2.0.0에서 추가 (OK)
슬롯 N+3: 미래 변수            ← v3.0.0에서 추가 가능
```

---

## 실전 예제

### 예제 1: 스테이킹 보상 기능 추가

```solidity
contract SelaPowerV3 is ... {
    // 기존 변수들
    mapping(address => bool) public minters;
    mapping(address => bool) public burners;
    mapping(address => bool) public lockedAccounts;  // v2.0.0
    
    // v3.0.0 새 변수들
    mapping(address => uint256) public stakedAmount;
    mapping(address => uint256) public rewardDebt;
    uint256 public totalStaked;
    uint256 public rewardPerToken;
    
    // 새 이벤트
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);
    
    // 새 함수
    function stake(uint256 _amount) external {
        require(_amount > 0, "Amount must be > 0");
        require(!lockedAccounts[msg.sender], "Account locked");
        
        _transfer(msg.sender, address(this), _amount);
        stakedAmount[msg.sender] += _amount;
        totalStaked += _amount;
        
        emit Staked(msg.sender, _amount);
    }
    
    function unstake(uint256 _amount) external {
        require(stakedAmount[msg.sender] >= _amount, "Insufficient stake");
        
        stakedAmount[msg.sender] -= _amount;
        totalStaked -= _amount;
        _transfer(address(this), msg.sender, _amount);
        
        emit Unstaked(msg.sender, _amount);
    }
    
    function version() public pure override returns (string memory) {
        return "3.0.0";
    }
}
```

### 예제 2: 거래 수수료 기능 추가

```solidity
contract SelaPowerV4 is ... {
    // 기존 모든 변수들...
    
    // v4.0.0 새 변수들
    uint256 public transferFeeRate;  // 10000 = 100%
    address public feeCollector;
    mapping(address => bool) public feeExempt;
    
    event FeeRateUpdated(uint256 oldRate, uint256 newRate);
    event FeeCollected(address indexed from, address indexed to, uint256 fee);
    
    function setTransferFeeRate(uint256 _rate) external onlyOwner {
        require(_rate <= 1000, "Fee too high"); // 최대 10%
        emit FeeRateUpdated(transferFeeRate, _rate);
        transferFeeRate = _rate;
    }
    
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        if (!feeExempt[from] && transferFeeRate > 0) {
            uint256 fee = (amount * transferFeeRate) / 10000;
            uint256 amountAfterFee = amount - fee;
            
            super._transfer(from, to, amountAfterFee);
            super._transfer(from, feeCollector, fee);
            
            emit FeeCollected(from, to, fee);
        } else {
            super._transfer(from, to, amount);
        }
    }
    
    function version() public pure override returns (string memory) {
        return "4.0.0";
    }
}
```

---

## 문제 해결

### 문제 1: "Invalid storage layout" 오류

**증상:**
```
Error: New storage layout is incompatible
```

**원인:**
- 기존 변수의 순서를 변경했거나
- 기존 변수의 타입을 변경했거나
- 기존 변수를 삭제했을 때

**해결방법:**
```solidity
// 잘못된 코드를 되돌리고
// 새 변수는 맨 끝에 추가
contract SelaPower {
    // 기존 변수 순서 그대로 유지
    mapping(address => bool) public minters;
    mapping(address => bool) public burners;
    
    // 새 변수는 끝에
    mapping(address => bool) public newFeature;
}
```

### 문제 2: "Function clash" 오류

**증상:**
```
Error: Function selector clash
```

**원인:**
- 새 함수의 시그니처가 기존 함수와 충돌

**해결방법:**
```solidity
// 함수 이름 변경
// 잘못: lockAccount(address)
// 수정: lockUserAccount(address)
function lockUserAccount(address _account) external {
    ...
}
```

### 문제 3: "Not the owner" 오류

**증상:**
```
Error: caller is not the owner
```

**원인:**
- 업그레이드 권한이 없는 계정으로 시도

**해결방법:**
```bash
# 올바른 owner 계정의 private key 사용
# .env 파일 확인
PRIVATE_KEY=0xYOUR_OWNER_PRIVATE_KEY

# 또는 hardhat console에서 owner 계정으로 전환
```

### 문제 4: 가스 부족

**증상:**
```
Error: Transaction ran out of gas
```

**해결방법:**
```javascript
// hardhat.config.js에서 가스 한도 증가
module.exports = {
  networks: {
    monad_testnet: {
      gas: 8000000,  // 가스 한도 증가
      gasPrice: 20000000000,
    }
  }
};
```

### 문제 5: 업그레이드 후 기존 데이터 손실

**증상:**
- 잔액이 0으로 표시됨
- 권한 설정이 초기화됨

**원인:**
- 스토리지 레이아웃 규칙 위반

**해결방법:**
```bash
# 즉시 이전 버전으로 롤백
SELA_POWER_PROXY_ADDRESS=0x... \
  npx hardhat run scripts/rollback.js --network monad_testnet

# 코드 수정 후 다시 업그레이드
```

---

## 보안 체크리스트

### 배포 전 체크리스트

#### 코드 검토
- [ ] 스토리지 레이아웃 규칙 준수 확인
- [ ] 새 변수가 맨 끝에 추가되었는지 확인
- [ ] 기존 변수 순서/타입 변경 없음 확인
- [ ] 버전 번호 업데이트 확인
- [ ] 주석과 문서 업데이트

#### 테스트
- [ ] 로컬 네트워크에서 테스트 완료
- [ ] `upgrade:validate` 통과 확인
- [ ] 기존 기능 정상 작동 확인
- [ ] 새 기능 정상 작동 확인
- [ ] 가스 비용 증가 확인
- [ ] 이벤트 로그 확인

#### 테스트넷 배포
- [ ] 테스트넷에서 업그레이드 성공
- [ ] 기존 데이터 보존 확인
- [ ] 프론트엔드 통합 테스트
- [ ] 최소 24-48시간 모니터링

#### 보안
- [ ] 코드 리뷰 완료 (최소 2명)
- [ ] 외부 감사 (필요시)
- [ ] Owner 키 안전하게 보관
- [ ] 멀티시그 지갑 사용 (권장)
- [ ] 롤백 계획 준비

#### 문서화
- [ ] 변경사항 문서화
- [ ] 업그레이드 공지 준비
- [ ] ABI 변경사항 기록
- [ ] 버전 히스토리 업데이트

### 메인넷 배포 체크리스트

- [ ] 위의 모든 체크리스트 완료
- [ ] 팀 전체 승인
- [ ] 업그레이드 시간 공지 (24시간 전)
- [ ] 긴급 연락망 준비
- [ ] 롤백 절차 숙지
- [ ] 모니터링 시스템 준비

---

## 버전 히스토리

### v1.0.0 (초기 릴리스)
**배포일:** 2024-XX-XX

**기능:**
- ERC20 기본 기능
- 무제한 민팅
- 권한 기반 민팅/버닝
- 오너의 강제 소각
- 일시정지 기능
- 배치 민팅
- UUPS 업그레이드 패턴

### v2.0.0 (계정 잠금 기능)
**예정일:** 2024-XX-XX

**추가 기능:**
- 계정 잠금/잠금 해제
- 잠긴 계정의 전송 차단
- 계정 상태 조회

**변경사항:**
- `lockedAccounts` 매핑 추가
- `lockAccount()`, `unlockAccount()`, `isLocked()` 함수 추가
- `_beforeTokenTransfer()` 로직 수정
- `AccountLocked`, `AccountUnlocked` 이벤트 추가

### v3.0.0 (스테이킹 기능) - 계획
**예정일:** TBD

**추가 예정 기능:**
- 토큰 스테이킹
- 스테이킹 보상
- 보상 청구

---

## 추가 리소스

### 공식 문서
- [OpenZeppelin Upgrades Plugins](https://docs.openzeppelin.com/upgrades-plugins)
- [UUPS Proxy Pattern](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable)
- [Writing Upgradeable Contracts](https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable)

### 도구
```bash
# 스토리지 레이아웃 확인
npx hardhat upgrades:validate

# 컨트랙트 검증
npx hardhat verify --network monad_testnet DEPLOYED_ADDRESS

# 가스 리포트
REPORT_GAS=true npm run test
```

### 커뮤니티
- GitHub Issues: [프로젝트 Issues]
- Discord: [커뮤니티 링크]
- 기술 지원: [지원 이메일]

---

## 긴급 연락처

업그레이드 중 문제 발생 시:

1. **즉시 일시정지**: `pause()` 함수 호출
2. **팀에 연락**: [긴급 연락처]
3. **롤백 고려**: 필요시 이전 버전으로 롤백
4. **커뮤니티 공지**: 사용자에게 상황 공지

---

## 면책 조항

이 가이드는 참고용으로 제공됩니다. 스마트 컨트랙트 업그레이드는 복잡한 작업이며, 실수 시 자금 손실이 발생할 수 있습니다. 

**중요:**
- 메인넷 배포 전 반드시 충분한 테스트를 수행하세요
- 외부 감사를 받는 것을 권장합니다
- 업그레이드는 신중하게 진행하세요
- 불확실한 경우 전문가의 도움을 받으세요

---

**마지막 업데이트:** 2024-11-21  
**가이드 버전:** 1.0.0

