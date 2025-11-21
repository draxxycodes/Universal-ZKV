// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Test.sol";
import "../src/UniversalZKVerifier.sol";
import "../src/mocks/MockStylusVerifier.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title GasBenchmarkTest
 * @notice Comprehensive gas benchmarking for Stylus vs Solidity verification
 * 
 * Measures:
 * 1. Single proof verification (all proof types)
 * 2. Batch verification (10, 50, 100 proofs)
 * 3. VK registration costs
 * 4. Realistic workflows (privacy apps, rollups)
 * 5. Stylus vs Solidity comparison
 * 
 * Run with: forge test --match-contract GasBenchmarkTest --gas-report
 */
contract GasBenchmarkTest is Test {
    
    UniversalZKVerifier public verifier;
    MockStylusVerifier public stylusVerifier;
    
    address public admin;
    address public user;
    
    // Test vectors (using same vectors as E2E tests)
    bytes constant GROTH16_PROOF = hex"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    bytes constant GROTH16_PUBLIC_INPUTS = hex"0000000000000000000000000000000000000000000000000000000000000001";
    bytes constant GROTH16_VK = hex"abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    
    bytes constant PLONK_PROOF = hex"fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321";
    bytes constant PLONK_PUBLIC_INPUTS = hex"0000000000000000000000000000000000000000000000000000000000000002";
    bytes constant PLONK_VK = hex"bcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890bcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890bcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890bcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890bcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890bcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890bcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890bcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890bcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890bcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890bcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890bcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    
    function setUp() public {
        admin = makeAddr("admin");
        user = makeAddr("user");
        
        // Deploy implementation
        UniversalZKVerifier implementation = new UniversalZKVerifier();
        
        // Deploy proxy with initialization
        bytes memory initData = abi.encodeWithSelector(
            UniversalZKVerifier.initialize.selector,
            admin,
            admin,
            admin
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        verifier = UniversalZKVerifier(address(proxy));
        
        vm.startPrank(admin);
        
        // Deploy and configure Stylus mock
        stylusVerifier = new MockStylusVerifier(admin);
        stylusVerifier.setAlwaysSucceed(true);
        verifier.setStylusVerifier(address(stylusVerifier));
        
        // Register VKs in Stylus mock
        stylusVerifier.registerVkTyped(uint8(UniversalZKVerifier.ProofType.GROTH16), GROTH16_VK);
        stylusVerifier.registerVkTyped(uint8(UniversalZKVerifier.ProofType.PLONK), PLONK_VK);
        
        vm.stopPrank();
    }
    
    // ============================================
    // BENCHMARK 1: Single Proof Verification
    // ============================================
    
    /// @notice Benchmark: Groth16 single verification via Stylus
    function test_GasBenchmark_Groth16_Single_Stylus() public {
        vm.prank(user);
        bool result = verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            GROTH16_PROOF,
            GROTH16_PUBLIC_INPUTS,
            GROTH16_VK
        );
        assertTrue(result);
    }
    
    /// @notice Benchmark: PLONK single verification via Stylus
    function test_GasBenchmark_PLONK_Single_Stylus() public {
        vm.prank(user);
        bool result = verifier.verify(
            UniversalZKVerifier.ProofType.PLONK,
            PLONK_PROOF,
            PLONK_PUBLIC_INPUTS,
            PLONK_VK
        );
        assertTrue(result);
    }
    
    // ============================================
    // BENCHMARK 2: Batch Verification
    // ============================================
    
    /// @notice Benchmark: Batch 10 proofs via Stylus
    function test_GasBenchmark_Batch10_Stylus() public {
        bytes[] memory proofs = new bytes[](10);
        bytes[] memory inputs = new bytes[](10);
        
        for (uint i = 0; i < 10; i++) {
            proofs[i] = GROTH16_PROOF;
            inputs[i] = GROTH16_PUBLIC_INPUTS;
        }
        
        vm.prank(user);
        bool[] memory results = verifier.batchVerify(
            UniversalZKVerifier.ProofType.GROTH16,
            proofs,
            inputs,
            GROTH16_VK
        );
        
        assertEq(results.length, 10);
        for (uint i = 0; i < 10; i++) {
            assertTrue(results[i]);
        }
    }
    
    /// @notice Benchmark: Batch 50 proofs via Stylus
    function test_GasBenchmark_Batch50_Stylus() public {
        bytes[] memory proofs = new bytes[](50);
        bytes[] memory inputs = new bytes[](50);
        
        for (uint i = 0; i < 50; i++) {
            proofs[i] = GROTH16_PROOF;
            inputs[i] = GROTH16_PUBLIC_INPUTS;
        }
        
        vm.prank(user);
        bool[] memory results = verifier.batchVerify(
            UniversalZKVerifier.ProofType.GROTH16,
            proofs,
            inputs,
            GROTH16_VK
        );
        
        assertEq(results.length, 50);
        for (uint i = 0; i < 50; i++) {
            assertTrue(results[i]);
        }
    }
    
    /// @notice Benchmark: Batch 100 proofs via Stylus
    function test_GasBenchmark_Batch100_Stylus() public {
        bytes[] memory proofs = new bytes[](100);
        bytes[] memory inputs = new bytes[](100);
        
        for (uint i = 0; i < 100; i++) {
            proofs[i] = GROTH16_PROOF;
            inputs[i] = GROTH16_PUBLIC_INPUTS;
        }
        
        vm.prank(user);
        bool[] memory results = verifier.batchVerify(
            UniversalZKVerifier.ProofType.GROTH16,
            proofs,
            inputs,
            GROTH16_VK
        );
        
        assertEq(results.length, 100);
        for (uint i = 0; i < 100; i++) {
            assertTrue(results[i]);
        }
    }
    
    // ============================================
    // BENCHMARK 3: VK Registration
    // ============================================
    
    /// @notice Benchmark: Register Groth16 VK
    function test_GasBenchmark_RegisterVK_Groth16() public {
        bytes memory uniqueVk = abi.encodePacked(GROTH16_VK, uint256(12345));
        
        vm.prank(admin);
        bytes32 vkHash = verifier.registerVerificationKey(
            UniversalZKVerifier.ProofType.GROTH16,
            uniqueVk
        );
        
        assertTrue(vkHash != bytes32(0));
    }
    
    /// @notice Benchmark: Register PLONK VK
    function test_GasBenchmark_RegisterVK_PLONK() public {
        bytes memory uniqueVk = abi.encodePacked(PLONK_VK, uint256(67890));
        
        vm.prank(admin);
        bytes32 vkHash = verifier.registerVerificationKey(
            UniversalZKVerifier.ProofType.PLONK,
            uniqueVk
        );
        
        assertTrue(vkHash != bytes32(0));
    }
    
    // ============================================
    // BENCHMARK 4: Realistic Workflows
    // ============================================
    
    /// @notice Benchmark: Privacy app - 5 sequential verifications
    function test_GasBenchmark_Workflow_PrivacyApp_Sequential() public {
        vm.startPrank(user);
        
        for (uint i = 0; i < 5; i++) {
            bool result = verifier.verify(
                UniversalZKVerifier.ProofType.GROTH16,
                GROTH16_PROOF,
                GROTH16_PUBLIC_INPUTS,
                GROTH16_VK
            );
            assertTrue(result);
        }
        
        vm.stopPrank();
    }
    
    /// @notice Benchmark: Rollup aggregation - 20 tx batch
    function test_GasBenchmark_Workflow_Rollup_Batch20() public {
        bytes[] memory proofs = new bytes[](20);
        bytes[] memory inputs = new bytes[](20);
        
        for (uint i = 0; i < 20; i++) {
            proofs[i] = GROTH16_PROOF;
            inputs[i] = GROTH16_PUBLIC_INPUTS;
        }
        
        vm.prank(user);
        bool[] memory results = verifier.batchVerify(
            UniversalZKVerifier.ProofType.GROTH16,
            proofs,
            inputs,
            GROTH16_VK
        );
        
        assertEq(results.length, 20);
        for (uint i = 0; i < 20; i++) {
            assertTrue(results[i]);
        }
    }
    
    /// @notice Benchmark: Mixed proof types - privacy + identity
    function test_GasBenchmark_Workflow_MixedProofTypes() public {
        vm.startPrank(user);
        
        // Privacy proof (Groth16)
        bool result1 = verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            GROTH16_PROOF,
            GROTH16_PUBLIC_INPUTS,
            GROTH16_VK
        );
        assertTrue(result1);
        
        // Identity proof (PLONK)
        bool result2 = verifier.verify(
            UniversalZKVerifier.ProofType.PLONK,
            PLONK_PROOF,
            PLONK_PUBLIC_INPUTS,
            PLONK_VK
        );
        assertTrue(result2);
        
        // Another privacy proof
        bool result3 = verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            GROTH16_PROOF,
            GROTH16_PUBLIC_INPUTS,
            GROTH16_VK
        );
        assertTrue(result3);
        
        vm.stopPrank();
    }
    
    // ============================================
    // BENCHMARK 5: Configuration Operations
    // ============================================
    
    /// @notice Benchmark: Set Stylus verifier
    function test_GasBenchmark_Config_SetStylusVerifier() public {
        MockStylusVerifier newStylus = new MockStylusVerifier(admin);
        
        vm.prank(admin);
        verifier.setStylusVerifier(address(newStylus));
        
        assertEq(verifier.stylusVerifier(), address(newStylus));
    }
    
    /// @notice Benchmark: Remove Stylus verifier
    function test_GasBenchmark_Config_RemoveStylusVerifier() public {
        vm.prank(admin);
        verifier.removeStylusVerifier();
        
        assertEq(verifier.stylusVerifier(), address(0));
    }
    
    /// @notice Benchmark: Pause and unpause contract
    function test_GasBenchmark_Config_PauseUnpause() public {
        vm.startPrank(admin);
        
        verifier.pause();
        assertTrue(verifier.paused());
        
        verifier.unpause();
        assertFalse(verifier.paused());
        
        vm.stopPrank();
    }
}
