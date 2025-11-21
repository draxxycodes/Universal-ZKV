// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/libraries/Storage.sol";

/**
 * @title StorageTestHelper
 * @notice Helper contract to test library functions with expectRevert
 */
contract StorageTestHelper {
    function registerVK(bytes32 vkHash) external {
        Storage.registerVK(vkHash);
    }

    function markNullifierUsed(bytes32 nullifier) external {
        Storage.markNullifierUsed(nullifier);
    }
}

/**
 * @title StorageTest
 * @notice Tests for ERC-7201 storage architecture
 * @dev Verifies storage slot calculation and cross-language compatibility
 */
contract StorageTest is Test {
    using Storage for *;

    StorageTestHelper public helper;

    /// @dev Storage slot constant (for verification)
    bytes32 constant EXPECTED_SLOT = 0xe96c698557d1c96b88bdb445dd1e4d98c586bf83d2bb4c85329a45b5cd63a0d0;

    function setUp() public {
        helper = new StorageTestHelper();
    }

    /**
     * @notice Test that STORAGE_SLOT matches expected ERC-7201 calculation
     */
    function test_StorageSlotCalculation() public {
        assertEq(Storage.STORAGE_SLOT, EXPECTED_SLOT, "Storage slot mismatch");
    }

    /**
     * @notice Test VK registration
     */
    function test_VKRegistration() public {
        bytes32 vkHash = keccak256("test_vk_1");
        
        // Initially not registered
        assertFalse(Storage.isVKRegistered(vkHash), "VK should not be registered initially");
        
        // Register VK
        Storage.registerVK(vkHash);
        
        // Should be registered now
        assertTrue(Storage.isVKRegistered(vkHash), "VK should be registered");
        
        // Count should be 1
        assertEq(Storage.getVKCount(), 1, "VK count should be 1");
    }

    /**
     * @notice Test VK registration reverts on duplicate
     */
    function test_VKRegistrationRevertsOnDuplicate() public {
        bytes32 vkHash = keccak256("test_vk_duplicate");
        
        helper.registerVK(vkHash);
        
        vm.expectRevert("VK already registered");
        helper.registerVK(vkHash);
    }

    /**
     * @notice Test verifier address storage
     */
    function test_VerifierAddressStorage() public {
        address groth16Verifier = address(0x1111);
        address plonkVerifier = address(0x2222);
        address starkVerifier = address(0x3333);
        
        // Set verifiers
        Storage.setVerifier(1, groth16Verifier); // Groth16
        Storage.setVerifier(2, plonkVerifier);   // PLONK
        Storage.setVerifier(3, starkVerifier);   // STARK
        
        // Verify storage
        assertEq(Storage.getVerifier(1), groth16Verifier, "Groth16 verifier mismatch");
        assertEq(Storage.getVerifier(2), plonkVerifier, "PLONK verifier mismatch");
        assertEq(Storage.getVerifier(3), starkVerifier, "STARK verifier mismatch");
    }

    /**
     * @notice Test pause functionality
     */
    function test_PauseFunctionality() public {
        // Initially not paused
        assertFalse(Storage.isPaused(), "Should not be paused initially");
        
        // Pause
        Storage.setPaused(true);
        assertTrue(Storage.isPaused(), "Should be paused");
        
        // Unpause
        Storage.setPaused(false);
        assertFalse(Storage.isPaused(), "Should not be paused");
    }

    /**
     * @notice Test nullifier tracking
     */
    function test_NullifierTracking() public {
        bytes32 nullifier = keccak256("test_nullifier");
        
        // Initially not used
        assertFalse(Storage.isNullifierUsed(nullifier), "Nullifier should not be used initially");
        
        // Mark as used
        Storage.markNullifierUsed(nullifier);
        
        // Should be marked as used
        assertTrue(Storage.isNullifierUsed(nullifier), "Nullifier should be marked as used");
    }

    /**
     * @notice Test nullifier reverts on duplicate
     */
    function test_NullifierRevertsOnDuplicate() public {
        bytes32 nullifier = keccak256("test_nullifier_duplicate");
        
        helper.markNullifierUsed(nullifier);
        
        vm.expectRevert("Nullifier already used");
        helper.markNullifierUsed(nullifier);
    }

    /**
     * @notice Test verification counter
     */
    function test_VerificationCounter() public {
        assertEq(Storage.getTotalVerifications(), 0, "Initial count should be 0");
        
        Storage.incrementVerifications();
        assertEq(Storage.getTotalVerifications(), 1, "Count should be 1");
        
        Storage.incrementVerifications();
        Storage.incrementVerifications();
        assertEq(Storage.getTotalVerifications(), 3, "Count should be 3");
    }

    /**
     * @notice Test storage slot access via assembly
     * @dev This test writes directly to the storage slot and verifies reading
     */
    function test_DirectStorageSlotAccess() public {
        // Get storage layout reference
        Storage.StorageLayout storage layout = Storage.layout();
        
        // Write a test VK
        bytes32 testVK = keccak256("direct_slot_test");
        layout.verificationKeys[testVK] = true;
        
        // Read it back
        assertTrue(layout.verificationKeys[testVK], "Direct storage access failed");
        
        // Verify via helper function
        assertTrue(Storage.isVKRegistered(testVK), "Helper function mismatch");
    }

    /**
     * @notice Test that storage slot is correctly isolated
     * @dev Writes to a different slot should not affect our storage
     */
    function test_StorageIsolation() public {
        // Write to our storage
        bytes32 ourVK = keccak256("our_storage");
        Storage.registerVK(ourVK);
        
        // Write to a different slot (slot 0)
        bytes32 differentSlot = bytes32(0);
        assembly {
            sstore(differentSlot, 0x1234567890abcdef)
        }
        
        // Our storage should be unaffected
        assertTrue(Storage.isVKRegistered(ourVK), "Storage should be isolated");
        assertEq(Storage.getVKCount(), 1, "VK count should be unchanged");
    }

    /**
     * @notice Test multiple VK registrations
     */
    function test_MultipleVKRegistrations() public {
        bytes32[] memory vkHashes = new bytes32[](5);
        
        for (uint256 i = 0; i < 5; i++) {
            vkHashes[i] = keccak256(abi.encodePacked("vk_", i));
            Storage.registerVK(vkHashes[i]);
        }
        
        // All should be registered
        for (uint256 i = 0; i < 5; i++) {
            assertTrue(Storage.isVKRegistered(vkHashes[i]), "VK should be registered");
        }
        
        assertEq(Storage.getVKCount(), 5, "VK count should be 5");
    }

    /**
     * @notice Fuzz test for VK registration
     */
    function testFuzz_VKRegistration(bytes32 vkHash) public {
        vm.assume(vkHash != bytes32(0));
        
        assertFalse(Storage.isVKRegistered(vkHash));
        Storage.registerVK(vkHash);
        assertTrue(Storage.isVKRegistered(vkHash));
    }

    /**
     * @notice Fuzz test for nullifier tracking
     */
    function testFuzz_NullifierTracking(bytes32 nullifier) public {
        vm.assume(nullifier != bytes32(0));
        
        assertFalse(Storage.isNullifierUsed(nullifier));
        Storage.markNullifierUsed(nullifier);
        assertTrue(Storage.isNullifierUsed(nullifier));
    }
}
