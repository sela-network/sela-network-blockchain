# SelaPower Upgrade Guide

SelaPower is an upgradeable contract using the UUPS (Universal Upgradeable Proxy Standard) pattern.

## Overview

The contract consists of:
- **Proxy Contract**: Fixed address that users interact with
- **Implementation Contract**: Contains the actual logic, can be upgraded

## Key Benefits

✅ **Seamless Upgrades**: Add new features without changing the contract address  
✅ **State Preservation**: All token balances and data remain intact  
✅ **No User Action Required**: Users don't need to migrate or approve anything  
✅ **Security**: Only the contract owner can upgrade  

## Upgrade Process

### 1. Validate the Upgrade (Mandatory)

Before upgrading, ALWAYS validate compatibility:

```bash
# Set the proxy address
export SELA_POWER_PROXY_ADDRESS=0x...

# Validate upgrade
npm run upgrade:validate
```

This checks:
- Storage layout compatibility
- Function signature conflicts
- Initialization issues

### 2. Perform the Upgrade

If validation passes:

```bash
# Upgrade the contract
npm run upgrade:power

# Or with network specification
SELA_POWER_PROXY_ADDRESS=0x... npx hardhat run scripts/upgradeSelaPower.js --network monad_testnet
```

### 3. Verify the Upgrade

After upgrading:
1. Check the new implementation address
2. Verify contract state is preserved
3. Test new functionality
4. Update frontend/backend ABI if needed

## Creating a New Version

### Step 1: Modify the Contract

Edit `contracts/SelaPower.sol`:

```solidity
contract SelaPower is ... {
    // IMPORTANT: Never change the order of existing storage variables!
    mapping(address => bool) public minters;  // Must stay in same position
    mapping(address => bool) public burners;  // Must stay in same position
    
    // ✅ You can add NEW variables at the end
    mapping(address => bool) public lockedAccounts; // New feature
    
    // ✅ You can add new functions
    function lockAccount(address _account) external onlyOwner {
        lockedAccounts[_account] = true;
    }
    
    // ✅ You can modify existing function logic
    function mint(address _to, uint256 _amount) external onlyMinter {
        require(!lockedAccounts[_to], "Account is locked"); // New check
        // ... rest of function
    }
    
    // ✅ Update version number
    function version() public pure override returns (string memory) {
        return "2.0.0"; // Increment version
    }
}
```

### Step 2: Test Locally

```bash
# Start local node
npm run node

# In another terminal, deploy
npm run deploy:local

# Save the proxy address, then test upgrade
SELA_POWER_PROXY_ADDRESS=0x... npm run upgrade:validate
SELA_POWER_PROXY_ADDRESS=0x... npm run upgrade:power
```

### Step 3: Deploy to Testnet

```bash
# Validate
SELA_POWER_PROXY_ADDRESS=0x... npx hardhat run scripts/validateUpgrade.js --network monad_testnet

# Upgrade
SELA_POWER_PROXY_ADDRESS=0x... npx hardhat run scripts/upgradeSelaPower.js --network monad_testnet
```

## Storage Layout Rules ⚠️

**CRITICAL**: These rules MUST be followed to prevent data corruption:

### ❌ DO NOT:
```solidity
// DON'T change the order of existing variables
mapping(address => bool) public burners;  // Was second
mapping(address => bool) public minters;  // Was first - WRONG!

// DON'T change the type of existing variables
mapping(address => uint256) public minters;  // Was bool - WRONG!

// DON'T remove existing variables
// mapping(address => bool) public minters;  // Commented out - WRONG!

// DON'T insert variables in the middle
mapping(address => bool) public minters;
mapping(address => bool) public newFeature;  // Inserted - WRONG!
mapping(address => bool) public burners;
```

### ✅ DO:
```solidity
// Existing variables (unchanged)
mapping(address => bool) public minters;
mapping(address => bool) public burners;

// New variables (added at the end)
mapping(address => bool) public lockedAccounts;
mapping(address => uint256) public stakingRewards;

// Modify function logic freely
function mint(...) { /* new logic */ }

// Add new functions
function newFeature() external { ... }
```

## Rollback

If something goes wrong, you can upgrade back to the previous implementation:

1. Keep the old implementation address
2. Deploy it as a "new" version
3. Upgrade to that address

```bash
# In upgradeSelaPower.js, modify to:
const OldSelaPower = await ethers.getContractAt("SelaPower", OLD_IMPLEMENTATION_ADDRESS);
await upgrades.upgradeProxy(PROXY_ADDRESS, OldSelaPower);
```

## Security Checklist

Before mainnet upgrade:

- [ ] Validate upgrade passes (`npm run upgrade:validate`)
- [ ] Test upgrade on local network
- [ ] Test upgrade on testnet
- [ ] Verify storage layout hasn't changed
- [ ] Test all existing functions still work
- [ ] Test new functions work correctly
- [ ] Check gas costs haven't increased significantly
- [ ] Review code changes with team
- [ ] Update version number
- [ ] Document breaking changes (if any)
- [ ] Prepare frontend/backend updates

## Common Issues

### "Invalid storage layout"
- You changed the order/type of existing storage variables
- Solution: Revert storage changes, add new variables at the end

### "Function clashes"
- New function has same selector as existing function
- Solution: Rename the new function

### "Not the owner"
- Only the contract owner can upgrade
- Solution: Use the owner wallet to perform upgrade

## Getting Help

- Read OpenZeppelin Upgrades documentation: https://docs.openzeppelin.com/upgrades-plugins
- Check storage layout: Use `npx hardhat upgrades:validate`
- Community support: [Your support channel]

## Version History

### v1.0.0 (Initial Release)
- Basic ERC20 functionality
- Minting/burning with permissions
- Pause functionality
- Batch minting
- UUPS upgradeable pattern

### Future Versions
Document your changes here as you upgrade.

