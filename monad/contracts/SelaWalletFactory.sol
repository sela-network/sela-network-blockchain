// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "./SelaWallet.sol";

/**
 * @title SelaWalletFactory
 * @dev Factory contract for creating smart wallets
 * @notice Independent factory that each DApp deploys and uses
 */
contract SelaWalletFactory is Ownable, ReentrancyGuard {
    
    // User wallet addresses
    mapping(address => address[]) public userWallets;
    
    // Wallet address -> wallet info mapping
    mapping(address => WalletInfo) public walletInfos;
    
    // Created wallets
    address[] public allWallets;
    
    // Wallet info structure
    struct WalletInfo {
        address owner;
        uint256 createdAt;
        bool exists;
    }
    
    // Event definitions
    event WalletCreated(
        address indexed user, 
        address indexed walletAddress,
        uint256 salt
    );
    
    constructor() {
        _transferOwnership(msg.sender);
    }
    
    /**
     * @dev Create smart wallet (using CREATE2)
     * @param owner Wallet owner
     * @param salt Salt value (for deterministic address generation)
     */
    function createWallet(
        address owner, 
        uint256 salt
    ) external nonReentrant returns (address walletAddress) {
        require(owner != address(0), "Owner cannot be zero address");
        
        // Generate deterministic address using CREATE2
        bytes32 saltHash = keccak256(abi.encodePacked(owner, salt));
        bytes memory bytecode = abi.encodePacked(
            type(SelaWallet).creationCode,
            abi.encode(owner)
        );
        
        walletAddress = Create2.deploy(0, saltHash, bytecode);
        
        // Store wallet info
        walletInfos[walletAddress] = WalletInfo({
            owner: owner,
            createdAt: block.timestamp,
            exists: true
        });
        
        // Add to user wallet list
        userWallets[owner].push(walletAddress);
        
        // Add to all wallets list
        allWallets.push(walletAddress);
        
        emit WalletCreated(owner, walletAddress, salt);
    }
    
    /**
     * @dev Compute wallet address in advance (check address before deployment)
     * @param owner Wallet owner
     * @param salt Salt value
     */
    function computeWalletAddress(
        address owner,
        uint256 salt
    ) external view returns (address) {
        bytes32 saltHash = keccak256(abi.encodePacked(owner, salt));
        bytes memory bytecode = abi.encodePacked(
            type(SelaWallet).creationCode,
            abi.encode(owner)
        );
        
        return Create2.computeAddress(saltHash, keccak256(bytecode));
    }
    
    /**
     * @dev Get user's wallet list
     * @param user User address
     */
    function getUserWallets(address user) external view returns (address[] memory) {
        return userWallets[user];
    }
    
    /**
     * @dev Get all wallet list
     */
    function getAllWallets() external view returns (address[] memory) {
        return allWallets;
    }
    
    /**
     * @dev Get user's wallet count
     * @param user User address
     */
    function getUserWalletCount(address user) external view returns (uint256) {
        return userWallets[user].length;
    }
    
    /**
     * @dev Get total wallet count
     */
    function getTotalWalletCount() external view returns (uint256) {
        return allWallets.length;
    }
    
    /**
     * @dev Get wallet info
     * @param walletAddress Wallet address
     */
    function getWalletInfo(address walletAddress) external view returns (
        address owner,
        uint256 createdAt,
        bool exists
    ) {
        WalletInfo memory info = walletInfos[walletAddress];
        return (info.owner, info.createdAt, info.exists);
    }
    
    /**
     * @dev Check if wallet exists
     * @param walletAddress Wallet address to check
     */
    function isWalletExists(address walletAddress) external view returns (bool) {
        return walletInfos[walletAddress].exists;
    }
    
    /**
     * @dev Get wallet list with pagination
     * @param offset Start index
     * @param limit Number to fetch
     */
    function getWalletsPaginated(uint256 offset, uint256 limit) 
        external 
        view 
        returns (address[] memory wallets, uint256 total) 
    {
        total = allWallets.length;
        
        if (offset >= total) {
            return (new address[](0), total);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        wallets = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            wallets[i - offset] = allWallets[i];
        }
    }
    
    /**
     * @dev Get user wallets with pagination
     * @param user User address
     * @param offset Start index
     * @param limit Number to fetch
     */
    function getUserWalletsPaginated(address user, uint256 offset, uint256 limit) 
        external 
        view 
        returns (address[] memory wallets, uint256 total) 
    {
        address[] memory userWalletList = userWallets[user];
        total = userWalletList.length;
        
        if (offset >= total) {
            return (new address[](0), total);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        wallets = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            wallets[i - offset] = userWalletList[i];
        }
    }
} 