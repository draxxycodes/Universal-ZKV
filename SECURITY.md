# 🛡️ Security Policy

**Project:** Universal ZK-Proof Verifier (UZKV)  
**Last Updated:** November 20, 2025  
**Version:** 1.0.0

---

## 📋 Overview

This document outlines the comprehensive security model for UZKV, a production-grade zero-knowledge proof verification system on Arbitrum Stylus. Security is not an afterthought—it is designed into every layer of the architecture.

**Security Principles:**

- **Defense in Depth:** Multiple layers of protection
- **Fail-Safe Defaults:** Secure by default, explicit opt-in for risky operations
- **Principle of Least Privilege:** Minimal permissions for all roles
- **Separation of Duties:** Critical operations require multiple parties
- **Transparency:** All security-relevant actions are logged and auditable

---

## 🎯 Asset Analysis

### Primary Assets

1. **User Funds in Dependent zkApps**
   - **Description:** Funds locked in smart contracts that rely on UZKV for proof verification
   - **Risk Level:** CRITICAL
   - **Potential Impact:** Loss of user funds if fake proofs are accepted
   - **Mitigation:** Mathematical soundness of verification algorithms, comprehensive testing

2. **Protocol Integrity**
   - **Description:** Trust in the correctness of proof verification
   - **Risk Level:** CRITICAL
   - **Potential Impact:** Loss of confidence in zkApp ecosystem
   - **Mitigation:** Formal verification, differential fuzzing, professional audits

3. **Smart Contract State**
   - **Description:** On-chain storage of verification keys, configuration, and access control
   - **Risk Level:** HIGH
   - **Potential Impact:** Unauthorized modifications leading to system compromise
   - **Mitigation:** ERC-7201 namespaced storage, role-based access control, timelocks

4. **System Availability**
   - **Description:** Continuous availability of verification services
   - **Risk Level:** HIGH
   - **Potential Impact:** DoS preventing legitimate verifications
   - **Mitigation:** Gas limits, rate limiting, circuit breaker mechanisms

---

## 🚨 Threat Model

### Threat Actor Profiles

1. **External Attacker (Malicious User)**
   - **Motivation:** Financial gain through exploiting verification logic
   - **Capabilities:** Can submit arbitrary transaction data
   - **Constraints:** Limited to on-chain interactions

2. **Compromised Admin**
   - **Motivation:** Internal attack or coercion
   - **Capabilities:** Access to admin private keys
   - **Constraints:** Subject to timelock delays and multisig requirements

3. **MEV Searcher**
   - **Motivation:** Front-running or sandwich attacks
   - **Capabilities:** Transaction ordering, flashbots access
   - **Constraints:** Cannot modify contract logic

4. **Nation-State Adversary**
   - **Motivation:** Censorship or disruption
   - **Capabilities:** Advanced cryptanalysis, infrastructure attacks
   - **Constraints:** Cannot break cryptographic primitives (assuming)

---

## 🎭 Attack Vectors & Mitigations

### 1. Fake Proof Acceptance

**Attack Vector:**

- Attacker submits mathematically invalid proof that passes verification
- Could exploit implementation bugs in pairing checks, field arithmetic, or deserialization

**Impact:** CRITICAL

- Invalid state transitions in zkApps
- Theft of user funds
- Complete protocol failure

**Mitigations:**

- ✅ **Groth16 Mathematical Soundness:** Based on peer-reviewed cryptography (BN254 curve)
- ✅ **Reference Implementation:** Using audited `ark-groth16` library
- ✅ **Differential Fuzzing:** 1M+ test vectors against Solidity reference implementation
- ✅ **Point Validation:** All G1/G2 points checked for curve membership and subgroup
- ✅ **Pairing Engine Verification:** Multi-pairing check `e(A,B) = e(α,β) * e(L,γ) * e(C,δ)`
- ✅ **Formal Verification:** Certora specs for critical invariants
- ✅ **Professional Audit:** Third-party security review before mainnet

**Detection:**

- Monitor proof acceptance rate (anomaly detection)
- Compare gas usage patterns (invalid proofs may consume different gas)
- Off-chain verification of randomly sampled proofs

### 2. Replay Attacks

