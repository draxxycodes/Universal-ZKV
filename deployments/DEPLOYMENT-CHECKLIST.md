# Phase S5: Testnet Deployment Checklist

**Target Network:** Arbitrum Sepolia  
**Chain ID:** 421614  
**Expected Duration:** 1-2 hours  
**Prerequisites:** Phases S0-S4 complete ✅

---

## Pre-Deployment Checklist

### Environment Setup

- [ ] `.env.sepolia` configured with private key
- [ ] `.env.sepolia` configured with RPC endpoint
- [ ] Arbiscan API key added (optional, for verification)
- [ ] All environment variables validated

### Account Preparation

- [ ] Deployer address determined
- [ ] Deployer has testnet ETH (≥0.1 ETH recommended)
- [ ] Testnet ETH obtained from faucet
- [ ] Balance verified via cast/etherscan

### Toolchain Verification

- [ ] Rust 1.75+ installed
- [ ] cargo-stylus CLI installed
- [ ] Foundry (forge, cast) installed
- [ ] Node.js 20+ with pnpm installed
- [ ] All tools in PATH and working

### Code Readiness

- [ ] All 148 tests passing locally
- [ ] WASM build successful (<24KB)
- [ ] Solidity compilation successful
- [ ] No compilation warnings (critical)
- [ ] Git working tree clean
- [ ] Latest code pushed to GitHub

### Documentation

- [ ] Deployment guide reviewed
- [ ] Gas benchmarking report ready
- [ ] Execution plan updated
- [ ] Community announcement drafted

---

## Deployment Execution Checklist

### Task S5.1: Deploy Stylus WASM

- [ ] Navigate to `packages/stylus`
- [ ] Run `cargo stylus deploy`
- [ ] Deployment successful (check logs)
- [ ] Stylus address saved
- [ ] Stylus address added to `.env.sepolia`
- [ ] Bytecode verified on Arbiscan
- [ ] Transaction hash documented

**Stylus Address:** `_______________________________________________`  
**Transaction:** `_______________________________________________`  
**Gas Used:** `_______________`

### Task S5.2: Deploy UniversalZKVerifier

#### Option A: Foundry Script

- [ ] Set `STYLUS_VERIFIER_ADDRESS` environment variable
- [ ] Run `forge script script/DeployTestnet.s.sol`
- [ ] Review deployment plan
- [ ] Execute with `--broadcast` flag
- [ ] Deployment successful
- [ ] All addresses saved

#### Option B: Bash Script

- [ ] Run `./scripts/deploy-testnet.sh`
- [ ] Script completes successfully
- [ ] All addresses documented
- [ ] Deployment JSON generated

**UniversalZKVerifier:** `_______________________________________________`  
**Proxy Address:** `_______________________________________________`  
**Transaction:** `_______________________________________________`  
**Gas Used:** `_______________`

### Task S5.3: Configure Integration

- [ ] Stylus verifier configured in UniversalZKVerifier
- [ ] Call `setStylusVerifier(address)`
- [ ] Configuration transaction successful
- [ ] Call `stylusVerifier()` to verify
- [ ] Returns correct Stylus address

**Configuration Transaction:** `_______________________________________________`

### Task S5.4: Verify Contracts

#### Stylus Contract

- [ ] Visible on Arbiscan
- [ ] WASM bytecode displayed
- [ ] Contract info correct
- [ ] No verification errors

**Arbiscan Link:** `https://sepolia.arbiscan.io/address/_________________`

#### UniversalZKVerifier

- [ ] Auto-verification successful (if using --verify flag)
- [ ] Or manual verification completed
- [ ] Source code visible on Arbiscan
- [ ] Source matches local code
- [ ] Compiler settings correct
- [ ] Read/Write contract tab functional

**Arbiscan Link:** `https://sepolia.arbiscan.io/address/_________________`

---

## Validation Checklist

### Functional Tests

#### View Functions

- [ ] `stylusVerifier()` returns correct address
- [ ] `paused()` returns false
- [ ] Can query roles (admin, upgrader, etc.)

#### Write Functions (as admin)

- [ ] Can register VK (test with dummy data)
- [ ] VK registration successful
- [ ] VK hash generated correctly

#### Verification Tests

- [ ] Can call `verify()` with test data
- [ ] Stylus integration working
- [ ] Batch verification callable
- [ ] All proof types supported

### Gas Benchmarking

- [ ] Run `node scripts/benchmark-gas.js`
- [ ] Single verification gas measured
- [ ] Batch verification gas measured
- [ ] VK registration gas measured
- [ ] Results match local tests (±10%)
- [ ] Gas report generated

**Gas Results:**

- Single Groth16: `_______________` gas (local: 87,043)
- Batch 10: `_______________` gas (local: 169,466)
- Batch 50: `_______________` gas (local: 528,248)
- VK Registration: `_______________` gas (local: 74,258)

**Deviation:** `_____`% (should be <10%)

### Integration Tests

