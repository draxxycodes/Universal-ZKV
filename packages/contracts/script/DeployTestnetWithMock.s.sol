// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console2} from "forge-std/Script.sol";
import {UniversalZKVerifier} from "../src/UniversalZKVerifier.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployTestnetWithMock
 * @notice Deployment script for Arbitrum Sepolia testnet using mock Stylus verifier
 * @dev This script allows deployment without a real Stylus WASM contract
 */
contract DeployTestnetWithMock is Script {
    struct DeploymentConfig {
        address admin;
        address upgrader;
        address pauser;
        address mockStylusVerifier;
        bool useMock;
    }

    struct DeploymentResult {
        address implementation;
        address proxy;
        address stylusVerifier;
        uint256 deploymentBlock;
        uint256 gasUsed;
    }

    function run() external returns (DeploymentResult memory) {
        // Read configuration from environment
        DeploymentConfig memory config = DeploymentConfig({
            admin: vm.envOr("ADMIN_ADDRESS", msg.sender),
            upgrader: vm.envOr("UPGRADER_ADDRESS", msg.sender),
            pauser: vm.envOr("PAUSER_ADDRESS", msg.sender),
            mockStylusVerifier: vm.envOr(
                "MOCK_STYLUS_ADDRESS",
                address(0x0000000000000000000000000000000000000001)
            ),
            useMock: vm.envOr("USE_MOCK_STYLUS", true)
        });

        console2.log("=== UZKV Testnet Deployment (Mock Mode) ===");
        console2.log("Deployer:", msg.sender);
        console2.log("Admin:", config.admin);
        console2.log("Use Mock Stylus:", config.useMock);
        console2.log("");

        uint256 startGas = gasleft();
        vm.startBroadcast();

        // Deploy implementation
        console2.log("Deploying UniversalZKVerifier implementation...");
        UniversalZKVerifier implementation = new UniversalZKVerifier();
        console2.log("Implementation deployed at:", address(implementation));

        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            UniversalZKVerifier.initialize.selector,
            config.admin,
            config.upgrader,
            config.pauser,
            config.useMock ? config.mockStylusVerifier : address(0)
        );

        // Deploy proxy
        console2.log("Deploying ERC1967 Proxy...");
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        console2.log("Proxy deployed at:", address(proxy));

        // Wrap proxy as UniversalZKVerifier
        UniversalZKVerifier verifier = UniversalZKVerifier(address(proxy));

        // Verify initialization
        console2.log("");
        console2.log("=== Deployment Verification ===");
        console2.log("Stylus Verifier:", verifier.stylusVerifier());
        console2.log("Paused:", verifier.paused());
        console2.log("Has Admin Role:", verifier.hasRole(verifier.DEFAULT_ADMIN_ROLE(), config.admin));
        console2.log("Has Upgrader Role:", verifier.hasRole(verifier.UPGRADER_ROLE(), config.upgrader));
        console2.log("Has Pauser Role:", verifier.hasRole(verifier.PAUSER_ROLE(), config.pauser));

        uint256 gasUsed = startGas - gasleft();
        vm.stopBroadcast();

        // Save deployment info
        DeploymentResult memory result = DeploymentResult({
            implementation: address(implementation),
            proxy: address(proxy),
            stylusVerifier: config.useMock ? config.mockStylusVerifier : address(0),
            deploymentBlock: block.number,
            gasUsed: gasUsed
        });

        saveDeploymentInfo(result);
        printDeploymentSummary(result);

        return result;
    }

    function saveDeploymentInfo(DeploymentResult memory result) internal {
        string memory json = "deployment";
        
        vm.serializeAddress(json, "implementation", result.implementation);
        vm.serializeAddress(json, "proxy", result.proxy);
        vm.serializeAddress(json, "stylusVerifier", result.stylusVerifier);
        vm.serializeUint(json, "deploymentBlock", result.deploymentBlock);
        vm.serializeUint(json, "gasUsed", result.gasUsed);
        vm.serializeUint(json, "chainId", block.chainid);
        string memory output = vm.serializeUint(json, "timestamp", block.timestamp);

        string memory outputPath = string.concat(
            "deployments/sepolia-",
            vm.toString(block.timestamp),
            ".json"
        );
        
        vm.writeJson(output, outputPath);
        console2.log("");
        console2.log("Deployment info saved to:", outputPath);
    }

    function printDeploymentSummary(DeploymentResult memory result) internal view {
        console2.log("");
        console2.log("=== Deployment Summary ===");
        console2.log("Network: Arbitrum Sepolia (Chain ID:", block.chainid, ")");
        console2.log("Implementation:", result.implementation);
        console2.log("Proxy (Main Address):", result.proxy);
        console2.log("Stylus Verifier:", result.stylusVerifier);
        console2.log("Block Number:", result.deploymentBlock);
        console2.log("Gas Used:", result.gasUsed);
        console2.log("");
        console2.log("=== Next Steps ===");
        console2.log("1. Verify contracts on Arbiscan:");
        console2.log("   forge verify-contract", result.implementation, "UniversalZKVerifier --chain arbitrum-sepolia");
        console2.log("2. Export addresses to .env.sepolia:");
        console2.log("   UNIVERSAL_ZK_VERIFIER_PROXY=", result.proxy);
        console2.log("   UNIVERSAL_ZK_VERIFIER_IMPL=", result.implementation);
        console2.log("3. Test deployment:");
        console2.log("   cast call", result.proxy, "paused()(bool) --rpc-url $ARB_SEPOLIA_RPC");
        console2.log("");
    }
}