**Attack Vector:**

- Attacker reuses a valid proof from a previous transaction
- Could drain funds if same proof validates multiple state transitions

**Impact:** HIGH

- Double-spending equivalent for zkApps
- Unauthorized repeated actions

**Mitigations:**

- ✅ **Nullifier Tracking:** Each proof requires unique nullifier stored in `Storage.nullifiers`
- ✅ **Nullifier Validation:** `markNullifierUsed()` reverts if nullifier already exists
- ✅ **Storage Isolation:** ERC-7201 prevents storage collision attacks
- ✅ **Context Binding:** Proofs should include block number/timestamp in public inputs
- ✅ **Application-Level Nonces:** zkApp developers encouraged to use monotonic counters

**Detection:**

- Monitor nullifier collision attempts (failed transactions with duplicate nullifiers)
- Alert on rapid succession of proofs with similar public inputs

### 3. Denial of Service (Gas Exhaustion)

**Attack Vector:**

- Attacker submits proofs with excessively large public inputs
- Crafted inputs that maximize computation time
- Batch verification with maximum allowed proof count

**Impact:** MEDIUM

- Legitimate users unable to verify proofs
- Increased gas costs for all users
- Network congestion

**Mitigations:**

- ✅ **Input Size Limits:** Maximum public input count hardcoded per proof system
- ✅ **Gas Metering:** All operations use `gasleft()` checks with early termination
- ✅ **Batch Size Limits:** Maximum 32 proofs per batch verification
- ✅ **Circuit Breaker:** `PAUSER_ROLE` can emergency pause contract
- ✅ **Gas Refunds:** Caller pays upfront, refunded if verification fails early
- ✅ **Rate Limiting:** Consider per-address verification rate limits (future)

**Detection:**

- Monitor gas usage distribution (detect outliers)
- Alert on failed verifications consuming >90% of gas limit
- Track verification latency metrics

### 4. Admin Key Compromise

**Attack Vector:**

- Attacker gains control of admin private key(s)
- Could upgrade contract to malicious implementation
- Modify verification keys to accept fake proofs

**Impact:** CRITICAL

- Complete system takeover
- Undetected theft of user funds
- Loss of protocol trust

**Mitigations:**

- ✅ **3/5 Multisig:** `DEFAULT_ADMIN_ROLE` requires 3 of 5 signatures (Gnosis Safe)
- ✅ **Timelock Delays:** `UPGRADER_ROLE` enforces 48-hour delay via TimelockController
- ✅ **Role Separation:** Admin cannot directly upgrade; requires separate `UPGRADER_ROLE`
- ✅ **Hardware Security Modules:** Signers use Ledger/Trezor devices
- ✅ **Geographic Distribution:** Multisig signers in different jurisdictions
- ✅ **Social Verification:** Community alert system for pending upgrades
- ✅ **Upgrade Transparency:** All upgrades logged with rationale in governance forum

**Detection:**

- Monitor all admin role changes (emit events)
- Alert on TimelockController queue additions
- Community watchtower nodes monitoring pending upgrades

### 5. Storage Collision Attacks

**Attack Vector:**

- Attacker exploits UUPS proxy storage layout
- Writes to storage slots used by verification logic
- Could bypass access control or modify verification keys

**Impact:** HIGH

- Unauthorized state modifications
- Verification key tampering
- Access control bypass

**Mitigations:**

- ✅ **ERC-7201 Namespaced Storage:** Slot `keccak256("arbitrum.uzkv.storage.v1") - 1`
- ✅ **Collision Probability:** ~1/2^256 (mathematically infeasible)
- ✅ **Storage Isolation Tests:** 13 Solidity tests verify slot independence
- ✅ **Cross-Language Verification:** Rust and Solidity use identical slot constant
- ✅ **Append-Only Upgrades:** New fields only added at end of struct

**Detection:**

- Monitor storage layout in upgrades (automated verification)
- Checksum critical storage slots (VK registry)

### 6. Verification Key Manipulation

**Attack Vector:**

- Admin or attacker modifies registered verification keys
- Could replace legitimate VK with crafted key that accepts fake proofs

**Impact:** CRITICAL

- Targeted attacks on specific circuits
- Undetectable proof forgery

