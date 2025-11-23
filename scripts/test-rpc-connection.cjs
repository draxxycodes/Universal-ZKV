#!/usr/bin/env node
/**
 * Test RPC Connectivity to Arbitrum Sepolia
 */

const { ethers } = require("ethers");

const RPC_ENDPOINTS = [
  "https://sepolia-rollup.arbitrum.io/rpc",
  "https://arbitrum-sepolia.publicnode.com",
  "https://arbitrum-sepolia.blockpi.network/v1/rpc/public",
  "https://public.stackup.sh/api/v1/node/arbitrum-sepolia",
];

console.log("=== Testing Arbitrum Sepolia RPC Endpoints ===\n");

async function testEndpoint(url) {
  console.log(`🔍 Testing: ${url}`);
  
  try {
    const network = ethers.Network.from({
      chainId: 421614,
      name: "arbitrum-sepolia",
    });
    
    const provider = new ethers.JsonRpcProvider(url, network, {
      staticNetwork: network,
    });

    // Test with timeout
    const blockNumber = await Promise.race([
      provider.getBlockNumber(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout after 10s")), 10000)
      ),
    ]);

    const gasPrice = await provider.getFeeData();

    console.log(`   ✅ Connected successfully`);
    console.log(`   📦 Block: ${blockNumber}`);
    console.log(`   ⛽ Gas Price: ${ethers.formatUnits(gasPrice.gasPrice, "gwei")} gwei`);
    console.log("");
    
    return true;
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    console.log("");
    return false;
  }
}

async function main() {
  let workingEndpoints = 0;
  
  for (const endpoint of RPC_ENDPOINTS) {
    const works = await testEndpoint(endpoint);
    if (works) workingEndpoints++;
  }

  console.log("─".repeat(50));
  console.log(`\n✅ Working endpoints: ${workingEndpoints}/${RPC_ENDPOINTS.length}`);
  
  if (workingEndpoints === 0) {
    console.log("\n⚠️  No RPC endpoints are accessible!");
    console.log("\nPossible issues:");
    console.log("  1. Network/firewall blocking connections");
    console.log("  2. WSL network configuration issues");
    console.log("  3. Need to use Alchemy/Infura with API key");
    console.log("\n💡 Solutions:");
    console.log("  • Check your internet connection");
    console.log("  • Try from Windows PowerShell instead of WSL");
    console.log("  • Get a free API key from https://alchemy.com or https://infura.io");
    process.exit(1);
  }
}

main().catch(console.error);
