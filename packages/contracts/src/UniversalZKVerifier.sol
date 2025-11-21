// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title UniversalZKVerifier
 * @notice Universal entry point for multi-proof-system zero-knowledge verification
 * @dev Routes verification requests to specialized verifier modules based on proof type
 * 
 * Architecture:
 * - Single entry point for all proof types (Groth16, PLONK, STARK)
 * - Delegatecall-based routing to specialized verifier modules
 * - Upgradeable via UUPS pattern
 * - Role-based access control for module management
 * 
 * Security Features:
 * - Access control for module registration
 * - Pausable for emergency situations
 * - Module address validation
 * - Delegatecall safety checks
 */
contract UniversalZKVerifier is 
    Initializable, 
    AccessControlUpgradeable, 
    PausableUpgradeable,
    UUPSUpgradeable 
{
    
    // ============================================
    // TYPES & ENUMS
    // ============================================
    
    /// @notice Supported zero-knowledge proof types
    enum ProofType {
        GROTH16,  // Groth16 zkSNARK - fast verification, trusted setup
        PLONK,    // PLONK - universal setup, larger proofs
        STARK     // STARK - transparent, no trusted setup, quantum-resistant
    }
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    /// @notice Mapping from proof type to verifier module address
    /// @dev Modules implement the verification logic via delegatecall
    mapping(ProofType => address) public verifierModules;
    
    /// @notice Role identifier for accounts authorized to upgrade the contract
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    /// @notice Role identifier for accounts authorized to pause/unpause
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    /// @notice Role identifier for accounts authorized to manage verifier modules
    bytes32 public constant MODULE_MANAGER_ROLE = keccak256("MODULE_MANAGER_ROLE");
    
    // ============================================
    // EVENTS
    // ============================================
    
    /// @notice Emitted when a verifier module is registered or updated
    /// @param proofType The proof type for which the module is registered
    /// @param previousModule Address of the previous module (zero if new registration)
    /// @param newModule Address of the new verifier module
    event VerifierModuleUpdated(
        ProofType indexed proofType,
        address indexed previousModule,
        address indexed newModule
    );
    
    /// @notice Emitted when a proof verification is performed
    /// @param proofType Type of proof that was verified
    /// @param verifier Address of the verifier module that performed verification
    /// @param success Whether the verification succeeded
    event ProofVerified(
        ProofType indexed proofType,
        address indexed verifier,
        bool success
    );
    
    /// @notice Emitted when the contract is initialized
    /// @param admin Address of the initial admin
    event UniversalVerifierInitialized(address indexed admin);
    
    // ============================================
    // ERRORS
    // ============================================
    
    /// @notice Thrown when a zero address is provided where valid address is required
    error ZeroAddress();
    
    /// @notice Thrown when attempting to use an unsupported proof type
    error UnsupportedProofType(ProofType proofType);
    
    /// @notice Thrown when verification delegatecall fails
    error VerificationFailed(string reason);
    
    /// @notice Thrown when module is not registered for a proof type
    error ModuleNotRegistered(ProofType proofType);
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initializes the Universal ZK Verifier
     * @dev Sets up roles and can optionally initialize verifier modules
     * @param admin Address to be granted admin and module manager roles
     * @param upgrader Address to be granted upgrader role
     * @param pauser Address to be granted pauser role
     */
    function initialize(
        address admin,
        address upgrader,
        address pauser
    ) external initializer {
        if (admin == address(0)) revert ZeroAddress();
        if (upgrader == address(0)) revert ZeroAddress();
        if (pauser == address(0)) revert ZeroAddress();
        
        // Initialize parent contracts
        __AccessControl_init();
        __Pausable_init();
        
        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MODULE_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, upgrader);
        _grantRole(PAUSER_ROLE, pauser);
        
        emit UniversalVerifierInitialized(admin);
    }
    
    // ============================================
    // VERIFIER MODULE MANAGEMENT
    // ============================================
    
    /**
     * @notice Registers or updates a verifier module for a specific proof type
     * @dev Only callable by MODULE_MANAGER_ROLE
     * @param proofType The type of proof this module will handle
     * @param moduleAddress Address of the verifier module contract
     */
    function setVerifierModule(
        ProofType proofType,
        address moduleAddress
    ) external onlyRole(MODULE_MANAGER_ROLE) {
        if (moduleAddress == address(0)) revert ZeroAddress();
        
        address previousModule = verifierModules[proofType];
        verifierModules[proofType] = moduleAddress;
        
        emit VerifierModuleUpdated(proofType, previousModule, moduleAddress);
    }
    
    /**
     * @notice Removes a verifier module for a specific proof type
     * @dev Only callable by MODULE_MANAGER_ROLE
     * @param proofType The proof type to remove the module for
     */
    function removeVerifierModule(ProofType proofType) 
        external 
        onlyRole(MODULE_MANAGER_ROLE) 
    {
        address previousModule = verifierModules[proofType];
        if (previousModule == address(0)) revert ModuleNotRegistered(proofType);
        
        delete verifierModules[proofType];
        
        emit VerifierModuleUpdated(proofType, previousModule, address(0));
    }
    
    /**
     * @notice Checks if a verifier module is registered for a proof type
     * @param proofType The proof type to check
     * @return bool True if a module is registered
     */
    function isModuleRegistered(ProofType proofType) external view returns (bool) {
        return verifierModules[proofType] != address(0);
    }
    
    // ============================================
    // VERIFICATION ROUTING
    // ============================================
    
    /**
     * @notice Verifies a zero-knowledge proof by routing to the appropriate module
     * @dev Uses delegatecall to execute module logic in this contract's context
     * @param proofType Type of proof system used (GROTH16, PLONK, or STARK)
     * @param proof The zero-knowledge proof bytes
     * @param publicInputs Public inputs to the proof
     * @param vk Verification key for the proof
     * @return bool True if the proof is valid
     */
    function verify(
        ProofType proofType,
        bytes calldata proof,
        bytes calldata publicInputs,
        bytes calldata vk
    ) external whenNotPaused returns (bool) {
        // Get the verifier module for this proof type
        address module = verifierModules[proofType];
        if (module == address(0)) revert UnsupportedProofType(proofType);
        
        // Delegatecall to the module's verify function
        // This executes the module's code in our storage context
        (bool success, bytes memory result) = module.delegatecall(
            abi.encodeWithSignature(
                "verify(bytes,bytes,bytes)",
                proof,
                publicInputs,
                vk
            )
        );
        
        // Check if the delegatecall succeeded
        if (!success) {
            // Extract revert reason if available
            string memory reason = _getRevertReason(result);
            revert VerificationFailed(reason);
        }
        
        // Decode the verification result
        bool verified = abi.decode(result, (bool));
        
        emit ProofVerified(proofType, module, verified);
        
        return verified;
    }
    
    /**
     * @notice Extracts revert reason from failed call
     * @param returnData The return data from the failed call
     * @return reason The revert reason string
     */
    function _getRevertReason(bytes memory returnData) 
        private 
        pure 
        returns (string memory reason) 
    {
        // If the returnData length is less than 68, then the transaction failed silently
        if (returnData.length < 68) return "Delegatecall failed";
        
        assembly {
            // Slice the sighash (first 4 bytes)
            returnData := add(returnData, 0x04)
        }
        
        // Decode the revert reason
        reason = abi.decode(returnData, (string));
    }
    
    // ============================================
    // EMERGENCY CONTROLS
    // ============================================
    
    /**
     * @notice Pauses all verification operations
     * @dev Only callable by PAUSER_ROLE
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @notice Resumes verification operations
     * @dev Only callable by PAUSER_ROLE
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    // ============================================
    // UPGRADE AUTHORIZATION
    // ============================================
    
    /**
     * @notice Authorizes contract upgrades
     * @dev Required by UUPS pattern, restricted to UPGRADER_ROLE
     * @param newImplementation Address of the new implementation
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {
        if (newImplementation == address(0)) revert ZeroAddress();
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @notice Gets the verifier module address for a proof type
     * @param proofType The proof type to query
     * @return address The module address (zero if not registered)
     */
    function getVerifierModule(ProofType proofType) 
        external 
        view 
        returns (address) 
    {
        return verifierModules[proofType];
    }
    
    /**
     * @notice Returns the version of the contract
     * @return Version string
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
    
    /**
     * @notice Checks if the contract supports an interface
     * @dev Overrides supportsInterface to include all parent interfaces
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
}
