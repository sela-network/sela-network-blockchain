// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title SelaPoint
 * @dev Sela network point token - unlimited minting possible, owner can burn tokens from other accounts
 */
contract SelaPoint is ERC20, Ownable, Pausable {
    
    // Addresses with minter privileges
    mapping(address => bool) public minters;
    
    // Addresses with burner privileges (excluding owner)
    mapping(address => bool) public burners;
    
    // Event definitions
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event BurnerAdded(address indexed burner);
    event BurnerRemoved(address indexed burner);
    event TokensMinted(address indexed to, uint256 amount, address indexed minter);
    event TokensBurned(address indexed from, uint256 amount, address indexed burner);
    event OwnerBurn(address indexed from, uint256 amount);
    
    // Modifiers
    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "Not authorized to mint");
        _;
    }
    
    modifier onlyBurner() {
        require(burners[msg.sender] || msg.sender == owner(), "Not authorized to burn");
        _;
    }
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) ERC20(_name, _symbol) {
        _transferOwnership(msg.sender);
        // Mint initial supply to contract deployer
        if (_initialSupply > 0) {
            _mint(msg.sender, _initialSupply);
        }
        
        // Set deployer as default minter
        minters[msg.sender] = true;
    }
    
    /**
     * @dev Mint tokens (unlimited)
     * @param _to Address to receive tokens
     * @param _amount Amount of tokens to mint
     */
    function mint(address _to, uint256 _amount) 
        external 
        onlyMinter 
        whenNotPaused 
    {
        require(_to != address(0), "Cannot mint to zero address");
        require(_amount > 0, "Amount must be greater than 0");
        
        _mint(_to, _amount);
        emit TokensMinted(_to, _amount, msg.sender);
    }
    
    /**
     * @dev Burn own tokens
     * @param _amount Amount of tokens to burn
     */
    function burn(uint256 _amount) 
        external 
        whenNotPaused 
    {
        require(_amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= _amount, "Insufficient balance");
        
        _burn(msg.sender, _amount);
        emit TokensBurned(msg.sender, _amount, msg.sender);
    }
    
    /**
     * @dev Burn tokens from another account (owner or authorized burner only)
     * @param _from Target address to burn tokens from
     * @param _amount Amount of tokens to burn
     */
    function burnFrom(address _from, uint256 _amount) 
        external 
        onlyBurner 
        whenNotPaused 
    {
        require(_from != address(0), "Cannot burn from zero address");
        require(_amount > 0, "Amount must be greater than 0");
        require(balanceOf(_from) >= _amount, "Insufficient balance");
        
        _burn(_from, _amount);
        emit TokensBurned(_from, _amount, msg.sender);
    }
    
    /**
     * @dev Owner force burns tokens from another account (for emergency situations)
     * @param _from Target address to burn tokens from
     * @param _amount Amount of tokens to burn
     */
    function ownerBurn(address _from, uint256 _amount) 
        external 
        onlyOwner 
    {
        require(_from != address(0), "Cannot burn from zero address");
        require(_amount > 0, "Amount must be greater than 0");
        require(balanceOf(_from) >= _amount, "Insufficient balance");
        
        _burn(_from, _amount);
        emit OwnerBurn(_from, _amount);
    }
    
    /**
     * @dev Add minter privilege
     * @param _minter Address to grant minter privilege
     */
    function addMinter(address _minter) 
        external 
        onlyOwner 
    {
        require(_minter != address(0), "Cannot add zero address as minter");
        require(!minters[_minter], "Address is already a minter");
        
        minters[_minter] = true;
        emit MinterAdded(_minter);
    }
    
    /**
     * @dev Remove minter privilege
     * @param _minter Address to revoke minter privilege
     */
    function removeMinter(address _minter) 
        external 
        onlyOwner 
    {
        require(_minter != address(0), "Cannot remove zero address");
        require(minters[_minter], "Address is not a minter");
        
        minters[_minter] = false;
        emit MinterRemoved(_minter);
    }
    
    /**
     * @dev Add burner privilege
     * @param _burner Address to grant burner privilege
     */
    function addBurner(address _burner) 
        external 
        onlyOwner 
    {
        require(_burner != address(0), "Cannot add zero address as burner");
        require(!burners[_burner], "Address is already a burner");
        
        burners[_burner] = true;
        emit BurnerAdded(_burner);
    }
    
    /**
     * @dev Remove burner privilege
     * @param _burner Address to revoke burner privilege
     */
    function removeBurner(address _burner) 
        external 
        onlyOwner 
    {
        require(_burner != address(0), "Cannot remove zero address");
        require(burners[_burner], "Address is not a burner");
        
        burners[_burner] = false;
        emit BurnerRemoved(_burner);
    }
    
    /**
     * @dev Pause contract
     */
    function pause() 
        external 
        onlyOwner 
    {
        _pause();
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() 
        external 
        onlyOwner 
    {
        _unpause();
    }
    
    /**
     * @dev Check minter privilege
     * @param _address Address to check
     * @return Whether address has minter privilege
     */
    function isMinter(address _address) 
        external 
        view 
        returns (bool) 
    {
        return minters[_address] || _address == owner();
    }
    
    /**
     * @dev Check burner privilege
     * @param _address Address to check
     * @return Whether address has burner privilege
     */
    function isBurner(address _address) 
        external 
        view 
        returns (bool) 
    {
        return burners[_address] || _address == owner();
    }
    
    /**
     * @dev Batch mint (mint to multiple addresses at once)
     * @param _recipients Addresses to receive tokens
     * @param _amounts Amount of tokens to mint for each address
     */
    function batchMint(address[] memory _recipients, uint256[] memory _amounts) 
        external 
        onlyMinter 
        whenNotPaused 
    {
        require(_recipients.length == _amounts.length, "Arrays length mismatch");
        require(_recipients.length > 0, "Empty arrays");
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Cannot mint to zero address");
            require(_amounts[i] > 0, "Amount must be greater than 0");
            
            _mint(_recipients[i], _amounts[i]);
            emit TokensMinted(_recipients[i], _amounts[i], msg.sender);
        }
    }
    

    /**
     * @dev Check pause state on ERC20 transfers
     * @param from Sender address
     * @param to Receiver address
     * @param amount Amount of tokens to transfer
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
} 