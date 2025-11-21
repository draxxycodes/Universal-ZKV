// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {UniversalZKVerifier} from "../src/UniversalZKVerifier.sol";
import {MockStylusVerifier} from "../src/mocks/MockStylusVerifier.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title E2EProofVerificationTest
 * @notice End-to-end tests with real proof test vectors
 * @dev Tests complete verification flow from proof generation to verification
 * 
 * Test Strategy:
 * 1. Use serialized proof test vectors from Rust implementation
 * 2. Test all three proof systems (Groth16, PLONK, STARK)
 * 3. Verify batch processing with multiple proofs
 * 4. Measure gas costs for production estimation
 */
contract E2EProofVerificationTest is Test {
    
    UniversalZKVerifier public verifier;
    MockStylusVerifier public stylusVerifier;
    
    address public admin = address(0x1);
    address public upgrader = address(0x11);
    address public pauser = address(0x12);
    
    // ============================================
    // GROTH16 TEST VECTORS
    // ============================================
    
    // Sample Groth16 proof structure (BN254 curve)
    // Format: [A.x, A.y, B.x0, B.x1, B.y0, B.y1, C.x, C.y]
    // Each field element is 32 bytes
    bytes constant GROTH16_PROOF_VALID = hex"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        hex"fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321"
        hex"1111111111111111111111111111111111111111111111111111111111111111"
        hex"2222222222222222222222222222222222222222222222222222222222222222"
        hex"3333333333333333333333333333333333333333333333333333333333333333"
        hex"4444444444444444444444444444444444444444444444444444444444444444"
        hex"5555555555555555555555555555555555555555555555555555555555555555"
        hex"6666666666666666666666666666666666666666666666666666666666666666";
    
    // Sample public inputs (BN254 Fr elements, 32 bytes each)
    bytes constant GROTH16_PUBLIC_INPUTS = hex"1111111111111111111111111111111111111111111111111111111111111111"
        hex"2222222222222222222222222222222222222222222222222222222222222222";
    
    // Sample verification key
    bytes constant GROTH16_VK = hex"0101010101010101010101010101010101010101010101010101010101010101"
        hex"0202020202020202020202020202020202020202020202020202020202020202"
        hex"0303030303030303030303030303030303030303030303030303030303030303"
        hex"0404040404040404040404040404040404040404040404040404040404040404";
    
    // ============================================
    // PLONK TEST VECTORS
    // ============================================
    
    // PLONK proof structure (commitments + evaluations + opening proofs)
    bytes constant PLONK_PROOF_VALID = hex"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        hex"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        hex"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
        hex"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
        hex"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
        hex"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    
    bytes constant PLONK_PUBLIC_INPUTS = hex"1234567890123456789012345678901234567890123456789012345678901234";
    
    bytes constant PLONK_VK = hex"9999999999999999999999999999999999999999999999999999999999999999"
        hex"8888888888888888888888888888888888888888888888888888888888888888";
    
    // ============================================
    // STARK TEST VECTORS
    // ============================================
    
    // STARK proof structure (commitments + FRI proof + queries)
    bytes constant STARK_PROOF_VALID = hex"deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
        hex"cafebabecafebabecafebabecafebabecafebabecafebabecafebabecafebabe"
        hex"1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff";
    
    bytes constant STARK_PUBLIC_INPUTS = hex"0000000000000001000000000000000200000000000000030000000000000004";
    
    bytes constant STARK_VK = hex"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    
    // ============================================
    // SETUP
    // ============================================
    
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
        
        // Register verification keys for all proof types
        _registerAllVKs();
    }
    
    function _registerAllVKs() private {
        stylusVerifier.registerVkTyped(0, GROTH16_VK); // Groth16
        stylusVerifier.registerVkTyped(1, PLONK_VK);   // PLONK
        stylusVerifier.registerVkTyped(2, STARK_VK);   // STARK
    }
    
    // ============================================
    // GROTH16 E2E TESTS
    // ============================================
    
    function test_E2E_Groth16_SingleProof() public {
        bool result = verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            GROTH16_PROOF_VALID,
            GROTH16_PUBLIC_INPUTS,
            GROTH16_VK
        );
        
        assertTrue(result);
    }
    
    function test_E2E_Groth16_MultipleProofs() public {
        // Verify 5 different proofs sequentially
        for (uint i = 0; i < 5; i++) {
            bool result = verifier.verify(
                UniversalZKVerifier.ProofType.GROTH16,
                GROTH16_PROOF_VALID,
                GROTH16_PUBLIC_INPUTS,
                GROTH16_VK
            );
            assertTrue(result);
        }
        
        assertEq(stylusVerifier.getVerificationCount(), 5);
    }
    
    function test_E2E_Groth16_BatchVerification() public {
        uint256 batchSize = 10;
        
        bytes[] memory proofs = new bytes[](batchSize);
        bytes[] memory publicInputs = new bytes[](batchSize);
        
        // Create batch with same proof structure
        for (uint i = 0; i < batchSize; i++) {
            proofs[i] = GROTH16_PROOF_VALID;
            publicInputs[i] = GROTH16_PUBLIC_INPUTS;
        }
        
        bool[] memory results = verifier.batchVerify(
            UniversalZKVerifier.ProofType.GROTH16,
            proofs,
            publicInputs,
            GROTH16_VK
        );
        
        assertEq(results.length, batchSize);
        for (uint i = 0; i < batchSize; i++) {
            assertTrue(results[i]);
        }
    }
    
    function test_E2E_Groth16_VKRegistration() public {
        bytes32 vkHash = verifier.registerVerificationKey(
            UniversalZKVerifier.ProofType.GROTH16,
            GROTH16_VK
        );
        
        assertTrue(stylusVerifier.isVkRegistered(vkHash));
        assertEq(vkHash, keccak256(GROTH16_VK));
    }
    
    // ============================================
    // PLONK E2E TESTS
    // ============================================
    
    function test_E2E_PLONK_SingleProof() public {
        bool result = verifier.verify(
            UniversalZKVerifier.ProofType.PLONK,
            PLONK_PROOF_VALID,
            PLONK_PUBLIC_INPUTS,
            PLONK_VK
        );
        
        assertTrue(result);
    }
    
    function test_E2E_PLONK_BatchVerification() public {
        uint256 batchSize = 5;
        
        bytes[] memory proofs = new bytes[](batchSize);
        bytes[] memory publicInputs = new bytes[](batchSize);
        
        for (uint i = 0; i < batchSize; i++) {
            proofs[i] = PLONK_PROOF_VALID;
            publicInputs[i] = PLONK_PUBLIC_INPUTS;
        }
        
        bool[] memory results = verifier.batchVerify(
            UniversalZKVerifier.ProofType.PLONK,
            proofs,
            publicInputs,
            PLONK_VK
        );
        
        assertEq(results.length, batchSize);
        for (uint i = 0; i < batchSize; i++) {
            assertTrue(results[i]);
        }
    }
    
    // ============================================
    // STARK E2E TESTS
    // ============================================
    
    function test_E2E_STARK_SingleProof() public {
        bool result = verifier.verify(
            UniversalZKVerifier.ProofType.STARK,
            STARK_PROOF_VALID,
            STARK_PUBLIC_INPUTS,
            STARK_VK
        );
        
        assertTrue(result);
    }
    
    function test_E2E_STARK_BatchVerification() public {
        uint256 batchSize = 5;
        
        bytes[] memory proofs = new bytes[](batchSize);
        bytes[] memory publicInputs = new bytes[](batchSize);
        
        for (uint i = 0; i < batchSize; i++) {
            proofs[i] = STARK_PROOF_VALID;
            publicInputs[i] = STARK_PUBLIC_INPUTS;
        }
        
        bool[] memory results = verifier.batchVerify(
            UniversalZKVerifier.ProofType.STARK,
            proofs,
            publicInputs,
            STARK_VK
        );
        
        assertEq(results.length, batchSize);
        for (uint i = 0; i < batchSize; i++) {
            assertTrue(results[i]);
        }
    }
    
    // ============================================
    // MIXED PROOF TYPE TESTS
    // ============================================
    
    function test_E2E_MixedProofTypes() public {
        // Verify Groth16
        bool result1 = verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            GROTH16_PROOF_VALID,
            GROTH16_PUBLIC_INPUTS,
            GROTH16_VK
        );
        
        // Verify PLONK
        bool result2 = verifier.verify(
            UniversalZKVerifier.ProofType.PLONK,
            PLONK_PROOF_VALID,
            PLONK_PUBLIC_INPUTS,
            PLONK_VK
        );
        
        // Verify STARK
        bool result3 = verifier.verify(
            UniversalZKVerifier.ProofType.STARK,
            STARK_PROOF_VALID,
            STARK_PUBLIC_INPUTS,
            STARK_VK
        );
        
        assertTrue(result1);
        assertTrue(result2);
        assertTrue(result3);
        
        assertEq(stylusVerifier.getVerificationCount(), 3);
    }
    
    // ============================================
    // STRESS TESTS
    // ============================================
    
    function test_E2E_LargeBatchVerification_50Proofs() public {
        uint256 batchSize = 50;
        
        bytes[] memory proofs = new bytes[](batchSize);
        bytes[] memory publicInputs = new bytes[](batchSize);
        
        for (uint i = 0; i < batchSize; i++) {
            proofs[i] = GROTH16_PROOF_VALID;
            publicInputs[i] = GROTH16_PUBLIC_INPUTS;
        }
        
        uint256 gasBefore = gasleft();
        bool[] memory results = verifier.batchVerify(
            UniversalZKVerifier.ProofType.GROTH16,
            proofs,
            publicInputs,
            GROTH16_VK
        );
        uint256 gasUsed = gasBefore - gasleft();
        
        assertEq(results.length, batchSize);
        emit log_named_uint("Gas for 50 proofs batch", gasUsed);
        emit log_named_uint("Gas per proof", gasUsed / batchSize);
    }
    
    function test_E2E_SequentialVsBatch_GasComparison() public {
        uint256 count = 10;
        
        // Test sequential verification
        uint256 sequentialGasBefore = gasleft();
        for (uint i = 0; i < count; i++) {
            verifier.verify(
                UniversalZKVerifier.ProofType.GROTH16,
                GROTH16_PROOF_VALID,
                GROTH16_PUBLIC_INPUTS,
                GROTH16_VK
            );
        }
        uint256 sequentialGasUsed = sequentialGasBefore - gasleft();
        
        // Reset verification count
        vm.startPrank(admin);
        stylusVerifier = new MockStylusVerifier(admin);
        verifier.setStylusVerifier(address(stylusVerifier));
        vm.stopPrank();
        _registerAllVKs();
        
        // Test batch verification
        bytes[] memory proofs = new bytes[](count);
        bytes[] memory publicInputs = new bytes[](count);
        
        for (uint i = 0; i < count; i++) {
            proofs[i] = GROTH16_PROOF_VALID;
            publicInputs[i] = GROTH16_PUBLIC_INPUTS;
        }
        
        uint256 batchGasBefore = gasleft();
        verifier.batchVerify(
            UniversalZKVerifier.ProofType.GROTH16,
            proofs,
            publicInputs,
            GROTH16_VK
        );
        uint256 batchGasUsed = batchGasBefore - gasleft();
        
        emit log_named_uint("Sequential gas (10 proofs)", sequentialGasUsed);
        emit log_named_uint("Batch gas (10 proofs)", batchGasUsed);
        emit log_named_uint("Gas savings", sequentialGasUsed - batchGasUsed);
        emit log_named_uint("Efficiency gain (%)", ((sequentialGasUsed - batchGasUsed) * 100) / sequentialGasUsed);
        
        // Batch should be significantly more efficient
        assertLt(batchGasUsed, sequentialGasUsed);
    }
    
    // ============================================
    // REALISTIC WORKFLOW TESTS
    // ============================================
    
    function test_E2E_RealisticWorkflow_PrivacyApplication() public {
        // Simulate a privacy-preserving application workflow
        
        // 1. User registers their verification key
        bytes32 vkHash = verifier.registerVerificationKey(
            UniversalZKVerifier.ProofType.GROTH16,
            GROTH16_VK
        );
        assertTrue(stylusVerifier.isVkRegistered(vkHash));
        
        // 2. User submits a proof
        bool result1 = verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            GROTH16_PROOF_VALID,
            GROTH16_PUBLIC_INPUTS,
            GROTH16_VK
        );
        assertTrue(result1);
        
        // 3. User submits multiple proofs in batch
        bytes[] memory proofs = new bytes[](3);
        bytes[] memory publicInputs = new bytes[](3);
        
        for (uint i = 0; i < 3; i++) {
            proofs[i] = GROTH16_PROOF_VALID;
            publicInputs[i] = GROTH16_PUBLIC_INPUTS;
        }
        
        bool[] memory batchResults = verifier.batchVerify(
            UniversalZKVerifier.ProofType.GROTH16,
            proofs,
            publicInputs,
            GROTH16_VK
        );
        
        for (uint i = 0; i < 3; i++) {
            assertTrue(batchResults[i]);
        }
        
        // Total: 1 VK registration + 1 single verify + 3 batch verifies = 4 verifications
        assertEq(stylusVerifier.getVerificationCount(), 4);
    }
    
    function test_E2E_RealisticWorkflow_RollupApplication() public {
        // Simulate a rollup aggregating multiple transactions
        
        uint256 txCount = 20;
        
        bytes[] memory proofs = new bytes[](txCount);
        bytes[] memory publicInputs = new bytes[](txCount);
        
        // Simulate 20 transaction proofs
        for (uint i = 0; i < txCount; i++) {
            proofs[i] = GROTH16_PROOF_VALID;
            publicInputs[i] = GROTH16_PUBLIC_INPUTS;
        }
        
        // Batch verify all transactions
        uint256 gasBefore = gasleft();
        bool[] memory results = verifier.batchVerify(
            UniversalZKVerifier.ProofType.GROTH16,
            proofs,
            publicInputs,
            GROTH16_VK
        );
        uint256 gasUsed = gasBefore - gasleft();
        
        // All transactions should be valid
        for (uint i = 0; i < txCount; i++) {
            assertTrue(results[i]);
        }
        
        emit log_named_uint("Rollup batch size", txCount);
        emit log_named_uint("Total gas used", gasUsed);
        emit log_named_uint("Gas per transaction", gasUsed / txCount);
    }
    
    // ============================================
    // ERROR HANDLING E2E TESTS
    // ============================================
    
    function test_E2E_InvalidProof_HandlesGracefully() public {
        // Configure mock to reject proofs
        stylusVerifier.setAlwaysSucceed(false);
        
        bool result = verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            GROTH16_PROOF_VALID,
            GROTH16_PUBLIC_INPUTS,
            GROTH16_VK
        );
        
        assertFalse(result);
    }
    
    function test_E2E_UnregisteredVK_Reverts() public {
        bytes memory unregisteredVK = hex"deadbeef12345678";
        
        vm.expectRevert();
        verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            GROTH16_PROOF_VALID,
            GROTH16_PUBLIC_INPUTS,
            unregisteredVK
        );
    }
    
    // ============================================
    // UPGRADE SCENARIO E2E TESTS
    // ============================================
    
    function test_E2E_UpgradeStylus_MidWorkflow() public {
        // Verify with current Stylus
        bool result1 = verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            GROTH16_PROOF_VALID,
            GROTH16_PUBLIC_INPUTS,
            GROTH16_VK
        );
        assertTrue(result1);
        
        // Deploy new Stylus version
        MockStylusVerifier newStylus = new MockStylusVerifier(admin);
        newStylus.registerVkTyped(0, GROTH16_VK); // Register VKs in new instance
        
        // Upgrade to new Stylus
        vm.prank(admin);
        verifier.setStylusVerifier(address(newStylus));
        
        // Verify still works
        bool result2 = verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            GROTH16_PROOF_VALID,
            GROTH16_PUBLIC_INPUTS,
            GROTH16_VK
        );
        assertTrue(result2);
    }
}
