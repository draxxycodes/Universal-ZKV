// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {UZKVProxy} from "../src/UZKVProxy.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title UZKVProxyTest
 * @notice Comprehensive test suite for UZKV Proxy contract
 * @dev Tests UUPS upgradeable pattern, access control, and Stylus delegation
 */
contract UZKVProxyTest is Test {
    
    UZKVProxy public proxy;
    UZKVProxy public proxyAsProxy;
    
    address public admin = address(0x1);
    address public upgrader = address(0x11);
    address public pauser = address(0x12);
    address public user = address(0x2);
    address public stylusImpl = address(0x3);
    address public newStylusImpl = address(0x4);
    address public newImplementation = address(0x5);
    
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    
    event ProxyInitialized(address indexed admin, address indexed implementation);
    event ImplementationUpdated(address indexed previousImplementation, address indexed newImplementation);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event ContractPaused(address indexed account);
    event ContractUnpaused(address indexed account);
    
    function setUp() public {
        // Deploy implementation
        proxy = new UZKVProxy();
        
        // Deploy proxy pointing to implementation
        bytes memory initData = abi.encodeWithSelector(
            UZKVProxy.initialize.selector,
            admin,
            upgrader,
            pauser,
            stylusImpl
        );
        
        ERC1967Proxy erc1967Proxy = new ERC1967Proxy(
            address(proxy),
            initData
        );
        
        // Cast proxy to UZKVProxy interface
        proxyAsProxy = UZKVProxy(payable(address(erc1967Proxy)));
    }
    
    // ============================================
    // INITIALIZATION TESTS
    // ============================================
    
    function test_Initialize_Success() public {
        // Verify admin roles were granted
        vm.startPrank(admin);
        assertTrue(proxyAsProxy.hasRole(DEFAULT_ADMIN_ROLE, admin));
        assertTrue(proxyAsProxy.hasRole(ADMIN_ROLE, admin));
        vm.stopPrank();
        
        // Verify upgrader role was granted
        assertTrue(proxyAsProxy.hasRole(UPGRADER_ROLE, upgrader));
        
        // Verify pauser role was granted
        assertTrue(proxyAsProxy.hasRole(PAUSER_ROLE, pauser));
        
        // Verify Stylus implementation was set
        assertEq(proxyAsProxy.getImplementation(), stylusImpl);
    }
    
    function test_Initialize_EmitsEvent() public {
        // Deploy new proxy to test events
        UZKVProxy newProxy = new UZKVProxy();
        
        bytes memory initData = abi.encodeWithSelector(
            UZKVProxy.initialize.selector,
            admin,
            upgrader,
            pauser,
            stylusImpl
        );
        
        vm.expectEmit(true, true, false, false);
        emit ProxyInitialized(admin, stylusImpl);
        
        new ERC1967Proxy(address(newProxy), initData);
    }
    
    function test_RevertWhen_InitializeWithZeroAddressAdmin() public {
        UZKVProxy newProxy = new UZKVProxy();
        
        bytes memory initData = abi.encodeWithSelector(
            UZKVProxy.initialize.selector,
            address(0),
            upgrader,
            pauser,
            stylusImpl
        );
        
        vm.expectRevert(UZKVProxy.ZeroAddress.selector);
        new ERC1967Proxy(address(newProxy), initData);
    }
    
    function test_RevertWhen_InitializeWithZeroAddressUpgrader() public {
        UZKVProxy newProxy = new UZKVProxy();
        
        bytes memory initData = abi.encodeWithSelector(
            UZKVProxy.initialize.selector,
            admin,
            address(0),
            pauser,
            stylusImpl
        );
        
        vm.expectRevert(UZKVProxy.ZeroAddress.selector);
        new ERC1967Proxy(address(newProxy), initData);
    }
    
    function test_RevertWhen_InitializeWithZeroAddressPauser() public {
        UZKVProxy newProxy = new UZKVProxy();
        
        bytes memory initData = abi.encodeWithSelector(
            UZKVProxy.initialize.selector,
            admin,
            upgrader,
            address(0),
            stylusImpl
        );
        
        vm.expectRevert(UZKVProxy.ZeroAddress.selector);
        new ERC1967Proxy(address(newProxy), initData);
    }
    
    function test_RevertWhen_InitializeWithZeroAddressImplementation() public {
        UZKVProxy newProxy = new UZKVProxy();
        
        bytes memory initData = abi.encodeWithSelector(
            UZKVProxy.initialize.selector,
            admin,
            upgrader,
            pauser,
            address(0)
        );
        
        vm.expectRevert(UZKVProxy.ZeroAddress.selector);
        new ERC1967Proxy(address(newProxy), initData);
    }
    
    function test_RevertWhen_InitializeTwice() public {
        vm.prank(admin);
        vm.expectRevert();
        proxyAsProxy.initialize(admin, upgrader, pauser, stylusImpl);
    }
    
    // ============================================
    // ACCESS CONTROL TESTS
    // ============================================
    
    function test_HasRole_Admin() public {
        vm.prank(admin);
        assertTrue(proxyAsProxy.hasRole(ADMIN_ROLE, admin));
    }
    
    function test_HasRole_Upgrader() public {
        assertTrue(proxyAsProxy.hasRole(UPGRADER_ROLE, upgrader));
    }
    
    function test_HasRole_Pauser() public {
        assertTrue(proxyAsProxy.hasRole(PAUSER_ROLE, pauser));
    }
    
    function test_HasRole_DefaultAdmin() public {
        vm.prank(admin);
        assertTrue(proxyAsProxy.hasRole(DEFAULT_ADMIN_ROLE, admin));
    }
    
    function test_GrantRole_AsAdmin() public {
        vm.prank(admin);
        proxyAsProxy.grantRole(UPGRADER_ROLE, user);
        
        assertTrue(proxyAsProxy.hasRole(UPGRADER_ROLE, user));
    }
    
    function test_RevertWhen_GrantRoleAsNonAdmin() public {
        vm.prank(user);
        vm.expectRevert();
        proxyAsProxy.grantRole(UPGRADER_ROLE, user);
    }
    
    function test_RevokeRole_AsAdmin() public {
        // First grant the role
        vm.prank(admin);
        proxyAsProxy.grantRole(UPGRADER_ROLE, user);
        
        // Then revoke it
        vm.prank(admin);
        proxyAsProxy.revokeRole(UPGRADER_ROLE, user);
        
        assertFalse(proxyAsProxy.hasRole(UPGRADER_ROLE, user));
    }
    
    // ============================================
    // PAUSABILITY TESTS
    // ============================================
    
    function test_Pause_AsPauser() public {
        vm.prank(pauser);
        vm.expectEmit(true, false, false, false);
        emit ContractPaused(pauser);
        
        proxyAsProxy.pause();
        
        assertTrue(proxyAsProxy.paused());
    }
    
    function test_Unpause_AsPauser() public {
        // First pause
        vm.prank(pauser);
        proxyAsProxy.pause();
        
        // Then unpause
        vm.prank(pauser);
        vm.expectEmit(true, false, false, false);
        emit ContractUnpaused(pauser);
        
        proxyAsProxy.unpause();
        
        assertFalse(proxyAsProxy.paused());
    }
    
    function test_RevertWhen_PauseAsNonPauser() public {
        vm.prank(user);
        vm.expectRevert();
        proxyAsProxy.pause();
    }
    
    function test_RevertWhen_UnpauseAsNonPauser() public {
        // First pause with pauser
        vm.prank(pauser);
        proxyAsProxy.pause();
        
        // Try to unpause as non-pauser
        vm.prank(user);
        vm.expectRevert();
        proxyAsProxy.unpause();
    }
    
    function test_RevertWhen_FallbackWhenPaused() public {
        // Deploy mock implementation
        MockStylusImpl mockImpl = new MockStylusImpl();
        
        // Set it as implementation
        vm.prank(admin);
        proxyAsProxy.setImplementation(address(mockImpl));
        
        // Pause the contract
        vm.prank(pauser);
        proxyAsProxy.pause();
        
        // Try to call through fallback - should revert with Pausable error
        vm.expectRevert();
        address(proxyAsProxy).call(abi.encodeWithSignature("testFunction()"));
    }
    
    // ============================================
    // IMPLEMENTATION MANAGEMENT TESTS
    // ============================================
    
    function test_SetImplementation_AsAdmin() public {
        vm.prank(admin);
        vm.expectEmit(true, true, false, false);
        emit ImplementationUpdated(stylusImpl, newStylusImpl);
        
        proxyAsProxy.setImplementation(newStylusImpl);
        
        assertEq(proxyAsProxy.getImplementation(), newStylusImpl);
    }
    
    function test_RevertWhen_SetImplementationAsNonAdmin() public {
        vm.prank(user);
        vm.expectRevert();
        proxyAsProxy.setImplementation(newStylusImpl);
    }
    
    function test_RevertWhen_SetImplementationZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(UZKVProxy.ZeroAddress.selector);
        proxyAsProxy.setImplementation(address(0));
    }
    
    function test_GetImplementation() public view {
        assertEq(proxyAsProxy.getImplementation(), stylusImpl);
    }
    
    // ============================================
    // UPGRADE TESTS
    // ============================================
    
    function test_UpgradeToNewImplementation_AsUpgrader() public {
        // Deploy new implementation
        UZKVProxy newImpl = new UZKVProxy();
        
        // Upgrade using the upgrader role
        vm.prank(upgrader);
        proxyAsProxy.upgradeToAndCall(address(newImpl), "");
        
        // Verify upgrade (state should be preserved)
        assertEq(proxyAsProxy.getImplementation(), stylusImpl); // Stylus impl unchanged
        assertTrue(proxyAsProxy.hasRole(ADMIN_ROLE, admin)); // Roles preserved
    }
    
    function test_RevertWhen_UpgradeAsNonUpgrader() public {
        UZKVProxy newImpl = new UZKVProxy();
        
        vm.prank(user);
        vm.expectRevert();
        proxyAsProxy.upgradeToAndCall(address(newImpl), "");
    }
    
    function test_RevertWhen_UpgradeToZeroAddress() public {
        vm.prank(upgrader);
        vm.expectRevert();
        proxyAsProxy.upgradeToAndCall(address(0), "");
    }
    
    // ============================================
    // FALLBACK TESTS
    // ============================================
    
    function test_Fallback_DelegatesToImplementation() public {
        // Deploy a mock contract that will act as Stylus implementation
        MockStylusImpl mockImpl = new MockStylusImpl();
        
        // Set it as the implementation
        vm.prank(admin);
        proxyAsProxy.setImplementation(address(mockImpl));
        
        // Call a function on the proxy (should delegate to mock)
        (bool success, bytes memory data) = address(proxyAsProxy).call(
            abi.encodeWithSignature("testFunction()")
        );
        
        assertTrue(success);
        assertEq(abi.decode(data, (uint256)), 42);
    }
    
    function test_RevertWhen_FallbackWithInvalidImplementation() public {
        // Deploy new proxy to avoid the setImplementation zero address check
        UZKVProxy newProxy = new UZKVProxy();
        bytes memory initData = abi.encodeWithSelector(
            UZKVProxy.initialize.selector,
            admin,
            upgrader,
            pauser,
            address(0xdead) // Valid address initially
        );
        ERC1967Proxy erc1967Proxy = new ERC1967Proxy(address(newProxy), initData);
        UZKVProxy testProxy = UZKVProxy(payable(address(erc1967Proxy)));
        
        // Manually set implementation to zero using storage slot manipulation
        // This simulates a corrupted state
        vm.store(
            address(testProxy),
            bytes32(uint256(keccak256("uzkv.proxy.implementation")) - 1),
            bytes32(0)
        );
        
        // Try to call fallback - should revert with InvalidImplementation
        vm.expectRevert(UZKVProxy.InvalidImplementation.selector);
        address(testProxy).call(abi.encodeWithSignature("testFunction()"));
    }
    
    function test_Fallback_PreservesMsgSender() public {
        MockStylusImpl mockImpl = new MockStylusImpl();
        
        vm.prank(admin);
        proxyAsProxy.setImplementation(address(mockImpl));
        
        // Call from user
        vm.prank(user);
        (bool success, bytes memory data) = address(proxyAsProxy).call(
            abi.encodeWithSignature("getMsgSender()")
        );
        
        assertTrue(success);
        assertEq(abi.decode(data, (address)), user);
    }
    
    function test_Fallback_PreservesMsgValue() public {
        MockStylusImpl mockImpl = new MockStylusImpl();
        
        vm.prank(admin);
        proxyAsProxy.setImplementation(address(mockImpl));
        
        // Call with value
        vm.deal(user, 1 ether);
        vm.prank(user);
        (bool success, bytes memory data) = address(proxyAsProxy).call{value: 0.5 ether}(
            abi.encodeWithSignature("getMsgValue()")
        );
        
        assertTrue(success);
        assertEq(abi.decode(data, (uint256)), 0.5 ether);
    }
    
    function test_Fallback_HandlesRevert() public {
        MockStylusImpl mockImpl = new MockStylusImpl();
        
        vm.prank(admin);
        proxyAsProxy.setImplementation(address(mockImpl));
        
        // Call function that reverts
        (bool success,) = address(proxyAsProxy).call(
            abi.encodeWithSignature("revertingFunction()")
        );
        
        assertFalse(success);
    }
    
    // ============================================
    // RECEIVE TESTS
    // ============================================
    
    function test_Receive_AcceptsETH() public {
        vm.deal(user, 1 ether);
        
        vm.prank(user);
        (bool success,) = address(proxyAsProxy).call{value: 0.5 ether}("");
        
        assertTrue(success);
        assertEq(address(proxyAsProxy).balance, 0.5 ether);
    }
    
    // ============================================
    // INTERFACE SUPPORT TESTS
    // ============================================
    
    function test_SupportsInterface_AccessControl() public view {
        // AccessControl interface ID
        bytes4 interfaceId = 0x7965db0b;
        assertTrue(proxyAsProxy.supportsInterface(interfaceId));
    }
    
    // ============================================
    // VERSION TESTS
    // ============================================
    
    function test_Version() public view {
        assertEq(proxyAsProxy.version(), "1.0.0");
    }
    
    // ============================================
    // INTEGRATION TESTS
    // ============================================
    
    function test_Integration_FullLifecycle() public {
        // 1. Verify initial state
        assertEq(proxyAsProxy.getImplementation(), stylusImpl);
        assertTrue(proxyAsProxy.hasRole(ADMIN_ROLE, admin));
        
        // 2. Grant upgrader role to new user
        vm.prank(admin);
        proxyAsProxy.grantRole(UPGRADER_ROLE, user);
        
        // 3. Update Stylus implementation
        vm.prank(admin);
        proxyAsProxy.setImplementation(newStylusImpl);
        assertEq(proxyAsProxy.getImplementation(), newStylusImpl);
        
        // 4. Upgrade proxy implementation using the upgrader
        UZKVProxy newImpl = new UZKVProxy();
        vm.prank(upgrader);
        proxyAsProxy.upgradeToAndCall(address(newImpl), "");
        
        // 5. Verify state preserved after upgrade
        assertEq(proxyAsProxy.getImplementation(), newStylusImpl);
        assertTrue(proxyAsProxy.hasRole(UPGRADER_ROLE, user));
    }
    
    function test_Integration_DelegationWithStateChange() public {
        // Deploy stateful mock
        StatefulMockImpl mockImpl = new StatefulMockImpl();
        
        vm.prank(admin);
        proxyAsProxy.setImplementation(address(mockImpl));
        
        // Call function that changes state
        (bool success,) = address(proxyAsProxy).call(
            abi.encodeWithSignature("setValue(uint256)", 123)
        );
        assertTrue(success);
        
        // Verify state changed in proxy's storage
        bytes memory data;
        (success, data) = address(proxyAsProxy).call(
            abi.encodeWithSignature("getValue()")
        );
        assertTrue(success);
        assertEq(abi.decode(data, (uint256)), 123);
    }
}

// ============================================
// MOCK CONTRACTS
// ============================================

/**
 * @notice Mock Stylus implementation for testing delegation
 */
contract MockStylusImpl {
    function testFunction() external pure returns (uint256) {
        return 42;
    }
    
    function getMsgSender() external view returns (address) {
        return msg.sender;
    }
    
    function getMsgValue() external payable returns (uint256) {
        return msg.value;
    }
    
    function revertingFunction() external pure {
        revert("Intentional revert");
    }
}

/**
 * @notice Mock implementation with state for testing storage context
 */
contract StatefulMockImpl {
    uint256 private value;
    
    function setValue(uint256 _value) external {
        value = _value;
    }
    
    function getValue() external view returns (uint256) {
        return value;
    }
}