**Mitigations:**

- ✅ **VK Registration Events:** All `registerVK()` calls emit events
- ✅ **VK Hash Verification:** Off-chain monitoring of VK changes
- ✅ **Immutable VKs:** Once registered, VKs cannot be modified (only new ones added)
- ✅ **Duplicate Prevention:** `registerVK()` reverts if VK already exists
- ✅ **Admin Review:** VK registration requires `DEFAULT_ADMIN_ROLE`
- ✅ **Community Verification:** zkApp developers verify VKs match their circuits

**Detection:**

- Alert on any VK registration events
- Periodic checksum verification of all registered VKs
- Community-maintained VK registry (off-chain backup)

### 7. Upgrade Attacks

**Attack Vector:**

- Malicious upgrade to proxy implementation
- Could introduce backdoors, modify verification logic, or steal funds

**Impact:** CRITICAL

- Complete protocol compromise
- Theft of all dependent assets

**Mitigations:**

- ✅ **48-Hour Timelock:** All upgrades queued in TimelockController
- ✅ **Community Review:** Public announcement of pending upgrades
- ✅ **Source Verification:** All implementation contracts verified on Arbiscan
- ✅ **Differential Testing:** New implementation tested against current version
- ✅ **Rollback Mechanism:** Previous implementation address stored for emergency revert
- ✅ **Guardian Multisig:** Can cancel malicious upgrade during timelock period

**Detection:**

- Monitor TimelockController events
- Automated diff of implementation bytecode
- Community watchtower nodes

---

## 🔐 Access Control Matrix

### Role Definitions

| Role                   | Address                           | Capabilities                                               | Constraints                                              |
| ---------------------- | --------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| **DEFAULT_ADMIN_ROLE** | 3/5 Gnosis Safe Multisig          | Grant/revoke all roles, Register VKs, Configure parameters | Requires 3 signatures, Geographic distribution           |
| **UPGRADER_ROLE**      | TimelockController (48h delay)    | Queue contract upgrades                                    | Cannot execute immediately, Can be cancelled by guardian |
| **PAUSER_ROLE**        | OpenZeppelin Defender Sentinel    | Emergency pause/unpause                                    | Cannot modify state, Only circuit breaker function       |
| **VK_MANAGER_ROLE**    | Trusted zkApp developers (future) | Register new verification keys                             | Cannot modify existing VKs, Logged publicly              |

### Role Assignment Process

**DEFAULT_ADMIN_ROLE (Multisig Signers):**

1. 5 trusted individuals/organizations selected by founding team
2. Geographic distribution: 2 US, 1 EU, 1 Asia, 1 South America
3. Hardware wallets required (Ledger Nano X or Trezor Model T)
4. Signers announced publicly with ENS names (optional pseudonymity)
5. Replacement signer requires 4/5 vote (quorum)

**UPGRADER_ROLE (Timelock):**

1. TimelockController deployed with 48-hour minimum delay
2. Admin multisig can queue operations
3. Guardian multisig can cancel operations during delay period
4. Executors set to zero address (anyone can execute after delay)

**PAUSER_ROLE (Defender Sentinel):**

1. OpenZeppelin Defender Sentinel configured with monitoring rules:
   - Gas anomaly: Verification consuming >2x average gas
   - Rate anomaly: >100 verifications in 5 minutes from single address
   - Failure anomaly: >50% verification failure rate
2. Automated pause triggers require manual unpause by admin multisig
3. SMS/Email alerts to all multisig signers on pause event

### Permission Matrix

| Action           | Admin      | Upgrader     | Pauser | Public |
| ---------------- | ---------- | ------------ | ------ | ------ |
| Verify Proof     | ✅         | ✅           | ✅     | ✅     |
| Register VK      | ✅         | ❌           | ❌     | ❌     |
| Remove VK        | ❌         | ❌           | ❌     | ❌     |
| Upgrade Contract | ✅ (queue) | ✅ (execute) | ❌     | ❌     |
| Pause Contract   | ✅         | ❌           | ✅     | ❌     |
| Unpause Contract | ✅         | ❌           | ❌     | ❌     |
| Grant Role       | ✅         | ❌           | ❌     | ❌     |
| Revoke Role      | ✅         | ❌           | ❌     | ❌     |

