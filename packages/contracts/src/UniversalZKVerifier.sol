// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IUniversalVerifier.sol";

/**
 * @title UniversalZKVerifier
 * @notice Universal entry point for multi-proof-system zero-knowledge verification
 * @dev Routes verification requests to Arbitrum Stylus WASM contract or fallback Solidity modules
 * 
 * Architecture:
 * - Single entry point for all proof types (Groth16, PLONK, STARK)
 * - Primary: Delegates to Stylus WASM contract for gas-efficient verification
 * - Fallback: Delegatecall-based routing to Solidity verifier modules
 * - Upgradeable via UUPS pattern
 * - Role-based access control for module management
 * 
 * Security Features:
 * - Access control for module registration
 * - Pausable for emergency situations
 * - Module and Stylus contract address validation
 * - Delegatecall safety checks
 * - Stylus contract verification
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
    
    /// @notice Address of the Arbitrum Stylus WASM verifier contract
    /// @dev If set, verification delegates to Stylus for gas efficiency
    address public stylusVerifier;
    
    /// @notice Mapping from proof type to verifier module address
    /// @dev Fallback Solidity modules if Stylus is not available
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
    
    /// @notice Emitted when the Stylus verifier address is updated
    /// @param previousStylus Address of the previous Stylus contract
    /// @param newStylus Address of the new Stylus contract
    event StylusVerifierUpdated(
        address indexed previousStylus,
        address indexed newStylus
    );
    
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
    
    /// @notice Thrown when Stylus verification fails
    error StylusVerificationFailed(string reason);
    
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
    
    /**
     * @notice Sets the Stylus WASM verifier contract address
     * @dev Only callable by MODULE_MANAGER_ROLE
     * @param stylusAddress Address of the deployed Stylus contract
     */
    function setStylusVerifier(address stylusAddress) 
        external 
        onlyRole(MODULE_MANAGER_ROLE) 
    {
        if (stylusAddress == address(0)) revert ZeroAddress();
        
        address previousStylus = stylusVerifier;
        stylusVerifier = stylusAddress;
        
        emit StylusVerifierUpdated(previousStylus, stylusAddress);
    }
    
    /**
     * @notice Removes the Stylus verifier (fallback to Solidity modules)
     * @dev Only callable by MODULE_MANAGER_ROLE
     */
    function removeStylusVerifier() 
        external 
        onlyRole(MODULE_MANAGER_ROLE) 
    {
        address previousStylus = stylusVerifier;
        if (previousStylus == address(0)) revert ZeroAddress();
        
        delete stylusVerifier;
        
        emit StylusVerifierUpdated(previousStylus, address(0));
    }
    
    // ============================================
    // VERIFICATION ROUTING
    // ============================================
    
    /**
     * @notice Verifies a zero-knowledge proof via Stylus WASM or fallback Solidity module
     * @dev Primary: Calls Stylus WASM contract | Fallback: Delegatecall to Solidity module
     * @param proofType Type of proof system used (GROTH16, PLONK, or STARK)
     * @param proof The zero-knowledge proof bytes
     * @param publicInputs Public inputs to the proof
     * @param vk Verification key for the proof (or VK hash for Stylus)
     * @return bool True if the proof is valid
     */
    function verify(
        ProofType proofType,
        bytes calldata proof,
        bytes calldata publicInputs,
        bytes calldata vk
    ) external whenNotPaused returns (bool) {
        // Primary path: Use Stylus WASM verifier if available
        if (stylusVerifier != address(0)) {
            return _verifyStylusWasm(proofType, proof, publicInputs, vk);
        }
        
        // Fallback path: Use Solidity module via delegatecall
        return _verifySolidityModule(proofType, proof, publicInputs, vk);
    }
    
    /**
     * @notice Verifies proof using Stylus WASM contract
     * @dev Calls IUniversalVerifier.verify() on Stylus contract
     * @param proofType Type of proof system
     * @param proof Serialized proof bytes
     * @param publicInputs Public input field elements
     * @param vk Verification key bytes (will be hashed for Stylus)
     * @return bool True if proof is valid
     */
    function _verifyStylusWasm(
        ProofType proofType,
        bytes calldata proof,
        bytes calldata publicInputs,
        bytes calldata vk
    ) private returns (bool) {
        // Convert ProofType enum to uint8 for Stylus interface
        uint8 stylusProofType = uint8(proofType);
        
        // Hash the VK for Stylus (Stylus uses VK hash for lookups)
        bytes32 vkHash = keccak256(vk);
        
        // Call Stylus contract's verify function
        try IUniversalVerifier(stylusVerifier).verify(
            stylusProofType,
            proof,
            publicInputs,
            vkHash
        ) returns (bool valid) {
            emit ProofVerified(proofType, stylusVerifier, valid);
            return valid;
        } catch Error(string memory reason) {
            revert StylusVerificationFailed(reason);
        } catch (bytes memory lowLevelData) {
            // Handle low-level errors from Stylus
            string memory reason = lowLevelData.length > 0 
                ? string(lowLevelData) 
                : "Stylus verification failed";
            revert StylusVerificationFailed(reason);
        }
    }
    
    /**
     * @notice Verifies proof using Solidity module via delegatecall
     * @dev Fallback when Stylus is not available
     * @param proofType Type of proof system
     * @param proof Serialized proof bytes
     * @param publicInputs Public input field elements
     * @param vk Verification key bytes
     * @return bool True if proof is valid
     */
    function _verifySolidityModule(
        ProofType proofType,
        bytes calldata proof,
        bytes calldata publicInputs,
        bytes calldata vk
    ) private returns (bool) {
        // Get the verifier module for this proof type
        address module = verifierModules[proofType];
        if (module == address(0)) revert UnsupportedProofType(proofType);
        
        // Delegatecall to the module's verify function
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
     * @notice Batch verify multiple proofs of the same type using Stylus WASM
     * @dev Only available when Stylus verifier is configured
     * @param proofType Type of proof system (must be same for all proofs)
     * @param proofs Array of serialized proofs
     * @param publicInputs Array of public inputs (must match proofs length)
     * @param vk Verification key (shared across all proofs)
     * @return results Array of verification results
     */
    function batchVerify(
        ProofType proofType,
        bytes[] calldata proofs,
        bytes[] calldata publicInputs,
        bytes calldata vk
    ) external whenNotPaused returns (bool[] memory results) {
        if (stylusVerifier == address(0)) {
            revert StylusVerificationFailed("Batch verify requires Stylus");
        }
        
        uint8 stylusProofType = uint8(proofType);
        bytes32 vkHash = keccak256(vk);
        
        try IUniversalVerifier(stylusVerifier).batchVerify(
            stylusProofType,
            proofs,
            publicInputs,
            vkHash
        ) returns (bool[] memory batchResults) {
            return batchResults;
        } catch Error(string memory reason) {
            revert StylusVerificationFailed(reason);
        } catch {
            revert StylusVerificationFailed("Batch verification failed");
        }
    }
    
    /**
     * @notice Register verification key with Stylus contract
     * @dev Precomputes optimizations for faster verification
     * @param proofType Type of proof system
     * @param vk Serialized verification key
     * @return vkHash Hash of the registered VK
     */
    function registerVerificationKey(
        ProofType proofType,
        bytes calldata vk
    ) external whenNotPaused returns (bytes32 vkHash) {
        if (stylusVerifier == address(0)) {
            revert StylusVerificationFailed("VK registration requires Stylus");
        }
        
        uint8 stylusProofType = uint8(proofType);
        
        try IUniversalVerifier(stylusVerifier).registerVkTyped(
            stylusProofType,
            vk
        ) returns (bytes32 hash) {
            return hash;
        } catch Error(string memory reason) {
            revert StylusVerificationFailed(reason);
        } catch {
            revert StylusVerificationFailed("VK registration failed");
        }
    }
    
    /**
     * @notice Returns the version of the contract
     * @return Version string
     */
    function version() external pure returns (string memory) {
        return "2.0.0-stylus";
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
