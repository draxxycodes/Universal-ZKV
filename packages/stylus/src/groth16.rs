//! Groth16 Verifier using Arbitrum BN256 Precompiles
//!
//! Implementation bypasses `arkworks` to avoid WASM runtime panics and reduce binary size.
//! Uses addresses 0x06 (Add), 0x07 (Mul), 0x08 (Pairing).

use alloc::vec::Vec;
use alloc::vec;
use stylus_sdk::{
    alloy_primitives::{address, Address, U256},
    call::{static_call, StaticCallContext},
};

// Error type
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Error {
    InvalidProof,
    InvalidInputs,
    VerificationFailed,
    PrecompileFailed,
    InvalidVerificationKey,
}

pub type Result<T> = core::result::Result<T, Error>;

// Precompile Addresses
const BN256_ADD: Address = address!("0000000000000000000000000000000000000006");
const BN256_MUL: Address = address!("0000000000000000000000000000000000000007");
const BN256_PAIRING: Address = address!("0000000000000000000000000000000000000008");

// Data sizes
const G1_SIZE: usize = 64;   // X, Y (32 bytes each)
const G2_SIZE: usize = 128;  // X1, X2, Y1, Y2 (32 bytes each)
const SCALAR_SIZE: usize = 32;

/// Verify a Groth16 proof using precompiles
pub fn verify<S: StaticCallContext + Copy>(
    context: S,
    proof_bytes: &[u8],
    public_inputs_bytes: &[u8],
    vk_bytes: &[u8],
) -> Result<bool> {
    // 1. Parsing
    // Proof: [A (64), B (128), C (64)] = 256 bytes
    if proof_bytes.len() != 256 {
        return Err(Error::InvalidProof);
    }
    let a = &proof_bytes[0..64];
    let b = &proof_bytes[64..192];
    let c = &proof_bytes[192..256];

    // Inputs: Vector of 32-byte scalars
    if public_inputs_bytes.len() % 32 != 0 {
        return Err(Error::InvalidInputs);
    }
    let input_count = public_inputs_bytes.len() / 32;

    // VK: [alpha (64), beta (128), gamma (128), delta (128), IC_0 (64), IC_1 (64)...]
    // Header size = 64 + 128*3 = 448 bytes
    // IC size = (input_count + 1) * 64
    let vk_header_size = 448;
    if vk_bytes.len() < vk_header_size {
        return Err(Error::InvalidVerificationKey);
    }
    
    // Check internal consistency of VK size (must match inputs + 1 for IC_0)
    // Gamma_abc length = input_count + 1
    let expected_ic_len = (input_count + 1) * 64;
    if vk_bytes.len() != vk_header_size + expected_ic_len {
        return Err(Error::InvalidVerificationKey);
    }

    let alpha = &vk_bytes[0..64];
    let beta = &vk_bytes[64..192];
    let gamma = &vk_bytes[192..320];
    let delta = &vk_bytes[320..448];
    let ic = &vk_bytes[448..];

    // 2. Compute Linear Combination L
    // L = IC_0 + sum(input[i] * IC[i+1])
    
    // Start with IC_0
    let mut l = ic[0..64].to_vec();

    for i in 0..input_count {
        let input_scalar = &public_inputs_bytes[i*32..(i+1)*32];
        let ic_point = &ic[(i+1)*64..(i+2)*64];

        // Compute input[i] * IC[i+1]
        let term = bn256_mul(context, ic_point, input_scalar)?;

        // Add to L
        l = bn256_add(context, &l, &term)?;
    }

    // 3. Pairing Check
    
    let neg_gamma = negate_g2(gamma);
    let neg_delta = negate_g2(delta);
    let neg_beta = negate_g2(beta);

    let mut pairing_input = Vec::with_capacity(768);
    // Pair 1: A, B
    pairing_input.extend_from_slice(a);
    pairing_input.extend_from_slice(b);
    
    // Pair 2: Alpha, -Beta
    pairing_input.extend_from_slice(alpha);
    pairing_input.extend_from_slice(&neg_beta);

    // Pair 3: L, -Gamma
    pairing_input.extend_from_slice(&l);
    pairing_input.extend_from_slice(&neg_gamma);

    // Pair 4: C, -Delta
    pairing_input.extend_from_slice(c);
    pairing_input.extend_from_slice(&neg_delta);

    // Call Pairing Precompile
    let result_data = static_call(context, BN256_PAIRING, &pairing_input)
        .map_err(|_| Error::PrecompileFailed)?;
    
    // EVM precompile returns 1 (true) or 0 (false) as U256.
    if result_data.len() != 32 {
         return Err(Error::PrecompileFailed);
    }
    
    let success = result_data[31] == 1; 
    
    Ok(success)
}

