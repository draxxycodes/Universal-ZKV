// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @title IGroth16Verifier
/// @notice Interface for Groth16 zkSNARK verifier implemented in Arbitrum Stylus (Rust/WASM)
/// @dev This interface matches the Stylus contract ABI generated from packages/stylus/src/lib.rs
interface IGroth16Verifier {
    /// @notice Verify a Groth16 proof
    /// @param proof Serialized Groth16 proof (compressed BN254 format)
    /// @param publicInputs Serialized public input field elements
    /// @param vkHash Keccak256 hash of the registered verification key
    /// @return valid True if proof is mathematically valid
    function verify_groth16(
        bytes calldata proof,
        bytes calldata publicInputs,
        bytes32 vkHash
    ) external returns (bool valid);

    /// @notice Register a verification key for later use
    /// @param vk Serialized verification key
    /// @return vkHash Keccak256 hash of the VK
    function register_vk(bytes calldata vk) external returns (bytes32 vkHash);

    /// @notice Get total number of successful verifications
    /// @return count Total verifications performed
    function get_verification_count() external view returns (uint256 count);

    /// @notice Check if contract is paused
    /// @return paused True if contract is paused
    function is_paused() external view returns (bool paused);

    /// @notice Pause the contract (admin only)
    function pause() external;

    /// @notice Unpause the contract (admin only)
    function unpause() external;

    /// @notice Check if verification key is registered
    /// @param vkHash Hash of the verification key
    /// @return registered True if VK is registered
    function is_vk_registered(bytes32 vkHash) external view returns (bool registered);

    /// @notice Mark a nullifier as used (prevent replay attacks)
    /// @param nullifier Unique proof identifier
    /// @return success True if nullifier was not already used
    function mark_nullifier_used(bytes32 nullifier) external returns (bool success);

    /// @notice Check if nullifier has been used
    /// @param nullifier Unique proof identifier
    /// @return used True if nullifier has been used
    function is_nullifier_used(bytes32 nullifier) external view returns (bool used);
}
