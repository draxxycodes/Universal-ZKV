// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Script.sol";
import "../src/UniversalZKVerifier.sol";

/**
 * @title DeployTestnet
 * @notice Foundry script for deploying UZKV contracts to Arbitrum Sepolia
 * 
 * Usage:
 *   forge script script/DeployTestnet.s.sol:DeployTestnet \
 *     --rpc-url $ARB_SEPOLIA_RPC \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $ARBISCAN_API_KEY
 * 
 * Prerequisites:
 *   - PRIVATE_KEY with Sepolia ETH
 *   - ARB_SEPOLIA_RPC endpoint
 *   - ARBISCAN_API_KEY for verification (optional)
 */
contract DeployTestnet is Script {
    
    // Deployment configuration
    struct DeploymentConfig {
        address deployer;
        address admin;
        address upgrader;
        address pauser;
        address moduleManager;
        address stylusVerifier; // Set after Stylus deployment
    }
    
    // Deployment results
    struct DeploymentResult {
        address universalZKVerifier;
        uint256 totalGasUsed;
    }
    
    DeploymentConfig public config;
    DeploymentResult public result;
    
    function setUp() public {
        // Deployer is the account signing transactions
        config.deployer = vm.addr(vm.envUint("PRIVATE_KEY"));
        
        // For testnet, deployer has all roles
        config.admin = config.deployer;
        config.upgrader = config.deployer;
        config.pauser = config.deployer;
        config.moduleManager = config.deployer;
        
        // Stylus verifier address (set manually after Stylus deployment)
        // or read from deployment file
        config.stylusVerifier = vm.envOr("STYLUS_VERIFIER_ADDRESS", address(0));
    }
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        console.log("=== UZKV Testnet Deployment ===");
        console.log("Network: Arbitrum Sepolia");
        console.log("Deployer:", config.deployer);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy UniversalZKVerifier
        console.log("[1/1] Deploying UniversalZKVerifier...");
        UniversalZKVerifier verifier = new UniversalZKVerifier();
        verifier.initialize(
            config.admin,
            config.upgrader,
            config.pauser
        );
        result.universalZKVerifier = address(verifier);
        console.log("  UniversalZKVerifier:", result.universalZKVerifier);
        
        // Configure Stylus integration if address provided
        if (config.stylusVerifier != address(0)) {
            console.log("");
            console.log("Configuring Stylus integration...");
            verifier.setStylusVerifier(config.stylusVerifier);
            console.log("  Stylus verifier:", config.stylusVerifier);
        } else {
            console.log("");
            console.log("WARNING: Stylus verifier not configured");
            console.log("  Deploy Stylus WASM first, then call:");
            console.log("  verifier.setStylusVerifier(STYLUS_ADDRESS)");
        }
        
        vm.stopBroadcast();
        
        // Display deployment summary
        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("");
        console.log("Contracts deployed:");
        console.log("  UniversalZKVerifier:", result.universalZKVerifier);
        
        if (config.stylusVerifier != address(0)) {
            console.log("  StylusVerifier:     ", config.stylusVerifier);
        }
        
        console.log("");
        console.log("View on Arbiscan:");
        console.log("  https://sepolia.arbiscan.io/address/%s", result.universalZKVerifier);
        
        console.log("");
        console.log("Next steps:");
        console.log("  1. Verify contracts on Arbiscan");
        console.log("  2. Run gas benchmarking: node scripts/benchmark-gas.js");
        console.log("  3. Run integration tests against testnet");
        
        // Save deployment info to file
        saveDeploymentInfo();
    }
    
    function saveDeploymentInfo() internal {
        string memory json = "deployment";
        
        vm.serializeString(json, "network", "arbitrum-sepolia");
        vm.serializeAddress(json, "deployer", config.deployer);
        vm.serializeAddress(json, "universalZKVerifier", result.universalZKVerifier);
        
        if (config.stylusVerifier != address(0)) {
            vm.serializeAddress(json, "stylusVerifier", config.stylusVerifier);
        }
        
        string memory finalJson = vm.serializeString(json, "timestamp", vm.toString(block.timestamp));
        
        vm.writeJson(finalJson, "./deployments/sepolia-foundry-deployment.json");
        
        console.log("");
        console.log("Deployment info saved: ./deployments/sepolia-foundry-deployment.json");
    }
}
