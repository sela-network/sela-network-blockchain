# Sela Network Blockchain Smart Contracts

Core smart contracts for Sela network.

## Contract Overview

### 1. SelaDataIntegrityRegistry.sol

Hash value storage and verification contract for preventing tampering of scraped data in Sela network

**Main Features:**

- Safely store data hash values on blockchain
- Verify tampering by comparing original data with stored hash values
- Query and manage hash information
- Prevent duplicate hashes

**Core Functions:**

- `storeHash()`: Store hash value
- `verifyDataByHashId()`: Verify data by hash ID
- `verifyDataByHash()`: Direct verification by hash value
- `getHashInfo()`: Query hash information

### 2. SelaPoint.sol

Sela network point token (ERC20 based)

**Main Features:**

- Point token with unlimited minting capability
- Owner can burn tokens from other accounts
- Minter/burner permission management system
- Pause functionality
- Batch mint support

**Core Functions:**

- `mint()`: Mint tokens
- `burn()`: Burn own tokens
- `burnFrom()`: Burn tokens from other accounts (requires permission)
- `ownerBurn()`: Owner's forced burn
- `batchMint()`: Batch mint

### 3. SelaWallet.sol & SelaWalletFactory.sol

Account Abstraction based smart wallet system

**Main Features:**

- ERC-4337 based Account Abstraction implementation
- Independent factory contract for each DApp
- Factory address serves as DApp identifier (no dappId needed)
- Deterministic address generation through CREATE2
- Signature-based transaction execution
- Multi-executor permission management
- Pagination support

**SelaWalletFactory Core Functions:**

- `createWallet()`: Create smart wallet
- `computeWalletAddress()`: Pre-calculate wallet address
- `getAllWallets()`: Query all wallets created by factory
- `getUserWallets()`: Query specific user's wallets
- `getWalletsPaginated()`: Paginated wallet query

**SelaWallet Core Functions:**

- `execute()`: Execute transaction
- `executeBatch()`: Execute batch transactions
- `executeWithSignature()`: Execute after signature verification
- `addExecutor()`: Add executor permission

## Installation and Setup

### 1. Install Dependencies

```bash
cd monad
npm install
```

### 2. Environment Variable Setup

```bash
cp .env.example .env
# Edit .env file to set necessary values
```

### 3. Compile Contracts

```bash
npm run compile
```

### 4. Run Tests

```bash
# All tests
npm run test

# Individual contract tests
npm run test:data      # SelaDataIntegrityRegistry test
npm run test:point     # SelaPoint test
npm run test:wallet    # SelaWallet test

# Core contract tests (data integrity + point)
npm run test:core
```

## Deployment

### Deploy to Local Testnet

```bash
# Start local Hardhat node
npm run node

# Deploy in new terminal
npm run deploy:local
```

### Deploy to Monad Testnet

```bash
npm run deploy -- --network monad_testnet
```

### Deploy to Monad Mainnet

```bash
npm run deploy -- --network monad_mainnet
```

### Run Account Abstraction Example

```bash
# Run example on local testnet
npm run example:wallet:local

# Run example on Monad testnet
npm run example:wallet -- --network monad_testnet
```

## Usage Examples

### SelaDataIntegrityRegistry Usage

```javascript
// Store hash of scraped data
const scrapedData = "Scraped social media post data";
const description = "Twitter post - User ID: 12345";
const tx = await selaDataIntegrityRegistry.storeStringHash(
  scrapedData,
  description
);
const receipt = await tx.wait();

// Verify data integrity
const hashId = 1;
const originalData = ethers.toUtf8Bytes("Scraped social media post data");
const isValid = await selaDataIntegrityRegistry.verifyDataByHashId(
  hashId,
  originalData
);
```

### SelaPoint Usage

```javascript
// Mint tokens
const recipient = "0x1234...";
const amount = ethers.parseEther("100"); // 100 Sela
await selaPoint.mint(recipient, amount);

// Burn tokens from other account (requires owner permission)
const targetAccount = "0x5678...";
const burnAmount = ethers.parseEther("50"); // 50 Sela
await selaPoint.burnFrom(targetAccount, burnAmount);

// Grant minter permission
const newMinter = "0x9abc...";
await selaPoint.addMinter(newMinter);
```

### Account Abstraction Usage

```javascript
// Deploy independent factory for each DApp
const SelaWalletFactory = await ethers.getContractFactory("SelaWalletFactory");
const myDAppFactory = await SelaWalletFactory.deploy();

// Create smart wallet
const salt = 12345;
const tx = await myDAppFactory.createWallet(userAddress, salt);

// Execute transaction with created wallet
const SelaWallet = await ethers.getContractFactory("SelaWallet");
const wallet = SelaWallet.attach(walletAddress);

await wallet.execute(
  targetAddress, // Address to call
  ethers.parseEther("0.1"), // ETH to send
  "0x" // Call data
);

// Query all wallets created by this DApp
const allWallets = await myDAppFactory.getAllWallets();

// Factory address serves as DApp identifier
console.log("DApp identifier:", await myDAppFactory.getAddress());
```

## Security Considerations

1. **SelaDataIntegrityRegistry**

   - Hash values of scraped data are immutable, so careful review before storage is required
   - Original scraped data should be stored safely separately
   - Data source information should be clearly recorded in description

2. **SelaPoint**

   - Owner account security is very important (has permission to burn tokens from other accounts)
   - Careful review required when granting minter/burner permissions
   - Pause function should only be used in emergency situations

3. **Account Abstraction**
   - Smart wallet owner key management is critical
   - Careful review required when granting executor permissions
   - Nonce management is important for signature-based execution (replay attack prevention)
   - Independent factory deployment recommended for each DApp

## Network Information

- **Monad Testnet**: Chain ID 41454 (example)
- **Monad Mainnet**: Chain ID 41455 (example)

_Please refer to the official Monad documentation for actual chain IDs and RPC URLs._

## License

MIT License