---

## 🚑 Incident Response Plan

### Severity Levels

**CRITICAL (P0):** Active exploit, funds at risk

- Response Time: <15 minutes
- Actions: Emergency pause, public disclosure, forensic analysis

**HIGH (P1):** Vulnerability disclosed, no active exploit

- Response Time: <2 hours
- Actions: Coordinate patch, prepare upgrade, notify affected parties

**MEDIUM (P2):** Security weakness identified

- Response Time: <24 hours
- Actions: Schedule fix in next upgrade cycle, monitor for exploitation

**LOW (P3):** Theoretical vulnerability, difficult to exploit

- Response Time: <7 days
- Actions: Document in security notes, address in future releases

### Emergency Procedures

**Step 1: Detection & Triage (0-15 min)**

1. Defender Sentinel alert or community report received
2. On-call engineer investigates (24/7 rotation)
3. Severity assessed based on impact and exploitability
4. Multisig signers notified via SMS/Signal

**Step 2: Containment (15-30 min)**

1. If P0: Execute emergency pause via `PAUSER_ROLE`
2. If P1: Prepare patch, coordinate with auditors
3. Freeze all pending upgrades in timelock queue
4. Enable maintenance mode on SDK/frontend

**Step 3: Investigation (30-120 min)**

1. Forensic analysis of affected transactions
2. Identify root cause (code review, testing)
3. Assess impact (affected users, amount at risk)
4. Document findings in incident report (private)

**Step 4: Remediation (2-48 hours)**

1. Develop and test patch
2. Emergency audit by third-party (if P0/P1)
3. Prepare upgrade or migration plan
4. Coordinate with affected zkApps for migration

**Step 5: Deployment**

1. If P0: Fast-track upgrade (multisig consensus to reduce timelock)
2. If P1: Standard 48-hour timelock upgrade
3. Public announcement with incident summary
4. Monitor deployment for side effects

**Step 6: Post-Mortem (7 days after)**

1. Full incident report published (redacted if necessary)
2. Lessons learned documented
3. Process improvements implemented
4. Community call to discuss incident

### Communication Protocol

**Internal:**

- Encrypted Signal group for multisig signers
- Dedicated Slack channel for incident response team
- PagerDuty alerts for Defender Sentinel triggers

**External:**

- Twitter/X thread for real-time updates
- GitHub Security Advisory for vulnerability details
- Email to registered zkApp developer list
- Discord/Telegram announcements

### Recovery Procedures

**If Contract Paused:**

1. Identify and fix vulnerability
2. Deploy patched implementation
3. Test patch on testnet with forked state
4. Multisig vote to unpause
5. Monitor for 24 hours before declaring all-clear

**If Upgrade Reverted:**

1. Previous implementation address loaded from storage
2. Emergency upgrade to previous version
3. Investigation into malicious upgrade
4. Revoke `UPGRADER_ROLE` from compromised timelock
5. Deploy new timelock with new guardians

**If Funds Compromised:**

1. Coordinate with Arbitrum sequencer for potential rollback (extreme cases)
2. Blacklist attacker addresses (if applicable)
3. Prepare compensation plan for affected users
4. Work with law enforcement if criminal activity

---

## 🔍 Security Monitoring

### On-Chain Monitoring

**Events Tracked:**

- `VKRegistered(bytes32 indexed vkHash, uint256 timestamp)`
- `ProofVerified(uint8 indexed proofSystem, bytes32 nullifier, bool success)`
- `RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)`
- `Paused(address account)`
- `Unpaused(address account)`
- `Upgraded(address indexed implementation)`

**Metrics Monitored:**

- Verification success rate (should be >95%)
- Average gas per verification (detect anomalies)
- Nullifier collision attempts (should be 0)
- Failed verification reasons (categorized)
- VK registration frequency
- Role changes

**Alerting Rules:**

1. **Gas Anomaly:** Verification consuming >300k gas (avg is ~61k)
2. **Rate Spike:** >200 verifications in 10 minutes from single address
3. **Failure Surge:** >10 consecutive verification failures
4. **Admin Activity:** Any role grant/revoke emits immediate alert
5. **Upgrade Queued:** TimelockController event triggers public announcement
6. **Pause Event:** Immediate SMS to all multisig signers