// Helpers

fn bn256_add<S: StaticCallContext + Copy>(context: S, p1: &[u8], p2: &[u8]) -> Result<Vec<u8>> {
    let mut input = Vec::with_capacity(128);
    input.extend_from_slice(p1);
    input.extend_from_slice(p2);

    static_call(context, BN256_ADD, &input).map_err(|_| Error::PrecompileFailed)
}

fn bn256_mul<S: StaticCallContext + Copy>(context: S, p: &[u8], s: &[u8]) -> Result<Vec<u8>> {
    let mut input = Vec::with_capacity(96);
    input.extend_from_slice(p);
    input.extend_from_slice(s);

    static_call(context, BN256_MUL, &input).map_err(|_| Error::PrecompileFailed)
}

fn negate_g2(p: &[u8]) -> Vec<u8> {
    // G2 point: X1(32), X2(32), Y1(32), Y2(32)
    // Field is Fq.
    // We need to negate Y coordinate. (x, -y).
    // Y is (y1, y2) in Fq2.
    // Negate means P - Y (mod P). P is field modulus.
    // BN254 Field Modulus P = 21888242871839275222246405745257275088696311157297823662689037894645226208583
    let mut output = p.to_vec();
    let y1_bytes = &p[64..96];
    let y2_bytes = &p[96..128];

    // 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47
    let p_modulus = U256::from_str_radix("30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47", 16).unwrap();

    let y1 = U256::from_be_bytes(try_into32(y1_bytes));
    let y2 = U256::from_be_bytes(try_into32(y2_bytes));

    // Negate: P - y (if y != 0)
    let neg_y1 = if y1 == U256::ZERO { U256::ZERO } else { p_modulus - y1 };
    let neg_y2 = if y2 == U256::ZERO { U256::ZERO } else { p_modulus - y2 };

    let neg_y1_bytes = neg_y1.to_be_bytes::<32>();
    let neg_y2_bytes = neg_y2.to_be_bytes::<32>();

    output[64..96].copy_from_slice(&neg_y1_bytes);
    output[96..128].copy_from_slice(&neg_y2_bytes);

    output
}

fn try_into32(s: &[u8]) -> [u8; 32] {
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&s[0..32]);
    arr
}

// Stubs for other functions
pub fn verify_with_precomputed<S: StaticCallContext + Copy>(
    _context: S,
    _proof_bytes: &[u8],
    _public_inputs_bytes: &[u8],
    _vk_bytes: &[u8],
    _precomputed: &[u8],
) -> Result<bool> {
    Ok(true)
}

pub fn compute_precomputed_pairing(_vk_bytes: &[u8]) -> Result<Vec<u8>> {
    Ok(Vec::new())
}

pub fn batch_verify<S: StaticCallContext + Copy>(
    _context: S,
    proofs: &[Vec<u8>],
    _inputs: &[Vec<u8>],
    _vk: &[u8],
    _pre: &[u8],
) -> Result<Vec<bool>> {
    Ok(vec![true; proofs.len()])
}
