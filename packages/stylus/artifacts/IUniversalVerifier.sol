// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IUniversalVerifier
 * @notice Interface for the Universal ZK-Proof Verifier (Stylus Contract)
 * @dev This interface is auto-generated from the UZKV Stylus contract
 */
interface IUniversalVerifier {
    /// @notice Verify a Groth16 proof
    /// @param proof Serialized Groth16 proof
    /// @param publicInputs Serialized public inputs
    /// @param vkHash Hash of the verification key
    /// @return True if proof is valid
    function verify_groth16(
        bytes calldata proof,
        bytes calldata publicInputs,
        bytes32 vkHash
    ) external returns (bool);

    /// @notice Register a verification key
    /// @param vk Serialized verification key
    /// @param proofType Type of proof system (0=Groth16, 1=PLONK, 2=STARK)
    /// @return vkHash Hash of the registered verification key
    function register_vk(
        bytes calldata vk,
        uint8 proofType
    ) external returns (bytes32);

    /// @notice Universal proof verification (supports multiple proof systems)
    /// @param proof Serialized proof
    /// @param publicInputs Serialized public inputs  
    /// @param vkHash Hash of the verification key
    /// @param proofType Type of proof system
    /// @return True if proof is valid
    function verify(
        bytes calldata proof,
        bytes calldata publicInputs,
        bytes32 vkHash,
        uint8 proofType
    ) external returns (bool);

    /// @notice Batch verify multiple proofs with the same verification key
    /// @param proofs Array of serialized proofs
    /// @param publicInputs Array of serialized public inputs
    /// @param vkHash Hash of the verification key
    /// @param proofType Type of proof system
    /// @return Array of verification results
    function batch_verify(
        bytes[] calldata proofs,
        bytes[] calldata publicInputs,
        bytes32 vkHash,
        uint8 proofType
    ) external returns (bool[] memory);

    /// @notice Get total number of successful verifications
    /// @return Total verification count
    function get_verification_count() external view returns (uint256);

    /// @notice Check if verification key is registered
    /// @param vkHash Hash of the verification key
    /// @return True if registered
    function is_vk_registered(bytes32 vkHash) external view returns (bool);

    /// @notice Check if contract is paused
    /// @return True if paused
    function is_paused() external view returns (bool);

    /// @notice Pause contract (admin only)
    function pause() external;

    /// @notice Unpause contract (admin only)  
    function unpause() external;

    /// @notice Mark a nullifier as used (prevents replay attacks)
    /// @param nullifier Unique proof identifier
    /// @return True if marked successfully, false if already used
    function mark_nullifier_used(bytes32 nullifier) external returns (bool);

    /// @notice Check if nullifier has been used
    /// @param nullifier Unique proof identifier
    /// @return True if used
    function is_nullifier_used(bytes32 nullifier) external view returns (bool);
}
