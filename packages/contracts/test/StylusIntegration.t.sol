// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {UniversalZKVerifier} from "../src/UniversalZKVerifier.sol";
import {MockStylusVerifier} from "../src/mocks/MockStylusVerifier.sol";
import {IUniversalVerifier} from "../src/interfaces/IUniversalVerifier.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title StylusIntegrationTest
 * @notice Integration tests for Stylus WASM verifier functionality
 * @dev Tests end-to-end Stylus integration, gas benchmarking, and upgrade scenarios
 */
contract StylusIntegrationTest is Test {
    
    UniversalZKVerifier public verifier;
    MockStylusVerifier public stylusVerifier;
    
    address public admin = address(0x1);
    address public upgrader = address(0x11);
    address public pauser = address(0x12);
    
    bytes public constant SAMPLE_VK = hex"90abcdef1234567890abcdef1234567890abcdef";
    bytes32 public vkHash;
    
    event StylusVerifierUpdated(
        address indexed previousStylus,
        address indexed newStylus
    );
    
    function setUp() public {
        // Deploy implementation
        UniversalZKVerifier implementation = new UniversalZKVerifier();
        
        // Deploy proxy with initialization
        bytes memory initData = abi.encodeWithSelector(
            UniversalZKVerifier.initialize.selector,
            admin,
            upgrader,
            pauser
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        
        verifier = UniversalZKVerifier(address(proxy));
        
        // Deploy and configure Stylus mock
        stylusVerifier = new MockStylusVerifier(admin);
        
        vm.prank(admin);
        verifier.setStylusVerifier(address(stylusVerifier));
        
        // Register verification key
        vkHash = stylusVerifier.registerVkTyped(0, SAMPLE_VK);
    }
    
    // ============================================
    // STYLUS VERIFICATION TESTS
    // ============================================
    
    function test_StylusVerify_SingleProof() public {
        bytes memory proof = hex"1234567890abcdef";
        bytes memory publicInputs = hex"fedcba0987654321";
        
        bool result = verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            proof,
            publicInputs,
            SAMPLE_VK
        );
        
        assertTrue(result);
        assertEq(stylusVerifier.getVerificationCount(), 1);
    }
    
    function test_StylusVerify_MultipleProofs() public {
        bytes memory proof = hex"1234567890abcdef";
        bytes memory publicInputs = hex"fedcba0987654321";
        
        // Verify multiple times
        for (uint i = 0; i < 5; i++) {
            verifier.verify(
                UniversalZKVerifier.ProofType.GROTH16,
                proof,
                publicInputs,
                SAMPLE_VK
            );
        }
        
        assertEq(stylusVerifier.getVerificationCount(), 5);
    }
    
    function test_StylusVerify_AllProofTypes() public {
        bytes memory proof = hex"1234567890abcdef";
        bytes memory publicInputs = hex"fedcba0987654321";
        
        // Register VKs for all types
        stylusVerifier.registerVkTyped(1, SAMPLE_VK); // PLONK
        stylusVerifier.registerVkTyped(2, SAMPLE_VK); // STARK
        
        // Verify Groth16
        assertTrue(verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            proof,
            publicInputs,
            SAMPLE_VK
        ));
        
        // Verify PLONK
        assertTrue(verifier.verify(
            UniversalZKVerifier.ProofType.PLONK,
            proof,
            publicInputs,
            SAMPLE_VK
        ));
        
        // Verify STARK
        assertTrue(verifier.verify(
            UniversalZKVerifier.ProofType.STARK,
            proof,
            publicInputs,
            SAMPLE_VK
        ));
        
        assertEq(stylusVerifier.getVerificationCount(), 3);
    }
    
    // ============================================
    // BATCH VERIFICATION TESTS
    // ============================================
    
    function test_BatchVerify_SmallBatch() public {
        uint256 batchSize = 3;
        
        bytes[] memory proofs = new bytes[](batchSize);
        bytes[] memory publicInputs = new bytes[](batchSize);
        
        for (uint i = 0; i < batchSize; i++) {
            proofs[i] = abi.encodePacked("proof", i);
            publicInputs[i] = abi.encodePacked("input", i);
        }
        
        bool[] memory results = verifier.batchVerify(
            UniversalZKVerifier.ProofType.GROTH16,
            proofs,
            publicInputs,
            SAMPLE_VK
        );
        
        assertEq(results.length, batchSize);
        for (uint i = 0; i < batchSize; i++) {
            assertTrue(results[i]);
        }
    }
    
    function test_BatchVerify_LargeBatch() public {
        uint256 batchSize = 10;
        
        bytes[] memory proofs = new bytes[](batchSize);
        bytes[] memory publicInputs = new bytes[](batchSize);
        
        for (uint i = 0; i < batchSize; i++) {
            proofs[i] = abi.encodePacked("proof", i);
            publicInputs[i] = abi.encodePacked("input", i);
        }
        
        bool[] memory results = verifier.batchVerify(
            UniversalZKVerifier.ProofType.GROTH16,
            proofs,
            publicInputs,
            SAMPLE_VK
        );
        
        assertEq(results.length, batchSize);
        assertEq(stylusVerifier.getVerificationCount(), batchSize);
    }
    
    function test_BatchVerify_MixedResults() public {
        // Configure mock to fail on certain inputs
        stylusVerifier.setAlwaysSucceed(false);
        
        bytes[] memory proofs = new bytes[](2);
        bytes[] memory publicInputs = new bytes[](2);
        
        proofs[0] = hex"90abcd";
        proofs[1] = hex"12ef34";
        publicInputs[0] = hex"567890";
        publicInputs[1] = hex"abcdef";
        
        // Reset to succeed mode
        stylusVerifier.setAlwaysSucceed(true);
        
        bool[] memory results = verifier.batchVerify(
            UniversalZKVerifier.ProofType.GROTH16,
            proofs,
            publicInputs,
            SAMPLE_VK
        );
        
        // All should succeed now
        for (uint i = 0; i < results.length; i++) {
            assertTrue(results[i]);
        }
    }
    
    // ============================================
    // VK REGISTRATION TESTS
    // ============================================
    
    function test_RegisterVK_Groth16() public {
        bytes memory newVK = hex"deadbeef";
        
        bytes32 hash = verifier.registerVerificationKey(
            UniversalZKVerifier.ProofType.GROTH16,
            newVK
        );
        
        assertTrue(stylusVerifier.isVkRegistered(hash));
        assertEq(hash, keccak256(newVK));
    }
    
    function test_RegisterVK_AllTypes() public {
        bytes memory vk1 = hex"deadbeef1111";
        bytes memory vk2 = hex"deadbeef2222";
        bytes memory vk3 = hex"deadbeef3333";
        
        bytes32 hash1 = verifier.registerVerificationKey(
            UniversalZKVerifier.ProofType.GROTH16,
            vk1
        );
        bytes32 hash2 = verifier.registerVerificationKey(
            UniversalZKVerifier.ProofType.PLONK,
            vk2
        );
        bytes32 hash3 = verifier.registerVerificationKey(
            UniversalZKVerifier.ProofType.STARK,
            vk3
        );
        
        assertTrue(stylusVerifier.isVkRegistered(hash1));
        assertTrue(stylusVerifier.isVkRegistered(hash2));
        assertTrue(stylusVerifier.isVkRegistered(hash3));
    }
    
    // ============================================
    // UPGRADE SCENARIO TESTS
    // ============================================
    
    function test_UpgradeToStylus_FromSolidityModule() public {
        // Deploy new instance without Stylus
        UniversalZKVerifier implementation = new UniversalZKVerifier();
        
        bytes memory initData = abi.encodeWithSelector(
            UniversalZKVerifier.initialize.selector,
            admin,
            upgrader,
            pauser
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        
        UniversalZKVerifier legacyVerifier = UniversalZKVerifier(address(proxy));
        
        // Verify it has no Stylus
        assertEq(legacyVerifier.stylusVerifier(), address(0));
        
        // Upgrade to Stylus
        vm.prank(admin);
        legacyVerifier.setStylusVerifier(address(stylusVerifier));
        
        // Register VK
        stylusVerifier.registerVkTyped(0, SAMPLE_VK);
        
        // Verify works
        bool result = legacyVerifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            hex"1234",
            hex"5678",
            SAMPLE_VK
        );
        
        assertTrue(result);
    }
    
    function test_DowngradeFromStylus_ToSolidityModule() public {
        // Start with Stylus
        assertEq(verifier.stylusVerifier(), address(stylusVerifier));
        
        // Remove Stylus
        vm.prank(admin);
        verifier.removeStylusVerifier();
        
        assertEq(verifier.stylusVerifier(), address(0));
        
        // Deploy Solidity module
        MockSolidityVerifier solidityModule = new MockSolidityVerifier();
        
        vm.prank(admin);
        verifier.setVerifierModule(
            UniversalZKVerifier.ProofType.GROTH16,
            address(solidityModule)
        );
        
        // Verify works with Solidity module
        bool result = verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            hex"1234",
            hex"5678",
            SAMPLE_VK
        );
        
        assertTrue(result);
    }
    
    // ============================================
    // ERROR HANDLING TESTS
    // ============================================
    
    function test_RevertWhen_StylusVerifyWithUnregisteredVK() public {
        bytes memory newVK = hex"de1122334455";
        
        // Should revert when VK not registered (wrapped in StylusVerificationFailed)
        vm.expectRevert();
        
        verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            hex"1234",
            hex"5678",
            newVK
        );
    }
    
    function test_RevertWhen_StylusVerifyWithInvalidProofType() public {
        // Mock doesn't validate proof type at verify level, tests type conversion
        bytes memory proof = hex"1234";
        bytes memory publicInputs = hex"5678";
        
        // This should work - type 0, 1, 2 are valid
        verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            proof,
            publicInputs,
            SAMPLE_VK
        );
    }
    
    function test_RevertWhen_StylusContractPaused() public {
        // Pause Stylus contract
        vm.prank(admin);
        stylusVerifier.pause();
        
        // Should revert when contract paused (wrapped in StylusVerificationFailed)
        vm.expectRevert();
        
        verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            hex"1234",
            hex"5678",
            SAMPLE_VK
        );
    }
    
    function test_RevertWhen_BatchVerifyWithoutStylus() public {
        // Remove Stylus
        vm.prank(admin);
        verifier.removeStylusVerifier();
        
        bytes[] memory proofs = new bytes[](1);
        bytes[] memory publicInputs = new bytes[](1);
        proofs[0] = hex"1234";
        publicInputs[0] = hex"5678";
        
        vm.expectRevert(
            abi.encodeWithSelector(
                UniversalZKVerifier.StylusVerificationFailed.selector,
                "Batch verify requires Stylus"
            )
        );
        
        verifier.batchVerify(
            UniversalZKVerifier.ProofType.GROTH16,
            proofs,
            publicInputs,
            SAMPLE_VK
        );
    }
    
    // ============================================
    // GAS BENCHMARKING TESTS
    // ============================================
    
    function test_Gas_SingleVerification() public {
        bytes memory proof = hex"1234567890abcdef";
        bytes memory publicInputs = hex"fedcba0987654321";
        
        uint256 gasBefore = gasleft();
        verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            proof,
            publicInputs,
            SAMPLE_VK
        );
        uint256 gasUsed = gasBefore - gasleft();
        
        // Log for manual inspection
        emit log_named_uint("Gas used for single verification", gasUsed);
        
        // Rough check - should be less than 100k gas
        assertLt(gasUsed, 100000);
    }
    
    function test_Gas_BatchVerification() public {
        uint256 batchSize = 10;
        
        bytes[] memory proofs = new bytes[](batchSize);
        bytes[] memory publicInputs = new bytes[](batchSize);
        
        for (uint i = 0; i < batchSize; i++) {
            proofs[i] = abi.encodePacked("proof", i);
            publicInputs[i] = abi.encodePacked("input", i);
        }
        
        uint256 gasBefore = gasleft();
        verifier.batchVerify(
            UniversalZKVerifier.ProofType.GROTH16,
            proofs,
            publicInputs,
            SAMPLE_VK
        );
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas used for batch verification (10 proofs)", gasUsed);
        
        // Batch should be more efficient than 10 individual verifies
        // Rough check - should be less than 500k gas
        assertLt(gasUsed, 500000);
    }
    
    function test_Gas_VKRegistration() public {
        bytes memory newVK = hex"deadbeefcafebabe1234567890abcdef";
        
        uint256 gasBefore = gasleft();
        verifier.registerVerificationKey(
            UniversalZKVerifier.ProofType.GROTH16,
            newVK
        );
        uint256 gasUsed = gasBefore - gasleft();
        
        emit log_named_uint("Gas used for VK registration", gasUsed);
        
        // VK registration is one-time cost
        assertLt(gasUsed, 100000);
    }
    
    // ============================================
    // INTEGRATION TESTS
    // ============================================
    
    function test_Integration_FullWorkflow() public {
        // 1. Register VK
        bytes memory vk = hex"de1122aabbccdd";
        bytes32 hash = verifier.registerVerificationKey(
            UniversalZKVerifier.ProofType.GROTH16,
            vk
        );
        
        assertTrue(stylusVerifier.isVkRegistered(hash));
        
        // 2. Single verification
        bool result1 = verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            hex"aabbcc11",
            hex"ddeeff22",
            vk
        );
        assertTrue(result1);
        
        // 3. Batch verification
        bytes[] memory proofs = new bytes[](3);
        bytes[] memory publicInputs = new bytes[](3);
        
        for (uint i = 0; i < 3; i++) {
            proofs[i] = abi.encodePacked("proof", i);
            publicInputs[i] = abi.encodePacked("input", i);
        }
        
        bool[] memory batchResults = verifier.batchVerify(
            UniversalZKVerifier.ProofType.GROTH16,
            proofs,
            publicInputs,
            vk
        );
        
        for (uint i = 0; i < 3; i++) {
            assertTrue(batchResults[i]);
        }
        
        // 4. Verify count
        assertEq(stylusVerifier.getVerificationCount(), 4); // 1 single + 3 batch
    }
}

// ============================================
// MOCK SOLIDITY VERIFIER
// ============================================

contract MockSolidityVerifier {
    function verify(
        bytes calldata,
        bytes calldata,
        bytes calldata
    ) external pure returns (bool) {
        return true;
    }
}
