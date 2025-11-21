// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @title IUniversalVerifier
/// @notice Interface for the Universal ZK Verifier Stylus WASM contract
/// @dev This interface is generated from the Rust Stylus contract
/// @custom:stylus-contract uzkv-stylus
interface IUniversalVerifier {
    // ============================================
    // ERRORS
    // ============================================

    /// @notice Proof deserialization failed
    error DeserializationError();
    
    /// @notice Proof contains invalid curve points
    error MalformedProof();
    
    /// @notice Verification key deserialization failed
    error InvalidVerificationKey();
    
    /// @notice Public inputs deserialization failed
    error InvalidPublicInputs();
    
    /// @notice Proof verification failed (mathematically invalid)
    error VerificationFailed();
    
    /// @notice Input size constraints violated
    error InvalidInputSize();
    
    /// @notice Contract is paused
    error ContractPaused();
    
    /// @notice Verification key not registered
    error VKNotRegistered();
    
    /// @notice Unauthorized access
    error Unauthorized();
    
    /// @notice Invalid proof type
    error InvalidProofType();
    
    /// @notice Proof type not supported yet
    error ProofTypeNotSupported();

    // ============================================
    // ENUMS
    // ============================================

    /// @notice Proof system types
    /// @dev Matches the Rust ProofType enum
    enum ProofType {
        Groth16,  // 0 - Trusted setup, ~60k gas
        PLONK,    // 1 - Universal setup, ~120k gas
        STARK     // 2 - Transparent, ~280k gas
    }

    // ============================================
    // UNIVERSAL VERIFICATION FUNCTIONS
    // ============================================

    /// @notice Universal verify - routes to appropriate verifier based on proof type
    /// @dev Supports Groth16 (fully enabled), PLONK (TODO), STARK (TODO)
    /// @param proofType Proof system type (0=Groth16, 1=PLONK, 2=STARK)
    /// @param proof Serialized proof bytes
    /// @param publicInputs Serialized public input field elements
    /// @param vkHash Hash of the registered verification key (not used for STARK)
    /// @return valid True if proof is valid, reverts on error
    function verify(
        uint8 proofType,
        bytes calldata proof,
        bytes calldata publicInputs,
        bytes32 vkHash
    ) external returns (bool valid);

    /// @notice Batch verify multiple proofs of the same type with the same verification key
    /// @dev More gas-efficient than calling verify() multiple times
    /// @param proofType Proof system type (0=Groth16, 1=PLONK, 2=STARK)
    /// @param proofs Array of serialized proofs
    /// @param publicInputs Array of serialized public inputs (must match proofs length)
    /// @param vkHash Verification key hash (shared across all proofs)
    /// @return results Array of verification results (true = valid, false = invalid)
    function batchVerify(
        uint8 proofType,
        bytes[] calldata proofs,
        bytes[] calldata publicInputs,
        bytes32 vkHash
    ) external returns (bool[] memory results);

    /// @notice Register a verification key for a specific proof type
    /// @dev Precomputes optimizations based on proof type
    /// @param proofType Proof system type (0=Groth16, 1=PLONK, 2=STARK)
    /// @param vk Serialized verification key bytes
    /// @return vkHash Keccak256 hash of the VK
    function registerVkTyped(
        uint8 proofType,
        bytes calldata vk
    ) external returns (bytes32 vkHash);

    // ============================================
    // GROTH16-SPECIFIC FUNCTIONS (Legacy)
    // ============================================

    /// @notice Verify a Groth16 proof with gas optimization
    /// @dev Uses precomputed e(α, β) pairing to save ~80,000 gas per verification
    /// @param proof Serialized Groth16 proof (compressed format)
    /// @param publicInputs Serialized public input field elements
    /// @param vkHash Hash of the registered verification key
    /// @return valid True if proof is valid
    function verifyGroth16(
        bytes calldata proof,
        bytes calldata publicInputs,
        bytes32 vkHash
    ) external returns (bool valid);

    /// @notice Register a Groth16 verification key with gas optimization precomputation
    /// @dev Computes and stores e(α, β) pairing for ~80k gas savings per verification
    /// @param vk Serialized verification key bytes
    /// @return vkHash Keccak256 hash of the VK
    function registerVk(bytes calldata vk) external returns (bytes32 vkHash);

    // ============================================
    // QUERY FUNCTIONS
    // ============================================

    /// @notice Get total number of successful verifications across all proof types
    /// @return count Total verifications performed
    function getVerificationCount() external view returns (uint256 count);

    /// @notice Check if verification key is registered
    /// @param vkHash Hash of the verification key
    /// @return registered True if VK is registered
    function isVkRegistered(bytes32 vkHash) external view returns (bool registered);

    /// @notice Check if contract is paused
    /// @return paused True if contract is paused
    function isPaused() external view returns (bool paused);

    /// @notice Check if nullifier has been used
    /// @param nullifier Unique proof identifier
    /// @return used True if nullifier has been used
    function isNullifierUsed(bytes32 nullifier) external view returns (bool used);

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /// @notice Pause the contract (admin only)
    /// @dev Prevents all verification operations
    function pause() external;

    /// @notice Unpause the contract (admin only)
    /// @dev Re-enables verification operations
    function unpause() external;

    /// @notice Mark a nullifier as used (prevent replay attacks)
    /// @param nullifier Unique proof identifier
    /// @return success True if nullifier was not already used
    function markNullifierUsed(bytes32 nullifier) external returns (bool success);
}
