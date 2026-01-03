# Universal ZK Verifier - Deployment Guide

This guide details how to deploy and verify the Universal ZK Verifier (UZKV) Stylus contract on Arbitrum Sepolia.

## Prerequisites

1.  **Arbitrum Stylus Toolchain**: Ensure `cargo-stylus` is installed.
    ```bash
    cargo install --force cargo-stylus
    rustup target add wasm32-unknown-unknown
    ```
2.  **Environment Variables**: Create a `.env` file in the project root:
    ```bash
    PRIVATE_KEY=0x...          # Your deployment wallet private key
    ARB_SEPOLIA_RPC=...        # RPC URL (e.g., Alchemy, Infura)
    ARBISCAN_API_KEY=...       # (Optional) For source verification
    ```
3.  **Wallet Balance**: Ensure the deployment wallet has ETH on Arbitrum Sepolia.

## Deployment Steps

### 1. Run Deployment Script

We provide a streamlined script to build and deploy the Stylus contract directly.

```bash
./scripts/deploy-stylus.sh
```

This script will:
- Build the Rust project for WASM.
- Optimize the WASM binary.
- Deploy to Arbitrum Sepolia.
- Save the deployment address to `deployments/stylus-deployment.json`.

**Output Example:**
```
[2/3] Deploying to Arbitrum Sepolia...
...
Success! Deployed at: 0x123...abc
Saved to deployments/stylus-deployment.json
```

### 2. Verify Deployment (E2E Test)

Once deployed, you can run the end-to-end integration tests using the SDK to verify the contract is responsive.

```bash
# Load the deployment address
export DEPLOYED_ADDRESS=$(jq -r .contractAddress deployments/stylus-deployment.json)
export PRIVATE_KEY=0x... # Re-export if checking from clean shell

cd packages/sdk
npm test src/e2e.test.ts
```

If successful, you should see gas estimates and verification counts.

### 3. Verify Source on Arbiscan

To verify the contract source code on block explorers:

```bash
cd packages/stylus
cargo stylus verify \
  --address $DEPLOYED_ADDRESS \
  --endpoint $ARB_SEPOLIA_RPC
```

## Manual Deployment (Alternative)

If you prefer to run commands manually:

1.  **Build**:
    ```bash
    cd packages/stylus
    cargo build --release --target wasm32-unknown-unknown
    ```
2.  **Check**:
    ```bash
    cargo stylus check
    ```
3.  **Deploy**:
    ```bash
    cargo stylus deploy --private-key $PRIVATE_KEY --endpoint $ARB_SEPOLIA_RPC
    ```

## Troubleshooting

-   **"Gas estimation failed"**: Ensure you have enough ETH. Stylus activation requires a fee.
-   **"Contract too large"**: The current limit is ~24KB compressed. The current build is ~30.6KB uncompressed, which usually compresses well below the limit.
-   **"WASM validation error"**: Ensure you are using the correct nightly toolchain (`nightly-2025-01-01`).