- [ ] Can interact via Ethers.js/Viem
- [ ] Can interact via cast CLI
- [ ] Can interact via Arbiscan UI
- [ ] Events emitted correctly
- [ ] Error handling works (test with invalid data)

---

## Post-Deployment Checklist

### Documentation

- [ ] Create `deployments/SEPOLIA-DEPLOYMENT.md`
- [ ] Add deployment addresses
- [ ] Add Arbiscan links
- [ ] Add deployment timestamp
- [ ] Add deployer address
- [ ] Document gas costs
- [ ] Save deployment JSON

### Version Control

- [ ] Commit deployment documentation
- [ ] Tag release: `v0.2.0-testnet`
- [ ] Push to GitHub
- [ ] Create GitHub release
- [ ] Add release notes
- [ ] Attach gas benchmarking report

### Community Engagement

- [ ] Post deployment announcement
- [ ] Share Arbiscan links
- [ ] Share gas benchmarks
- [ ] Invite community testing
- [ ] Create testing guide
- [ ] Monitor for feedback

### Monitoring Setup

- [ ] Add contracts to monitoring dashboard
- [ ] Set up gas price alerts
- [ ] Monitor verification counts
- [ ] Track contract interactions
- [ ] Log any errors/issues

---

## Rollback Plan

### If Deployment Fails

**Stylus Deployment Failure:**

1. Check error logs
2. Verify WASM size <128KB
3. Verify sufficient gas/funds
4. Check RPC connectivity
5. Try alternative RPC endpoint
6. Contact Arbitrum support if needed

**Solidity Deployment Failure:**

1. Check Foundry error output
2. Verify contract compilation
3. Check constructor arguments
4. Verify sufficient gas
5. Test on local fork first
6. Deploy contracts individually

**Verification Failure:**

1. Wait 2-5 minutes for indexing
2. Retry verification
3. Check compiler version matches
4. Verify optimization settings
5. Use manual verification on Arbiscan

### Emergency Procedures

**If Critical Bug Found:**

1. ❌ Do NOT pause contracts immediately (testnet)
2. ✅ Document the bug
3. ✅ Create GitHub issue
4. ✅ Notify community
5. ✅ Prepare fix
6. ✅ Redeploy if necessary

**If Gas Costs Excessive:**

1. Analyze transaction data
2. Compare with local tests
3. Check for network congestion
4. Verify Stylus integration
5. Profile slow operations
6. Optimize and redeploy if needed

---

## Success Criteria

Phase S5 is complete when **ALL** of the following are true:

### Deployment Success

- ✅ Stylus WASM deployed to Arbitrum Sepolia
- ✅ UniversalZKVerifier deployed to Arbitrum Sepolia
- ✅ Proxy deployed and initialized
- ✅ Stylus integration configured
- ✅ All deployment transactions confirmed

### Verification Success

- ✅ All contracts verified on Arbiscan
- ✅ Source code visible and matches
- ✅ Contract interfaces accessible
- ✅ Read/Write functions working

### Functional Success

- ✅ View functions callable
- ✅ Write functions callable (with auth)
- ✅ VK registration working
- ✅ Proof verification working
- ✅ Batch verification working
- ✅ All proof types supported

### Performance Success

- ✅ Live gas costs match local tests (±10%)
- ✅ Single verification ≤ 100k gas
- ✅ Batch efficiency ≥ 80%
- ✅ No performance regressions

### Documentation Success

- ✅ All addresses documented
- ✅ Deployment guide updated
- ✅ Gas report generated
- ✅ GitHub release created
- ✅ Community announcement posted

---

## Deployment Timeline

| Task                  | Estimated Time | Status |
| --------------------- | -------------- | ------ |
| Pre-deployment setup  | 15 mins        | ⏳     |
| Build WASM            | 5 mins         | ⏳     |
| Deploy Stylus         | 10 mins        | ⏳     |
| Deploy Solidity       | 10 mins        | ⏳     |
| Configure integration | 5 mins         | ⏳     |
| Verify contracts      | 10 mins        | ⏳     |
| Run gas benchmarks    | 15 mins        | ⏳     |
| Documentation         | 20 mins        | ⏳     |
| Community post        | 10 mins        | ⏳     |
| **Total**             | **~100 mins**  | ⏳     |

---

## Notes & Observations

**Deployment Date:** `_______________`  
**Deployer:** `_______________`  
**Network Conditions:** `_______________`  
**Gas Price:** `_______________ gwei`

**Issues Encountered:**

```
(Document any issues, errors, or unexpected behavior here)





```

**Resolutions:**

```
(Document how issues were resolved)





```

**Lessons Learned:**

```
(Document insights for future deployments)





```

---

## Sign-Off

**Deployment Completed By:** `_______________`  
**Date:** `_______________`  
**Signature:** `_______________`

**Verification Completed By:** `_______________`  
**Date:** `_______________`  
**Signature:** `_______________`

**Phase S5 Status:** [ ] Complete [ ] Incomplete

---

**Next Phase:** S6 - Security Audit Preparation
