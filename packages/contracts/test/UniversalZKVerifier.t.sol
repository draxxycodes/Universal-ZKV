// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {UniversalZKVerifier} from "../src/UniversalZKVerifier.sol";
import {MockStylusVerifier} from "../src/mocks/MockStylusVerifier.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title UniversalZKVerifierTest
 * @notice Comprehensive test suite for Universal ZK Verifier
 * @dev Tests multi-proof routing, module management, and access control
 */
contract UniversalZKVerifierTest is Test {
    
    UniversalZKVerifier public implementation;
    UniversalZKVerifier public verifier;
    MockStylusVerifier public stylusVerifier;
    
    address public admin = address(0x1);
    address public upgrader = address(0x11);
    address public pauser = address(0x12);
    address public moduleManager = address(0x13);
    address public user = address(0x2);
    
    address public groth16Module = address(0x100);
    address public plonkModule = address(0x200);
    address public starkModule = address(0x300);
    
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MODULE_MANAGER_ROLE = keccak256("MODULE_MANAGER_ROLE");
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    
    event VerifierModuleUpdated(
        UniversalZKVerifier.ProofType indexed proofType,
        address indexed previousModule,
        address indexed newModule
    );
    
    event ProofVerified(
        UniversalZKVerifier.ProofType indexed proofType,
        address indexed verifier,
        bool success
    );
    
    event UniversalVerifierInitialized(address indexed admin);
    
    event StylusVerifierUpdated(
        address indexed previousStylus,
        address indexed newStylus
    );
    
    function setUp() public {
        // Deploy implementation
        implementation = new UniversalZKVerifier();
        
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
        
        // Deploy mock Stylus verifier
        stylusVerifier = new MockStylusVerifier(admin);
    }
    
    // ============================================
    // INITIALIZATION TESTS
    // ============================================
    
    function test_Initialize_Success() public {
        // Verify admin roles
        assertTrue(verifier.hasRole(DEFAULT_ADMIN_ROLE, admin));
        assertTrue(verifier.hasRole(MODULE_MANAGER_ROLE, admin));
        
        // Verify upgrader role
        assertTrue(verifier.hasRole(UPGRADER_ROLE, upgrader));
        
        // Verify pauser role
        assertTrue(verifier.hasRole(PAUSER_ROLE, pauser));
    }
    
    function test_Initialize_EmitsEvent() public {
        UniversalZKVerifier newImpl = new UniversalZKVerifier();
        
        bytes memory initData = abi.encodeWithSelector(
            UniversalZKVerifier.initialize.selector,
            admin,
            upgrader,
            pauser
        );
        
        vm.expectEmit(true, false, false, false);
        emit UniversalVerifierInitialized(admin);
        
        new ERC1967Proxy(address(newImpl), initData);
    }
    
    function test_RevertWhen_InitializeWithZeroAddressAdmin() public {
        UniversalZKVerifier newImpl = new UniversalZKVerifier();
        
        bytes memory initData = abi.encodeWithSelector(
            UniversalZKVerifier.initialize.selector,
            address(0),
            upgrader,
            pauser
        );
        
        vm.expectRevert(UniversalZKVerifier.ZeroAddress.selector);
        new ERC1967Proxy(address(newImpl), initData);
    }
    
    function test_RevertWhen_InitializeWithZeroAddressUpgrader() public {
        UniversalZKVerifier newImpl = new UniversalZKVerifier();
        
        bytes memory initData = abi.encodeWithSelector(
            UniversalZKVerifier.initialize.selector,
            admin,
            address(0),
            pauser
        );
        
        vm.expectRevert(UniversalZKVerifier.ZeroAddress.selector);
        new ERC1967Proxy(address(newImpl), initData);
    }
    
    function test_RevertWhen_InitializeWithZeroAddressPauser() public {
        UniversalZKVerifier newImpl = new UniversalZKVerifier();
        
        bytes memory initData = abi.encodeWithSelector(
            UniversalZKVerifier.initialize.selector,
            admin,
            upgrader,
            address(0)
        );
        
        vm.expectRevert(UniversalZKVerifier.ZeroAddress.selector);
        new ERC1967Proxy(address(newImpl), initData);
    }
    
    function test_RevertWhen_InitializeTwice() public {
        vm.prank(admin);
        vm.expectRevert();
        verifier.initialize(admin, upgrader, pauser);
    }
    
    // ============================================
    // MODULE MANAGEMENT TESTS
    // ============================================
    
    function test_SetStylusVerifier() public {
        vm.prank(admin);
        vm.expectEmit(true, true, false, false);
        emit StylusVerifierUpdated(address(0), address(stylusVerifier));
        
        verifier.setStylusVerifier(address(stylusVerifier));
        
        assertEq(verifier.stylusVerifier(), address(stylusVerifier));
    }
    
    function test_RemoveStylusVerifier() public {
        vm.startPrank(admin);
        
        verifier.setStylusVerifier(address(stylusVerifier));
        
        vm.expectEmit(true, true, false, false);
        emit StylusVerifierUpdated(address(stylusVerifier), address(0));
        
        verifier.removeStylusVerifier();
        vm.stopPrank();
        
        assertEq(verifier.stylusVerifier(), address(0));
    }
    
    function test_RevertWhen_SetStylusVerifierAsNonManager() public {
        vm.prank(user);
        vm.expectRevert();
        verifier.setStylusVerifier(address(stylusVerifier));
    }
    
    function test_RevertWhen_SetStylusVerifierZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(UniversalZKVerifier.ZeroAddress.selector);
        verifier.setStylusVerifier(address(0));
    }
    
    function test_RevertWhen_RemoveNonexistentStylusVerifier() public {
        vm.prank(admin);
        vm.expectRevert(UniversalZKVerifier.ZeroAddress.selector);
        verifier.removeStylusVerifier();
    }
    
    function test_SetVerifierModule_Groth16() public {
        vm.prank(admin);
        vm.expectEmit(true, true, true, false);
        emit VerifierModuleUpdated(
            UniversalZKVerifier.ProofType.GROTH16,
            address(0),
            groth16Module
        );
        
        verifier.setVerifierModule(
            UniversalZKVerifier.ProofType.GROTH16,
            groth16Module
        );
        
        assertEq(
            verifier.getVerifierModule(UniversalZKVerifier.ProofType.GROTH16),
            groth16Module
        );
    }
    
    function test_SetVerifierModule_AllTypes() public {
        vm.startPrank(admin);
        
        // Set Groth16
        verifier.setVerifierModule(
            UniversalZKVerifier.ProofType.GROTH16,
            groth16Module
        );
        
        // Set PLONK
        verifier.setVerifierModule(
            UniversalZKVerifier.ProofType.PLONK,
            plonkModule
        );
        
        // Set STARK
        verifier.setVerifierModule(
            UniversalZKVerifier.ProofType.STARK,
            starkModule
        );
        
        vm.stopPrank();
        
        // Verify all modules
        assertEq(
            verifier.getVerifierModule(UniversalZKVerifier.ProofType.GROTH16),
            groth16Module
        );
        assertEq(
            verifier.getVerifierModule(UniversalZKVerifier.ProofType.PLONK),
            plonkModule
        );
        assertEq(
            verifier.getVerifierModule(UniversalZKVerifier.ProofType.STARK),
            starkModule
        );
    }
    
    function test_SetVerifierModule_UpdateExisting() public {
        address newModule = address(0x999);
        
        vm.startPrank(admin);
        
        // Set initial module
        verifier.setVerifierModule(
            UniversalZKVerifier.ProofType.GROTH16,
            groth16Module
        );
        
        // Update to new module
        vm.expectEmit(true, true, true, false);
        emit VerifierModuleUpdated(
            UniversalZKVerifier.ProofType.GROTH16,
            groth16Module,
            newModule
        );
        
        verifier.setVerifierModule(
            UniversalZKVerifier.ProofType.GROTH16,
            newModule
        );
        
        vm.stopPrank();
        
        assertEq(
            verifier.getVerifierModule(UniversalZKVerifier.ProofType.GROTH16),
            newModule
        );
    }
    
    function test_RevertWhen_SetVerifierModuleAsNonManager() public {
        vm.prank(user);
        vm.expectRevert();
        verifier.setVerifierModule(
            UniversalZKVerifier.ProofType.GROTH16,
            groth16Module
        );
    }
    
    function test_RevertWhen_SetVerifierModuleZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(UniversalZKVerifier.ZeroAddress.selector);
        verifier.setVerifierModule(
            UniversalZKVerifier.ProofType.GROTH16,
            address(0)
        );
    }
    
    function test_RemoveVerifierModule() public {
        vm.startPrank(admin);
        
        // First set a module
        verifier.setVerifierModule(
            UniversalZKVerifier.ProofType.GROTH16,
            groth16Module
        );
        
        // Then remove it
        vm.expectEmit(true, true, true, false);
        emit VerifierModuleUpdated(
            UniversalZKVerifier.ProofType.GROTH16,
            groth16Module,
            address(0)
        );
        
        verifier.removeVerifierModule(UniversalZKVerifier.ProofType.GROTH16);
        
        vm.stopPrank();
        
        assertEq(
            verifier.getVerifierModule(UniversalZKVerifier.ProofType.GROTH16),
            address(0)
        );
    }
    
    function test_RevertWhen_RemoveNonexistentModule() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                UniversalZKVerifier.ModuleNotRegistered.selector,
                UniversalZKVerifier.ProofType.GROTH16
            )
        );
        verifier.removeVerifierModule(UniversalZKVerifier.ProofType.GROTH16);
    }
    
    function test_IsModuleRegistered() public {
        // Initially not registered
        assertFalse(verifier.isModuleRegistered(UniversalZKVerifier.ProofType.GROTH16));
        
        // Register module
        vm.prank(admin);
        verifier.setVerifierModule(
            UniversalZKVerifier.ProofType.GROTH16,
            groth16Module
        );
        
        // Now registered
        assertTrue(verifier.isModuleRegistered(UniversalZKVerifier.ProofType.GROTH16));
    }
    
    // ============================================
    // VERIFICATION ROUTING TESTS
    // ============================================
    
    function test_Verify_WithStylusVerifier() public {
        // Configure Stylus verifier
        vm.prank(admin);
        verifier.setStylusVerifier(address(stylusVerifier));
        
        // Prepare test data
        bytes memory proof = hex"1234";
        bytes memory publicInputs = hex"5678";
        bytes memory vk = hex"90ab";
        
        // Register VK with Stylus
        bytes32 vkHash = stylusVerifier.registerVkTyped(0, vk);
        
        // Verify proof
        bool result = verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            proof,
            publicInputs,
            vk
        );
        
        assertTrue(result);
    }
    
    function test_Verify_StylusFallbackToSolidityModule() public {
        // Don't set Stylus verifier - should fallback to Solidity module
        MockVerifier mockVerifier = new MockVerifier(true);
        
        vm.prank(admin);
        verifier.setVerifierModule(
            UniversalZKVerifier.ProofType.GROTH16,
            address(mockVerifier)
        );
        
        bytes memory proof = hex"1234";
        bytes memory publicInputs = hex"5678";
        bytes memory vk = hex"90ab";
        
        bool result = verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            proof,
            publicInputs,
            vk
        );
        
        assertTrue(result);
    }
    
    function test_BatchVerify_WithStylus() public {
        vm.prank(admin);
        verifier.setStylusVerifier(address(stylusVerifier));
        
        bytes memory vk = hex"90ab";
        bytes32 vkHash = stylusVerifier.registerVkTyped(0, vk);
        
        // Create batch of proofs
        bytes[] memory proofs = new bytes[](3);
        bytes[] memory publicInputs = new bytes[](3);
        
        for (uint i = 0; i < 3; i++) {
            proofs[i] = abi.encodePacked("proof", i);
            publicInputs[i] = abi.encodePacked("input", i);
        }
        
        bool[] memory results = verifier.batchVerify(
            UniversalZKVerifier.ProofType.GROTH16,
            proofs,
            publicInputs,
            vk
        );
        
        assertEq(results.length, 3);
        for (uint i = 0; i < 3; i++) {
            assertTrue(results[i]);
        }
    }
    
    function test_RegisterVerificationKey() public {
        vm.prank(admin);
        verifier.setStylusVerifier(address(stylusVerifier));
        
        bytes memory vk = hex"90abcdef";
        
        bytes32 vkHash = verifier.registerVerificationKey(
            UniversalZKVerifier.ProofType.GROTH16,
            vk
        );
        
        assertTrue(stylusVerifier.isVkRegistered(vkHash));
        assertEq(vkHash, keccak256(vk));
    }
    
    function test_RevertWhen_BatchVerifyWithoutStylus() public {
        // Don't set Stylus - batch verify should fail
        bytes memory vk = hex"90ab";
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
            vk
        );
    }
    
    function test_Verify_Groth16Success() public {
        // Deploy mock verifier that returns true
        MockVerifier mockVerifier = new MockVerifier(true);
        
        // Register the mock
        vm.prank(admin);
        verifier.setVerifierModule(
            UniversalZKVerifier.ProofType.GROTH16,
            address(mockVerifier)
        );
        
        // Prepare test data
        bytes memory proof = hex"1234";
        bytes memory publicInputs = hex"5678";
        bytes memory vk = hex"90ab";
        
        // Expect event
        vm.expectEmit(true, true, false, true);
        emit ProofVerified(
            UniversalZKVerifier.ProofType.GROTH16,
            address(mockVerifier),
            true
        );
        
        // Verify
        bool result = verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            proof,
            publicInputs,
            vk
        );
        
        assertTrue(result);
    }
    
    function test_Verify_PlonkSuccess() public {
        MockVerifier mockVerifier = new MockVerifier(true);
        
        vm.prank(admin);
        verifier.setVerifierModule(
            UniversalZKVerifier.ProofType.PLONK,
            address(mockVerifier)
        );
        
        bytes memory proof = hex"1234";
        bytes memory publicInputs = hex"5678";
        bytes memory vk = hex"90ab";
        
        bool result = verifier.verify(
            UniversalZKVerifier.ProofType.PLONK,
            proof,
            publicInputs,
            vk
        );
        
        assertTrue(result);
    }
    
    function test_Verify_StarkSuccess() public {
        MockVerifier mockVerifier = new MockVerifier(true);
        
        vm.prank(admin);
        verifier.setVerifierModule(
            UniversalZKVerifier.ProofType.STARK,
            address(mockVerifier)
        );
        
        bytes memory proof = hex"1234";
        bytes memory publicInputs = hex"5678";
        bytes memory vk = hex"90ab";
        
        bool result = verifier.verify(
            UniversalZKVerifier.ProofType.STARK,
            proof,
            publicInputs,
            vk
        );
        
        assertTrue(result);
    }
    
    function test_Verify_FailedProof() public {
        // Deploy mock that returns false
        MockFailingVerifier mockVerifier = new MockFailingVerifier();
        
        vm.prank(admin);
        verifier.setVerifierModule(
            UniversalZKVerifier.ProofType.GROTH16,
            address(mockVerifier)
        );
        
        bytes memory proof = hex"1234";
        bytes memory publicInputs = hex"5678";
        bytes memory vk = hex"90ab";
        
        bool result = verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            proof,
            publicInputs,
            vk
        );
        
        assertFalse(result);
    }
    
    function test_RevertWhen_VerifyWithUnregisteredModule() public {
        bytes memory proof = hex"1234";
        bytes memory publicInputs = hex"5678";
        bytes memory vk = hex"90ab";
        
        vm.expectRevert(
            abi.encodeWithSelector(
                UniversalZKVerifier.UnsupportedProofType.selector,
                UniversalZKVerifier.ProofType.GROTH16
            )
        );
        
        verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            proof,
            publicInputs,
            vk
        );
    }
    
    function test_RevertWhen_VerifyWithRevertingModule() public {
        // Deploy mock that reverts
        MockRevertingVerifier mockVerifier = new MockRevertingVerifier();
        
        vm.prank(admin);
        verifier.setVerifierModule(
            UniversalZKVerifier.ProofType.GROTH16,
            address(mockVerifier)
        );
        
        bytes memory proof = hex"1234";
        bytes memory publicInputs = hex"5678";
        bytes memory vk = hex"90ab";
        
        vm.expectRevert(
            abi.encodeWithSelector(
                UniversalZKVerifier.VerificationFailed.selector,
                "Invalid proof"
            )
        );
        
        verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            proof,
            publicInputs,
            vk
        );
    }
    
    // ============================================
    // PAUSABILITY TESTS
    // ============================================
    
    function test_Pause() public {
        vm.prank(pauser);
        verifier.pause();
        
        assertTrue(verifier.paused());
    }
    
    function test_Unpause() public {
        vm.startPrank(pauser);
        verifier.pause();
        verifier.unpause();
        vm.stopPrank();
        
        assertFalse(verifier.paused());
    }
    
    function test_RevertWhen_PauseAsNonPauser() public {
        vm.prank(user);
        vm.expectRevert();
        verifier.pause();
    }
    
    function test_RevertWhen_VerifyWhenPaused() public {
        MockVerifier mockVerifier = new MockVerifier(true);
        
        vm.prank(admin);
        verifier.setVerifierModule(
            UniversalZKVerifier.ProofType.GROTH16,
            address(mockVerifier)
        );
        
        vm.prank(pauser);
        verifier.pause();
        
        bytes memory proof = hex"1234";
        bytes memory publicInputs = hex"5678";
        bytes memory vk = hex"90ab";
        
        vm.expectRevert();
        verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            proof,
            publicInputs,
            vk
        );
    }
    
    // ============================================
    // UPGRADE TESTS
    // ============================================
    
    function test_UpgradeToNewImplementation() public {
        UniversalZKVerifier newImpl = new UniversalZKVerifier();
        
        vm.prank(upgrader);
        verifier.upgradeToAndCall(address(newImpl), "");
        
        // Verify state preserved
        assertTrue(verifier.hasRole(DEFAULT_ADMIN_ROLE, admin));
    }
    
    function test_RevertWhen_UpgradeAsNonUpgrader() public {
        UniversalZKVerifier newImpl = new UniversalZKVerifier();
        
        vm.prank(user);
        vm.expectRevert();
        verifier.upgradeToAndCall(address(newImpl), "");
    }
    
    // ============================================
    // VIEW FUNCTION TESTS
    // ============================================
    
    function test_Version() public view {
        assertEq(verifier.version(), "2.0.0-stylus");
    }
    
    function test_SupportsInterface() public view {
        bytes4 accessControlInterface = 0x7965db0b;
        assertTrue(verifier.supportsInterface(accessControlInterface));
    }
    
    // ============================================
    // INTEGRATION TESTS
    // ============================================
    
    function test_Integration_MultiProofVerification() public {
        // Deploy mocks for all proof types
        MockVerifier groth16 = new MockVerifier(true);
        MockVerifier plonk = new MockVerifier(true);
        MockVerifier stark = new MockVerifier(true);
        
        // Register all modules
        vm.startPrank(admin);
        verifier.setVerifierModule(UniversalZKVerifier.ProofType.GROTH16, address(groth16));
        verifier.setVerifierModule(UniversalZKVerifier.ProofType.PLONK, address(plonk));
        verifier.setVerifierModule(UniversalZKVerifier.ProofType.STARK, address(stark));
        vm.stopPrank();
        
        // Test data
        bytes memory proof = hex"1234";
        bytes memory publicInputs = hex"5678";
        bytes memory vk = hex"90ab";
        
        // Verify all types
        assertTrue(verifier.verify(UniversalZKVerifier.ProofType.GROTH16, proof, publicInputs, vk));
        assertTrue(verifier.verify(UniversalZKVerifier.ProofType.PLONK, proof, publicInputs, vk));
        assertTrue(verifier.verify(UniversalZKVerifier.ProofType.STARK, proof, publicInputs, vk));
    }
}

// ============================================
// MOCK CONTRACTS
// ============================================

/**
 * @notice Mock verifier that always returns true
 * @dev Works with delegatecall by not relying on storage
 */
contract MockVerifier {
    constructor(bool) {
        // Constructor parameter ignored - we always return true
        // This is just to keep the interface compatible
    }
    
    function verify(
        bytes calldata,
        bytes calldata,
        bytes calldata
    ) external pure returns (bool) {
        return true;
    }
}

/**
 * @notice Mock verifier that always returns false
 */
contract MockFailingVerifier {
    function verify(
        bytes calldata,
        bytes calldata,
        bytes calldata
    ) external pure returns (bool) {
        return false;
    }
}

/**
 * @notice Mock verifier that always reverts
 */
contract MockRevertingVerifier {
    function verify(
        bytes calldata,
        bytes calldata,
        bytes calldata
    ) external pure returns (bool) {
        revert("Invalid proof");
    }
}
