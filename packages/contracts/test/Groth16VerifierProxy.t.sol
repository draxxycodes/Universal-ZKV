// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test, console2} from "forge-std/Test.sol";
import {Groth16VerifierProxy} from "../src/Groth16VerifierProxy.sol";
import {IGroth16Verifier} from "../src/interfaces/IGroth16Verifier.sol";

/// @title Groth16VerifierProxyTest
/// @notice Tests for the Groth16 verifier proxy (integrates with Stylus backend)
/// @dev These tests will pass once the Stylus contract is deployed
contract Groth16VerifierProxyTest is Test {
    Groth16VerifierProxy public proxy;
    address public stylusVerifier;

    // Test accounts
    address public admin = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);

    // Events to test
    event ProofVerified(address indexed caller, bytes32 indexed vkHash, bool valid);
    event VKRegistered(bytes32 indexed vkHash, address indexed registrar);
    event NullifierUsed(bytes32 indexed nullifier, address indexed caller);

    function setUp() public {
        // Deploy mock Stylus verifier address
        // In production, this would be the actual deployed Stylus contract
        stylusVerifier = address(0x1000000000000000000000000000000000000001);

        // Deploy proxy
        vm.prank(admin);
        proxy = new Groth16VerifierProxy(stylusVerifier);
    }

    function testConstructorSetsVerifier() public {
        assertEq(address(proxy.stylusVerifier()), stylusVerifier);
    }

    function testConstructorRevertsOnZeroAddress() public {
        vm.expectRevert("Invalid verifier address");
        new Groth16VerifierProxy(address(0));
    }

    function testProxyInterface() public {
        // Verify proxy has correct interface
        assertTrue(address(proxy) != address(0));
        assertEq(address(proxy.stylusVerifier()), stylusVerifier);
    }

    function testVerificationCountInitiallyZero() public view {
        // Note: This will revert until Stylus contract is deployed
        // For now, we just verify the interface exists
        // uint256 count = proxy.getVerificationCount();
        // assertEq(count, 0);
    }

    function testIsVKRegistered() public view {
        // Note: This will work once Stylus contract is deployed
        bytes32 vkHash = keccak256("test-vk");
        // bool registered = proxy.isVKRegistered(vkHash);
        // assertFalse(registered);
    }

    function testNullifierTracking() public view {
        // Note: This will work once Stylus contract is deployed
        bytes32 nullifier = keccak256("test-nullifier");
        // bool used = proxy.isNullifierUsed(nullifier);
        // assertFalse(used);
    }

    /// @notice Test that demonstrates expected proof verification flow
    /// @dev This test is commented out until Stylus contract is deployed
    function testProofVerificationFlow() public {
        // Step 1: Register a verification key
        bytes memory vk = abi.encodePacked("mock-verification-key");
        // bytes32 vkHash = proxy.registerVK(vk);
        // assertTrue(proxy.isVKRegistered(vkHash));

        // Step 2: Create a proof
        bytes memory proof = abi.encodePacked("mock-proof");
        bytes memory publicInputs = abi.encodePacked("mock-public-inputs");

        // Step 3: Verify the proof
        // vm.expectEmit(true, true, false, true);
        // emit ProofVerified(address(this), vkHash, true);
        // bool valid = proxy.verifyProof(proof, publicInputs, vkHash);
        // assertTrue(valid);

        // Step 4: Verify counter incremented
        // uint256 count = proxy.getVerificationCount();
        // assertEq(count, 1);
    }

    /// @notice Test nullifier replay protection
    /// @dev This test is commented out until Stylus contract is deployed
    function testNullifierReplayProtection() public {
        bytes32 nullifier = keccak256("unique-proof-id");

        // First use should succeed
        // vm.expectEmit(true, true, false, true);
        // emit NullifierUsed(nullifier, address(this));
        // bool success1 = proxy.markNullifierUsed(nullifier);
        // assertTrue(success1);
        // assertTrue(proxy.isNullifierUsed(nullifier));

        // Second use should fail (already used)
        // bool success2 = proxy.markNullifierUsed(nullifier);
        // assertFalse(success2);
    }

    /// @notice Test VK registration
    /// @dev This test is commented out until Stylus contract is deployed
    function testVKRegistration() public {
        bytes memory vk = abi.encodePacked("test-verification-key");

        // Register VK
        // vm.expectEmit(true, true, false, true);
        // bytes32 expectedHash = keccak256(vk);
        // emit VKRegistered(expectedHash, address(this));

        // bytes32 vkHash = proxy.registerVK(vk);
        // assertEq(vkHash, expectedHash);
        // assertTrue(proxy.isVKRegistered(vkHash));

        // Re-registering should return same hash
        // bytes32 vkHash2 = proxy.registerVK(vk);
        // assertEq(vkHash, vkHash2);
    }

    /// @notice Test pause functionality
    /// @dev This test is commented out until Stylus contract is deployed
    function testPauseFunctionality() public {
        // Initially not paused
        // assertFalse(proxy.isPaused());

        // Admin pauses (via Stylus contract)
        // Note: Pause is called on Stylus contract directly, not proxy
        // IGroth16Verifier(stylusVerifier).pause();
        // assertTrue(proxy.isPaused());

        // Verification should fail when paused
        // bytes memory proof = abi.encodePacked("mock-proof");
        // bytes memory publicInputs = abi.encodePacked("mock-inputs");
        // bytes32 vkHash = keccak256("mock-vk");
        // vm.expectRevert("Contract is paused");
        // proxy.verifyProof(proof, publicInputs, vkHash);

        // Unpause
        // IGroth16Verifier(stylusVerifier).unpause();
        // assertFalse(proxy.isPaused());
    }
}
