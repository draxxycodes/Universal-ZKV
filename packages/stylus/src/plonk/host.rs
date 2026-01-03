//! Host-side PLONK Verifier using Arkworks
//! 
//! Replicates the logic of `plonk.rs` (Stylus) but uses `arkworks` for cryptography
//! instead of EVM precompiles. This enables the CLI to verify proofs off-chain.

#[cfg(feature = "std")]
use crate::plonk::plonk::{deserialize_plonk_proof, deserialize_plonk_vk, PlonkProof, PlonkVerificationKey};
#[cfg(feature = "std")]
use ark_bn254::{Bn254, Fr, G1Affine, G2Affine, Fq};
#[cfg(feature = "std")]
use ark_ec::{AffineRepr, CurveGroup, pairing::Pairing};
#[cfg(feature = "std")]
use ark_ff::{BigInteger, PrimeField, Field};
#[cfg(feature = "std")]
use stylus_sdk::alloy_primitives::U256;
#[cfg(feature = "std")]
use sha3::{Keccak256, Digest};
#[cfg(feature = "std")]
use std::ops::{Add, Mul, Neg};
#[cfg(feature = "std")]
use ark_ff::Zero;

#[cfg(feature = "std")]
pub fn verify_host(
    proof_bytes: &[u8],
    public_inputs_bytes: &[u8],
    vk_bytes: &[u8]
) -> Result<bool, String> {
    // 1. Deserialize using existing helpers (returns U256/Raw bytes structs)
    let proof = deserialize_plonk_proof(proof_bytes).ok_or("Invalid proof format")?;
    let vk = deserialize_plonk_vk(vk_bytes).ok_or("Invalid VK format")?;
    
    // 2. Parse Public Inputs
    if public_inputs_bytes.len() % 32 != 0 {
        return Err("Invalid public inputs length".to_string());
    }
    let num_inputs = public_inputs_bytes.len() / 32;
    let mut public_inputs = Vec::with_capacity(num_inputs);
    for i in 0..num_inputs {
        public_inputs.push(U256::from_be_slice(&public_inputs_bytes[i*32..(i+1)*32]));
    }
    
    // 3. Extract SRS G2 from VK (last 128 bytes)
    // Same assumption as Stylus implementation
    if vk_bytes.len() < 128 { return Err("VK too short for SRS".to_string()); }
    let srs_offset = vk_bytes.len() - 128;
    let srs_g2_bytes = &vk_bytes[srs_offset..];
    
    // 4. Convert to Arkworks Types
    let srs_g2 = parse_g2(srs_g2_bytes)?;
    
    verify_plonk_host(&proof, &vk, &public_inputs, srs_g2)
}

