// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title UZKVProxy
 * @notice UUPS Proxy contract serving as the entry point for all UZKV operations
 * @dev Implements UUPS upgradeable pattern with role-based access control and pausability
 *      Delegates calls to Stylus implementation for zero-knowledge proof verification
 * 
 * Security Features:
 * - UUPS upgradeable pattern for immutable proxy with upgradeable logic
 * - Role-based access control for upgrade authorization
 * - Pausable functionality for emergency controls
 * - Fallback delegation to Stylus implementation
 * 
 * Architecture:
 * - Proxy Layer (this contract): Entry point, access control, upgradeability, emergency controls
 * - Implementation Layer (Stylus): ZK proof verification, state management
 */
contract UZKVProxy is Initializable, UUPSUpgradeable, AccessControlUpgradeable, PausableUpgradeable {
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    /// @notice Role identifier for accounts authorized to upgrade the implementation
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    /// @notice Role identifier for contract administrators
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Role identifier for accounts authorized to pause/unpause the contract
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    /// @notice Address of the Stylus implementation contract
    /// @dev Stored in a custom storage slot to avoid collisions with proxy storage
    bytes32 private constant IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("uzkv.proxy.implementation")) - 1);
    
    // ============================================
    // EVENTS
    // ============================================
    
    /// @notice Emitted when the Stylus implementation address is updated
    /// @param previousImplementation Address of the previous implementation
    /// @param newImplementation Address of the new implementation
    event ImplementationUpdated(address indexed previousImplementation, address indexed newImplementation);
    
    /// @notice Emitted when the proxy is initialized
    /// @param admin Address of the initial admin
    /// @param implementation Address of the initial Stylus implementation
    event ProxyInitialized(address indexed admin, address indexed implementation);
    
    /// @notice Emitted when the contract is paused
    /// @param account Address that triggered the pause
    event ContractPaused(address indexed account);
    
    /// @notice Emitted when the contract is unpaused
    /// @param account Address that triggered the unpause
    event ContractUnpaused(address indexed account);
    
    // ============================================
    // ERRORS
    // ============================================
    
    /// @notice Thrown when zero address is provided where valid address is required
    error ZeroAddress();
    
    /// @notice Thrown when implementation address is invalid
    error InvalidImplementation();
    
    /// @notice Thrown when caller lacks required role
    error UnauthorizedCaller();
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initializes the proxy contract with separate role assignments
     * @dev Sets up roles and initial implementation address
     *      Can only be called once due to initializer modifier
     *      Constructor disables initializers to prevent logic contract takeover
     * @param admin Address to be granted DEFAULT_ADMIN_ROLE and ADMIN_ROLE
     * @param upgrader Address to be granted UPGRADER_ROLE
     * @param pauser Address to be granted PAUSER_ROLE
     * @param stylusImplementation Address of the Stylus implementation contract
     */
    function initialize(
        address admin, 
        address upgrader, 
        address pauser,
        address stylusImplementation
    ) external initializer {
        if (admin == address(0)) revert ZeroAddress();
        if (upgrader == address(0)) revert ZeroAddress();
        if (pauser == address(0)) revert ZeroAddress();
        if (stylusImplementation == address(0)) revert ZeroAddress();
        
        // Initialize parent contracts
        __AccessControl_init();
        __Pausable_init();
        
        // Grant roles to respective addresses
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, upgrader);
        _grantRole(PAUSER_ROLE, pauser);
        
        // Set initial Stylus implementation
        _setImplementation(stylusImplementation);
        
        emit ProxyInitialized(admin, stylusImplementation);
    }
    
    // ============================================
    // EMERGENCY CONTROLS
    // ============================================
    
    /**
     * @notice Pauses all proxy operations
     * @dev Only callable by accounts with PAUSER_ROLE
     *      When paused, fallback function will revert
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
        emit ContractPaused(msg.sender);
    }
    
    /**
     * @notice Resumes proxy operations
     * @dev Only callable by accounts with PAUSER_ROLE
     *      Allows fallback function to execute again
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }
    
    // ============================================
    // UPGRADE AUTHORIZATION
    // ============================================
    
    /**
     * @notice Authorizes an upgrade to a new implementation
     * @dev Required by UUPS pattern, restricts upgrades to UPGRADER_ROLE holders
     * @param newImplementation Address of the new implementation contract
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {
        if (newImplementation == address(0)) revert ZeroAddress();
        // Additional validation can be added here (e.g., implementation interface checks)
    }
    
    // ============================================
    // IMPLEMENTATION MANAGEMENT
    // ============================================
    
    /**
     * @notice Updates the Stylus implementation address
     * @dev Only callable by accounts with ADMIN_ROLE
     * @param newImplementation Address of the new Stylus implementation
     */
    function setImplementation(address newImplementation) external onlyRole(ADMIN_ROLE) {
        if (newImplementation == address(0)) revert ZeroAddress();
        _setImplementation(newImplementation);
    }
    
    /**
     * @notice Internal function to update the Stylus implementation
     * @param newImplementation Address of the new implementation
     */
    function _setImplementation(address newImplementation) private {
        address previousImplementation = _getImplementation();
        
        // Store implementation address in custom slot
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            sstore(slot, newImplementation)
        }
        
        emit ImplementationUpdated(previousImplementation, newImplementation);
    }
    
    /**
     * @notice Retrieves the current Stylus implementation address
     * @return implementation Address of the current implementation
     */
    function _getImplementation() private view returns (address implementation) {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            implementation := sload(slot)
        }
    }
    
    /**
     * @notice Public getter for the Stylus implementation address
     * @return Address of the current Stylus implementation
     */
    function getImplementation() external view returns (address) {
        return _getImplementation();
    }
    
    // ============================================
    // STYLUS GATEWAY (FALLBACK)
    // ============================================
    
    /**
     * @notice Fallback function that delegates all calls to the Stylus implementation
     * @dev Uses delegatecall to execute implementation logic in proxy context
     *      Preserves msg.sender, msg.value, and all calldata
     *      Returns implementation's return data or reverts with implementation's revert data
     *      Paused when contract is in emergency mode
     * 
     * Assembly Breakdown:
     * 1. calldatacopy(0, 0, calldatasize()) - Copy calldata to memory starting at position 0
     * 2. delegatecall(gas(), impl, 0, calldatasize(), 0, 0) - Call implementation with all gas and calldata
     * 3. returndatacopy(0, 0, returndatasize()) - Copy return data to memory
     * 4. Switch on result: revert if failed (0), return if success (1)
     * 
     * Security Considerations:
     * - Delegatecall executes in proxy's storage context
     * - Implementation cannot access proxy's storage directly
     * - All state changes affect proxy's storage
     * - msg.sender and msg.value are preserved
     * - Reverts when contract is paused for emergency protection
     */
    fallback() external payable whenNotPaused {
        address impl = _getImplementation();
        
        // Ensure implementation is set
        if (impl == address(0)) revert InvalidImplementation();
        
        assembly {
            // Copy calldata to memory
            // calldatacopy(destOffset, offset, length)
            calldatacopy(0, 0, calldatasize())
            
            // Delegate call to implementation
            // delegatecall(gas, address, argsOffset, argsLength, retOffset, retLength)
            // Returns 1 on success, 0 on failure
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            
            // Copy return data to memory
            // returndatacopy(destOffset, offset, length)
            returndatacopy(0, 0, returndatasize())
            
            // Handle result
            switch result
            case 0 { 
                // Call failed - revert with return data
                revert(0, returndatasize()) 
            }
            default { 
                // Call succeeded - return with return data
                return(0, returndatasize()) 
            }
        }
    }
    
    /**
     * @notice Receive function to accept ETH transfers
     * @dev Required for contracts that may receive ETH
     */
    receive() external payable {
        // Optionally emit event or forward to implementation
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @notice Checks if the contract supports an interface
     * @dev Overrides supportsInterface to include proxy interfaces
     * @param interfaceId Interface identifier to check
     * @return bool True if interface is supported
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    /**
     * @notice Returns the version of the proxy contract
     * @return Version string
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}
