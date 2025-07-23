// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SelaDataIntegrityRegistry
 * @dev Hash value storage and verification contract for preventing tampering of scraped data in Sela network
 * Provides functionality to ensure integrity of scraped data and verify data tampering
 */
contract SelaDataIntegrityRegistry is Ownable, ReentrancyGuard {
    
    // Structure for storing hash information
    struct HashInfo {
        bytes32 dataHash;      // Hash value of scraped data
        address submitter;     // Data submitter address
        uint256 timestamp;     // Storage time
        string description;    // Description of data (source, type, etc.)
        bool exists;          // Hash existence flag
    }
    
    // Hash ID to hash info mapping
    mapping(uint256 => HashInfo) public hashRegistry;
    
    // Hash value to ID mapping (for duplicate prevention)
    mapping(bytes32 => uint256) public hashToId;
    
    // Next hash ID
    uint256 public nextHashId = 1;
    
    // Event definitions
    event HashStored(uint256 indexed hashId, bytes32 indexed dataHash, address indexed submitter, string description);
    event HashVerified(uint256 indexed hashId, bytes32 indexed dataHash, bool isValid);
    
    constructor() {
        _transferOwnership(msg.sender);
    }
    
    /**
     * @dev Store data hash value (internal function)
     * @param _dataHash Hash value of data to store
     * @param _description Description of the hash
     * @return hashId ID of stored hash
     */
    function _storeHashInternal(bytes32 _dataHash, string memory _description) 
        internal 
        returns (uint256 hashId) 
    {
        require(_dataHash != bytes32(0), "Hash cannot be empty");
        require(hashToId[_dataHash] == 0, "Hash already exists");
        
        hashId = nextHashId++;
        
        hashRegistry[hashId] = HashInfo({
            dataHash: _dataHash,
            submitter: msg.sender,
            timestamp: block.timestamp,
            description: _description,
            exists: true
        });
        
        hashToId[_dataHash] = hashId;
        
        emit HashStored(hashId, _dataHash, msg.sender, _description);
    }

    /**
     * @dev Store data hash value
     * @param _dataHash Hash value of data to store
     * @param _description Description of the hash
     * @return hashId ID of stored hash
     */
    function storeHash(bytes32 _dataHash, string memory _description) 
        public 
        nonReentrant 
        returns (uint256 hashId) 
    {
        return _storeHashInternal(_dataHash, _description);
    }
    
    /**
     * @dev Verify by comparing original data with stored hash value
     * @param _hashId Hash ID to verify
     * @param _originalData Original data
     * @return isValid Verification result
     */
    function verifyDataByHashId(uint256 _hashId, bytes memory _originalData) 
        external 
        returns (bool isValid) 
    {
        require(hashRegistry[_hashId].exists, "Hash ID does not exist");
        
        bytes32 computedHash = keccak256(_originalData);
        isValid = (hashRegistry[_hashId].dataHash == computedHash);
        
        emit HashVerified(_hashId, computedHash, isValid);
    }
    
    /**
     * @dev Verify by directly comparing hash values
     * @param _dataHash Hash value to compare
     * @param _originalData Original data
     * @return isValid Verification result
     */
    function verifyDataByHash(bytes32 _dataHash, bytes memory _originalData) 
        external 
        pure 
        returns (bool isValid) 
    {
        bytes32 computedHash = keccak256(_originalData);
        isValid = (_dataHash == computedHash);
    }
    
    /**
     * @dev Get hash information by hash ID
     * @param _hashId Hash ID to query
     * @return hashInfo Hash information
     */
    function getHashInfo(uint256 _hashId) 
        external 
        view 
        returns (HashInfo memory hashInfo) 
    {
        require(hashRegistry[_hashId].exists, "Hash ID does not exist");
        return hashRegistry[_hashId];
    }
    
    /**
     * @dev Get hash ID by hash value
     * @param _dataHash Hash value to query
     * @return hashId Hash ID (0 if doesn't exist)
     */
    function getHashId(bytes32 _dataHash) 
        external 
        view 
        returns (uint256 hashId) 
    {
        return hashToId[_dataHash];
    }
    
    /**
     * @dev Check if hash exists
     * @param _dataHash Hash value to check
     * @return exists Existence flag
     */
    function hashExists(bytes32 _dataHash) 
        external 
        view 
        returns (bool exists) 
    {
        return hashToId[_dataHash] != 0;
    }
    
    /**
     * @dev Check if hash ID exists
     * @param _hashId Hash ID to check
     * @return exists Existence flag
     */
    function hashIdExists(uint256 _hashId) 
        external 
        view 
        returns (bool exists) 
    {
        return hashRegistry[_hashId].exists;
    }
    
    /**
     * @dev Convenience function to calculate and store hash value of string data
     * @param _data String data to hash
     * @param _description Description of the hash
     * @return hashId ID of stored hash
     */
    function storeStringHash(string memory _data, string memory _description) 
        external 
        nonReentrant 
        returns (uint256 hashId) 
    {
        bytes32 dataHash = keccak256(abi.encodePacked(_data));
        return _storeHashInternal(dataHash, _description);
    }
} 