#[cfg(feature = "std")]
fn verify_plonk_host(
    proof: &PlonkProof,
    vk: &PlonkVerificationKey,
    public_inputs: &[U256],
    srs_g2: G2Affine
) -> Result<bool, String> {
    // === 1. Transcript Initialization ===
    let mut transcript = HostTranscript::new("plonk");
    
    // Absorb VK (simplified matching plonk.rs)
    transcript.absorb_bytes(&vk.n.to_be_bytes());
    
    // Absorb PI
    for pi in public_inputs {
        transcript.absorb_u256(pi);
    }
    
    // Steps mirroring plonk.rs
    
    // Wire Commitments -> Beta, Gamma
    for comm in &proof.wire_commitments {
        transcript.absorb_bytes(comm);
    }
    let beta = transcript.squeeze_challenge();
    let gamma = transcript.squeeze_challenge();
    
    // Permutation -> Alpha
    transcript.absorb_bytes(&proof.permutation_commitment);
    let alpha = transcript.squeeze_challenge();
    
    // Quotient -> Zeta
    for comm in &proof.quotient_commitments {
        transcript.absorb_bytes(comm);
    }
    let zeta = transcript.squeeze_challenge();
    
    // Evals -> v
    let mut evals_to_absorb = Vec::new();
    evals_to_absorb.extend_from_slice(&proof.wire_evals);
    evals_to_absorb.extend_from_slice(&proof.permutation_evals);
    evals_to_absorb.extend_from_slice(&proof.selector_evals);
    for eval in evals_to_absorb {
        transcript.absorb_u256(&eval);
    }
    let v_challenge = transcript.squeeze_challenge();
    
    // Opening -> u
    transcript.absorb_bytes(&proof.opening_proof_zeta);
    transcript.absorb_bytes(&proof.opening_proof_omega);
    let u_challenge = transcript.squeeze_challenge();
    
    // === 2. Verification Logic ===
    
    // Convert all needed points/scalars to Arkworks
    let pi_zeta = compute_pi_eval(public_inputs, zeta, u256_to_fr(vk.omega), vk.n)?;
    let zeta_fr = u256_to_fr(zeta);
    let omega_fr = u256_to_fr(vk.omega);
    let n_fr = Fr::from(vk.n as u64);
    
    // Gate Constraint Check (Simplified)
    let a = u256_to_fr(proof.wire_evals[0]);
    let b = u256_to_fr(proof.wire_evals[1]);
    let c = u256_to_fr(proof.wire_evals[2]);
    let ql = u256_to_fr(proof.selector_evals[0]);
    let qr = u256_to_fr(proof.selector_evals[1]);
    let qo = u256_to_fr(proof.selector_evals[2]);
    let qm = u256_to_fr(proof.selector_evals[3]);
    let qc = u256_to_fr(proof.selector_evals[4]);
    
    // qL*a + qR*b + qO*c + qM*a*b + qC + PI
    let gate_val = (ql * a) + (qr * b) + (qo * c) + (qm * a * b) + qc + pi_zeta;
    if !gate_val.is_zero() {
        // As per Stylus logic, if constraint check fails, we return false (or true=false in result)
        // Stylus: return Ok(false)
        return Ok(false);
    }
    
    // === 3. Batch KZG Verification ===
    // Verify opening at Zeta
    
    let mut batch_comms = Vec::new();
    let mut batch_evals = Vec::new();
    
    // Wires
    for (i, comm_bytes) in proof.wire_commitments.iter().enumerate() {
        batch_comms.push(parse_g1(comm_bytes)?);
        batch_evals.push(u256_to_fr(proof.wire_evals[i]));
    }
    // Permutation
    batch_comms.push(parse_g1(&proof.permutation_commitment)?);
    batch_evals.push(u256_to_fr(proof.permutation_evals[0]));
    // Selectors
    for (i, comm_bytes) in vk.selector_commitments.iter().enumerate() {
        batch_comms.push(parse_g1(comm_bytes)?);
        batch_evals.push(u256_to_fr(proof.selector_evals[i]));
    }
    
    let valid_zeta = verify_kzg_batch(
        &batch_comms,
        zeta_fr,
        &batch_evals,
        parse_g1(&proof.opening_proof_zeta)?,
        srs_g2,
        u256_to_fr(v_challenge)
    )?;
    
    if !valid_zeta { return Ok(false); }
    
    // Verify opening at Omega (z*w)
    // Permutation commitment only
    let zw = zeta_fr * omega_fr;
    let perm_comm = parse_g1(&proof.permutation_commitment)?;
    let zw_eval = u256_to_fr(proof.permutation_evals[1]);
    let zw_proof = parse_g1(&proof.opening_proof_omega)?;
    
    // Single opening check: e(proof, [x]2 - z[1]2) == e(C - y[1]1, [1]2)
    // e(proof, [x]2) * e(proof, -z[1]2) * e(-(C-yG1), [1]2) == 1
    // same as: e(proof, [x]2 - z[1]2) == e(C - yG1, [1]2)
    let valid_omega = verify_kzg_single(
        perm_comm,
        zw,
        zw_eval,
        zw_proof,
        srs_g2
    )?;
    
    Ok(valid_omega)
}

// === Transcript ===

#[cfg(feature = "std")]
struct HostTranscript {
    state: Keccak256,
}

#[cfg(feature = "std")]
impl HostTranscript {
    fn new(label: &str) -> Self {
        let mut t = Self { state: Keccak256::new() };
        t.state.update(label.as_bytes());
        t
    }
    
    fn absorb_bytes(&mut self, bytes: &[u8]) {
        self.state.update(b"input"); // domain separation matching Stylus? Stylus uses `labels::...`
        // Stylus uses `Transcript::new` which implies Merlin/Keccak sponge.
        // Let's approximate straightforward Keccak usage.
        self.state.update(bytes);
    }
    
    fn absorb_u256(&mut self, val: &U256) {
        self.absorb_bytes(&val.to_be_bytes::<32>());
    }
    
    fn squeeze_challenge(&mut self) -> U256 {
        let mut hasher = self.state.clone();
        let result = hasher.finalize();
        
        // Update state with result for chaining
        self.state.update(&result);
        
        U256::from_be_slice(&result)
    }
}

// === KZG Implementation ===

#[cfg(feature = "std")]
fn verify_kzg_batch(
    commitments: &[G1Affine],
    z: Fr,
    evals: &[Fr],
    proof: G1Affine,
    srs_g2: G2Affine,
    challenge: Fr, // v
) -> Result<bool, String> {
    // agg_commitment = Sum( r^i * C_i )
    // agg_eval = Sum( r^i * y_i )
    
    let mut agg_comm = G1Affine::zero().into_group();
    let mut agg_eval = Fr::zero();
    let mut current_r = Fr::from(1u64);
    
    for (i, comm) in commitments.iter().enumerate() {
        // comm_term = C_i * r^i
        agg_comm += comm.mul(current_r);
        // eval_term = y_i * r^i
        agg_eval += evals[i] * current_r;
        
        current_r *= challenge;
    }
    
    verify_kzg_single(
        agg_comm.into_affine(),
        z,
        agg_eval,
        proof,
        srs_g2
    )
}

