// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title Storage
 * @notice ERC-7201 namespaced storage library for UZKV
 * @dev Prevents storage collisions between UUPS proxy and Stylus logic
 * 
 * Storage namespace: "arbitrum.uzkv.storage.v1"
 * Calculation: keccak256("arbitrum.uzkv.storage.v1") - 1
 * Slot: 0xe96c698557d1c96b88bdb445dd1e4d98c586bf83d2bb4c85329a45b5cd63a0d0
 */
library Storage {
    /// @dev ERC-7201 storage slot (keccak256("arbitrum.uzkv.storage.v1") - 1)
    bytes32 constant STORAGE_SLOT = 0xe96c698557d1c96b88bdb445dd1e4d98c586bf83d2bb4c85329a45b5cd63a0d0;

    /**
     * @notice Storage layout for UZKV verifier
     * @dev This struct defines the storage variables accessible from both Solidity and Rust
     */
    struct StorageLayout {
        /// @dev Mapping of verification key hashes to their registration status
        mapping(bytes32 => bool) verificationKeys;
        
        /// @dev Total number of registered verification keys
        uint256 vkCount;
        
        /// @dev Mapping of proof system ID to verifier address
        /// 1 = Groth16, 2 = PLONK, 3 = STARK
        mapping(uint8 => address) verifiers;
        
        /// @dev Emergency pause flag
        bool paused;
        
        /// @dev Mapping of nullifiers to prevent proof replay
        mapping(bytes32 => bool) nullifiers;
        
        /// @dev Total verification count (for metrics)
        uint256 totalVerifications;
    }

    /**
     * @notice Get a pointer to the storage layout at the ERC-7201 slot
     * @dev Uses inline assembly to return a storage reference at the specific slot
     * @return l Storage reference to the StorageLayout struct
     */
    function layout() internal pure returns (StorageLayout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }

    /**
     * @notice Check if a verification key is registered
     * @param vkHash Hash of the verification key
     * @return bool True if the VK is registered
     */
    function isVKRegistered(bytes32 vkHash) internal view returns (bool) {
        return layout().verificationKeys[vkHash];
    }

    /**
     * @notice Register a verification key
     * @param vkHash Hash of the verification key
     */
    function registerVK(bytes32 vkHash) internal {
        StorageLayout storage l = layout();
        require(!l.verificationKeys[vkHash], "VK already registered");
        l.verificationKeys[vkHash] = true;
        l.vkCount++;
    }

    /**
     * @notice Get the verifier address for a proof system
     * @param proofSystemId Proof system identifier (1=Groth16, 2=PLONK, 3=STARK)
     * @return address Verifier contract address
     */
    function getVerifier(uint8 proofSystemId) internal view returns (address) {
        return layout().verifiers[proofSystemId];
    }

    /**
     * @notice Set the verifier address for a proof system
     * @param proofSystemId Proof system identifier
     * @param verifier Verifier contract address
     */
    function setVerifier(uint8 proofSystemId, address verifier) internal {
        layout().verifiers[proofSystemId] = verifier;
    }

    /**
     * @notice Check if contract is paused
     * @return bool True if paused
     */
    function isPaused() internal view returns (bool) {
        return layout().paused;
    }

    /**
     * @notice Set pause state
     * @param state Pause state to set
     */
    function setPaused(bool state) internal {
        layout().paused = state;
    }

    /**
     * @notice Check if a nullifier has been used
     * @param nullifier Nullifier hash
     * @return bool True if already used
     */
    function isNullifierUsed(bytes32 nullifier) internal view returns (bool) {
        return layout().nullifiers[nullifier];
    }

    /**
     * @notice Mark a nullifier as used
     * @param nullifier Nullifier hash
     */
    function markNullifierUsed(bytes32 nullifier) internal {
        StorageLayout storage l = layout();
        require(!l.nullifiers[nullifier], "Nullifier already used");
        l.nullifiers[nullifier] = true;
    }

    /**
     * @notice Increment total verifications counter
     */
    function incrementVerifications() internal {
        layout().totalVerifications++;
    }

    /**
     * @notice Get total verification count
     * @return uint256 Total number of verifications
     */
    function getTotalVerifications() internal view returns (uint256) {
        return layout().totalVerifications;
    }

    /**
     * @notice Get total VK count
     * @return uint256 Total number of registered VKs
     */
    function getVKCount() internal view returns (uint256) {
        return layout().vkCount;
    }
}
