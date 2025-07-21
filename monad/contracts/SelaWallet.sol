// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title SelaWallet
 * @dev Account Abstraction based smart wallet contract
 */
contract SelaWallet is ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Wallet owner
    address public owner;
    
    // Factory contract address
    address public factory;
    
    // Authorized executors (addresses that can execute transactions besides owner)
    mapping(address => bool) public authorizedExecutors;
    
    // Used nonces (to prevent replay attacks)
    mapping(uint256 => bool) public usedNonces;
    
    // Wallet creation time
    uint256 public createdAt;
    
    // Event definitions
    event Executed(address indexed target, uint256 value, bytes data, bool success);
    event OwnerChanged(address indexed previousOwner, address indexed newOwner);
    event ExecutorAdded(address indexed executor);
    event ExecutorRemoved(address indexed executor);
    event Received(address indexed sender, uint256 value);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            msg.sender == owner || authorizedExecutors[msg.sender],
            "Not authorized to execute"
        );
        _;
    }
    
    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory can call this function");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _owner Wallet owner address
     */
    constructor(address _owner) {
        require(_owner != address(0), "Owner cannot be zero address");
        
        owner = _owner;
        factory = msg.sender;
        createdAt = block.timestamp;
        
        // Add owner as default executor
        authorizedExecutors[_owner] = true;
    }
    
    /**
     * @dev Called when receiving ether
     */
    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
    
    /**
     * @dev Execute transaction
     * @param target Contract address to call
     * @param value Ether value to send
     * @param data Call data
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyAuthorized nonReentrant returns (bool success) {
        require(target != address(0), "Target cannot be zero address");
        
        (success, ) = target.call{value: value}(data);
        emit Executed(target, value, data, success);
    }
    
    /**
     * @dev Execute batch transactions
     * @param targets Contract addresses to call
     * @param values Ether values to send
     * @param datas Call data array
     */
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external onlyAuthorized nonReentrant {
        require(
            targets.length == values.length && values.length == datas.length,
            "Array lengths must match"
        );
        
        for (uint256 i = 0; i < targets.length; i++) {
            require(targets[i] != address(0), "Target cannot be zero address");
            
            (bool success, ) = targets[i].call{value: values[i]}(datas[i]);
            emit Executed(targets[i], values[i], datas[i], success);
        }
    }
    
    /**
     * @dev Execute transaction with signature verification
     * @param target Contract address to call
     * @param value Ether value to send
     * @param data Call data
     * @param nonce Nonce
     * @param signature Owner's signature
     */
    function executeWithSignature(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 nonce,
        bytes calldata signature
    ) external nonReentrant returns (bool success) {
        require(!usedNonces[nonce], "Nonce already used");
        require(target != address(0), "Target cannot be zero address");
        
        // Generate message hash
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                address(this),
                target,
                value,
                data,
                nonce,
                block.chainid
            )
        );
        
        // Verify signature
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        require(signer == owner, "Invalid signature");
        
        // Mark nonce as used
        usedNonces[nonce] = true;
        
        // Execute transaction
        (success, ) = target.call{value: value}(data);
        emit Executed(target, value, data, success);
    }
    
    /**
     * @dev Change owner
     * @param newOwner New owner address
     */
    function changeOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        require(newOwner != owner, "New owner must be different");
        
        address previousOwner = owner;
        owner = newOwner;
        
        // Remove previous owner's executor privilege and grant to new owner
        authorizedExecutors[previousOwner] = false;
        authorizedExecutors[newOwner] = true;
        
        emit OwnerChanged(previousOwner, newOwner);
        emit ExecutorRemoved(previousOwner);
        emit ExecutorAdded(newOwner);
    }
    
    /**
     * @dev Add executor
     * @param executor Executor address to add
     */
    function addExecutor(address executor) external onlyOwner {
        require(executor != address(0), "Executor cannot be zero address");
        require(!authorizedExecutors[executor], "Executor already authorized");
        
        authorizedExecutors[executor] = true;
        emit ExecutorAdded(executor);
    }
    
    /**
     * @dev Remove executor
     * @param executor Executor address to remove
     */
    function removeExecutor(address executor) external onlyOwner {
        require(executor != owner, "Cannot remove owner");
        require(authorizedExecutors[executor], "Executor not authorized");
        
        authorizedExecutors[executor] = false;
        emit ExecutorRemoved(executor);
    }
    
    /**
     * @dev Get wallet balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get wallet information
     */
    function getWalletInfo() external view returns (
        address _owner,
        address _factory,
        uint256 _createdAt,
        uint256 _balance
    ) {
        return (owner, factory, createdAt, address(this).balance);
    }
    
    /**
     * @dev Check if nonce is used
     * @param nonce Nonce to check
     */
    function isNonceUsed(uint256 nonce) external view returns (bool) {
        return usedNonces[nonce];
    }
    
    /**
     * @dev Check executor authorization
     * @param executor Address to check
     */
    function isAuthorizedExecutor(address executor) external view returns (bool) {
        return authorizedExecutors[executor];
    }
} 