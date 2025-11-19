// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IGroth16Verifier} from "./interfaces/IGroth16Verifier.sol";

/// @title Groth16VerifierProxy
/// @notice Proxy contract that delegates to Stylus Groth16 verifier
/// @dev This contract provides a Solidity-friendly interface to the Rust/WASM verifier
contract Groth16VerifierProxy {
    /// @notice Address of the Stylus Groth16 verifier contract
    IGroth16Verifier public immutable stylusVerifier;

    /// @notice Emitted when a proof is verified
    /// @param caller Address that requested verification
    /// @param vkHash Hash of the verification key used
    /// @param valid Whether the proof was valid
    event ProofVerified(address indexed caller, bytes32 indexed vkHash, bool valid);

    /// @notice Emitted when a verification key is registered
    /// @param vkHash Hash of the verification key
    /// @param registrar Address that registered the VK
    event VKRegistered(bytes32 indexed vkHash, address indexed registrar);

    /// @notice Emitted when a nullifier is marked as used
    /// @param nullifier The nullifier hash
    /// @param caller Address that marked the nullifier
    event NullifierUsed(bytes32 indexed nullifier, address indexed caller);

    constructor(address _stylusVerifier) {
        require(_stylusVerifier != address(0), "Invalid verifier address");
        stylusVerifier = IGroth16Verifier(_stylusVerifier);
    }

    /// @notice Verify a Groth16 proof (delegates to Stylus)
    /// @param proof Serialized proof
    /// @param publicInputs Serialized public inputs
    /// @param vkHash Hash of the verification key
    /// @return valid True if proof is valid
    function verifyProof(
        bytes calldata proof,
        bytes calldata publicInputs,
        bytes32 vkHash
    ) external returns (bool valid) {
        valid = stylusVerifier.verify_groth16(proof, publicInputs, vkHash);
        emit ProofVerified(msg.sender, vkHash, valid);
        return valid;
    }

    /// @notice Register a verification key (delegates to Stylus)
    /// @param vk Serialized verification key
    /// @return vkHash Hash of the VK
    function registerVK(bytes calldata vk) external returns (bytes32 vkHash) {
        vkHash = stylusVerifier.register_vk(vk);
        emit VKRegistered(vkHash, msg.sender);
        return vkHash;
    }

    /// @notice Get total verifications performed
    /// @return count Total count
    function getVerificationCount() external view returns (uint256 count) {
        return stylusVerifier.get_verification_count();
    }

    /// @notice Check if contract is paused
    /// @return paused Pause status
    function isPaused() external view returns (bool paused) {
        return stylusVerifier.is_paused();
    }

    /// @notice Check if VK is registered
    /// @param vkHash Hash of the verification key
    /// @return registered Registration status
    function isVKRegistered(bytes32 vkHash) external view returns (bool registered) {
        return stylusVerifier.is_vk_registered(vkHash);
    }

    /// @notice Mark nullifier as used (delegates to Stylus)
    /// @param nullifier Unique proof identifier
    /// @return success True if nullifier was not already used
    function markNullifierUsed(bytes32 nullifier) external returns (bool success) {
        success = stylusVerifier.mark_nullifier_used(nullifier);
        if (success) {
            emit NullifierUsed(nullifier, msg.sender);
        }
        return success;
    }

    /// @notice Check if nullifier has been used
    /// @param nullifier Unique proof identifier
    /// @return used True if already used
    function isNullifierUsed(bytes32 nullifier) external view returns (bool used) {
        return stylusVerifier.is_nullifier_used(nullifier);
    }
}