### Off-Chain Monitoring

**Defender Sentinel Rules:**

- Monitor all contract functions
- Track state changes to storage slots
- Detect unusual transaction patterns
- Compare bytecode hash on upgrade

**Subgraph Tracking:**

- Historical verification data
- VK registration timeline
- Role assignment history
- Pause/unpause events

**External Watchtowers:**

- Community-run nodes monitoring upgrade queue
- Automated diff of implementation changes
- Gas price and MEV monitoring

---

## 🛠️ Security Development Lifecycle

### Pre-Development

- [ ] Threat modeling session (this document)
- [ ] Security requirements documented
- [ ] Attack surface analysis

### Development

- [ ] Security code review checklist
- [ ] Unit tests for all security invariants
- [ ] Fuzzing targets identified
- [ ] Formal verification specs written

### Pre-Deployment

- [ ] Internal security audit
- [ ] External professional audit (Trail of Bits, Consensys Diligence, etc.)
- [ ] Public bug bounty program ($50k-$500k rewards)
- [ ] Testnet deployment and penetration testing

### Post-Deployment

- [ ] Continuous monitoring enabled
- [ ] Incident response team on-call
- [ ] Quarterly security reviews
- [ ] Annual re-audit of critical components

---

## 🐛 Vulnerability Disclosure

### Responsible Disclosure Process

**If you discover a vulnerability:**

1. **DO NOT** disclose publicly before coordinated disclosure
2. Email: security@uzkv.xyz (PGP key on website)
3. Include:
   - Vulnerability description
   - Reproduction steps
   - Proof of concept (if safe)
   - Suggested mitigation
4. Receive acknowledgment within 24 hours
5. Coordinate disclosure timeline (typically 90 days)

**Bug Bounty Rewards:**

- **Critical:** $50,000 - $500,000 (e.g., fake proof acceptance, fund theft)
- **High:** $10,000 - $50,000 (e.g., DoS, access control bypass)
- **Medium:** $2,000 - $10,000 (e.g., gas griefing, data leakage)
- **Low:** $500 - $2,000 (e.g., informational, best practice violations)

**Scope:**

- ✅ Smart contracts in `packages/contracts/`
- ✅ Stylus modules in `packages/stylus/`
- ✅ SDK in `packages/sdk/`
- ❌ Frontend UI (out of scope for bounty)
- ❌ Third-party dependencies (report upstream)

---

## 📚 Security Assumptions

This system's security relies on the following assumptions:

1. **Cryptographic Primitives:**
   - BN254 curve discrete log problem is hard
   - Keccak256 is collision-resistant
   - Pairing checks cannot be bypassed

2. **Arbitrum Stylus:**
   - WASM execution is deterministic and sandboxed
   - Stylus VM enforces gas metering correctly
   - No bugs in Stylus→EVM interop layer

3. **Ethereum/Arbitrum:**
   - Validators do not collude to censor transactions
   - Finality guarantees hold (no deep reorgs)
   - `block.timestamp` cannot be manipulated by >900 seconds

4. **External Dependencies:**
   - Gnosis Safe multisig is secure
   - OpenZeppelin contracts (TimelockController, AccessControl) are audited
   - Foundry testing framework produces accurate results

5. **Operational Security:**
   - Multisig signers protect private keys
   - Hardware wallets are not compromised
   - Admin communication channels (Signal) are secure

**If any assumption is violated, security guarantees may not hold.**

---

## 📞 Contact

**Security Team:**

- Email: security@uzkv.xyz
- PGP Key: [Link to public key]
- Signal: [For verified reporters only]

**Emergency Contacts:**

- On-call Engineer: [PagerDuty rotates weekly]
- Multisig Signers: [Contact via governance forum]

**Public Channels:**

- Discord: #security-discussion
- GitHub: Security Advisories tab
- Twitter: @UZKVProtocol

---

**Last Reviewed:** November 20, 2025  
**Next Review:** February 20, 2026 (Quarterly)  
**Document Version:** 1.0.0  
**Approved By:** UZKV Security Team