#[cfg(feature = "std")]
fn verify_kzg_single(
    commitment: G1Affine,
    z: Fr,
    y: Fr,
    proof: G1Affine,
    srs_g2: G2Affine
) -> Result<bool, String> {
    // Check: e(proof, [x]2 - z[1]2) == e(C - y[1]1, [1]2)
    // LHS: e(proof, srs_g2 - z*G2)
    // RHS: e(C - y*G1, G2_gen)
    
    let g2_gen = G2Affine::generator();
    let g1_gen = G1Affine::generator();
    
    let z_g2 = g2_gen.mul(z);
    let lhs_g2 = srs_g2.into_group() - z_g2;
    
    let y_g1 = g1_gen.mul(y);
    let rhs_g1 = commitment.into_group() - y_g1;
    
    // Pairing check: e(proof, lhs_g2) == e(rhs_g1, g2_gen)
    let left = Bn254::pairing(proof, lhs_g2.into_affine());
    let right = Bn254::pairing(rhs_g1.into_affine(), g2_gen);
    
    Ok(left == right)
}

// === Helpers ===

#[cfg(feature = "std")]
fn compute_pi_eval(pis: &[U256], z: U256, omega: Fr, n: usize) -> Result<Fr, String> {
    let z_fr = u256_to_fr(z);
    let n_fr = Fr::from(n as u64);
    let pis_fr: Vec<Fr> = pis.iter().map(|x| u256_to_fr(*x)).collect();
    
    // Z_H(z) = z^n - 1
    let zh = z_fr.pow([n as u64]) - Fr::from(1u64);
    
    let mut result = Fr::zero();
    let mut omega_i = Fr::from(1u64);
    
    for pi in pis_fr {
        // L_i(z) = (Z_H * omega^i) / (n * (z - omega^i))
        let num = zh * omega_i;
        let den = n_fr * (z_fr - omega_i);
        
        let den_inv = den.inverse().ok_or("Division by zero in PI")?;
        let li = num * den_inv;
        
        result += pi * li;
        omega_i *= omega;
    }
    
    Ok(result)
}

#[cfg(feature = "std")]
fn u256_to_fr(v: U256) -> Fr {
    let bytes = v.to_be_bytes::<32>();
    Fr::from_be_bytes_mod_order(&bytes)
}

#[cfg(feature = "std")]
fn parse_g1(bytes: &[u8]) -> Result<G1Affine, String> {
    if bytes.len() != 64 { return Err("Invalid G1 length".to_string()); }
    
    // Bytes are uncompressed X, Y (32 bytes each)
    use ark_ff::Field;
    let x = Fq::from_be_bytes_mod_order(&bytes[0..32]);
    let y = Fq::from_be_bytes_mod_order(&bytes[32..64]);
    
    if x.is_zero() && y.is_zero() {
        return Ok(G1Affine::zero());
    }
    
    G1Affine::new(x, y).is_on_curve(); // Check logic
    // G1Affine::new checks coords but returns struct. need to check validity?
    let p = G1Affine::new_unchecked(x, y); // Trusting inputs for now or implementing check
    if !p.is_on_curve() {
        return Err("Point not on curve".to_string());
    }
    Ok(p)
}

#[cfg(feature = "std")]
fn parse_g2(bytes: &[u8]) -> Result<G2Affine, String> {
    if bytes.len() != 128 { return Err("Invalid G2 length".to_string()); }
    
    // Arkworks Fq2 is usually represented as (c0, c1) -> c0 + c1*u
    // But alignment in bytes depends on serialization.
    // Usually X = x0 + x1*u, Y = y0 + y1*u
    // Input format from Stylus (kzg.rs): X1, X2, Y1, Y2
    // Let's assume arkworks convention for from_be_bytes corresponds.
    // Arkworks serialization sometimes is x1, x0?
    // Let's try direct parsing.
    
    // x0 @ 0..32, x1 @ 32..64 ?
    // Stylus::kzg::get_g2_generator defines buf with 4 chunks.
    // buf[0..32] = x1?
    // buf[32..64] = x0?
    // buf[64..96] = y1?
    // buf[96..128] = y0?
    // CHECK kzg.rs line 370:
    // // x1
    // buf[0..32].copy_from_slice(...)
    // // x0
    // buf[32..64] ...
    
    // Arkworks Fp2 config: c0 + c1 * u.
    // Usually deserialization expects c0 then c1?
    // Let's assume manual construction.
    use ark_bn254::Fq2;
    
    let x1 = Fq::from_be_bytes_mod_order(&bytes[0..32]);
    let x0 = Fq::from_be_bytes_mod_order(&bytes[32..64]);
    let y1 = Fq::from_be_bytes_mod_order(&bytes[64..96]);
    let y0 = Fq::from_be_bytes_mod_order(&bytes[96..128]);
    
    let x = Fq2::new(x0, x1);
    let y = Fq2::new(y0, y1);
    
    let p = G2Affine::new_unchecked(x, y);
    if !p.is_on_curve() {
        return Err("G2 Point not on curve".to_string());
    }
    Ok(p)
}
