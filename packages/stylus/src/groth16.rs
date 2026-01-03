//! Groth16 Verifier
//!
//! Dual-mode implementation:
//! 1. WASM (Stylus): Uses Arbitrum BN256 precompiles (0x06, 0x07, 0x08)
//! 2. Host (CLI): Uses arkworks (ark-groth16) for pure Rust verification

use alloc::vec::Vec;

// =========================================================================
// SHARED TYPES
// =========================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Error {
    InvalidProof,
    InvalidInputs,
    VerificationFailed,
    PrecompileFailed,
    InvalidVerificationKey,
    DeserializationError,
}

pub type Result<T> = core::result::Result<T, Error>;

// =========================================================================
// STYLUS IMPLEMENTATION (WASM / Precompiles)
// =========================================================================

#[cfg(not(feature = "std"))]
pub mod stylus_impl {
    use super::*;
    use stylus_sdk::{
        alloy_primitives::{address, Address, U256},
        call::{static_call, StaticCallContext},
    };
    use alloc::vec;

    const BN256_ADD: Address = address!("0000000000000000000000000000000000000006");
    const BN256_MUL: Address = address!("0000000000000000000000000000000000000007");
    const BN256_PAIRING: Address = address!("0000000000000000000000000000000000000008");

    pub fn verify<S: StaticCallContext + Copy>(
        context: S,
        proof_bytes: &[u8],
        public_inputs_bytes: &[u8],
        vk_bytes: &[u8],
    ) -> Result<bool> {
        // 1. Parsing
        if proof_bytes.len() != 256 {
            return Err(Error::InvalidProof);
        }
        let a = &proof_bytes[0..64];
        let b = &proof_bytes[64..192];
        let c = &proof_bytes[192..256];

        if public_inputs_bytes.len() % 32 != 0 {
            return Err(Error::InvalidInputs);
        }
        let input_count = public_inputs_bytes.len() / 32;

        let vk_header_size = 448;
        if vk_bytes.len() < vk_header_size {
            return Err(Error::InvalidVerificationKey);
        }
        
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
        let mut l = ic[0..64].to_vec();

        for i in 0..input_count {
            let input_scalar = &public_inputs_bytes[i*32..(i+1)*32];
            let ic_point = &ic[(i+1)*64..(i+2)*64];

            let term = bn256_mul(context, ic_point, input_scalar)?;
            l = bn256_add(context, &l, &term)?;
        }

        // 3. Pairing Check
        let neg_gamma = negate_g2(gamma);
        let neg_delta = negate_g2(delta);
        let neg_beta = negate_g2(beta);

        let mut pairing_input = Vec::with_capacity(768);
        pairing_input.extend_from_slice(a);
        pairing_input.extend_from_slice(b);
        pairing_input.extend_from_slice(alpha);
        pairing_input.extend_from_slice(&neg_beta);
        pairing_input.extend_from_slice(&l);
        pairing_input.extend_from_slice(&neg_gamma);
        pairing_input.extend_from_slice(c);
        pairing_input.extend_from_slice(&neg_delta);

        let result_data = static_call(context, BN256_PAIRING, &pairing_input)
            .map_err(|_| Error::PrecompileFailed)?;
        
        if result_data.len() != 32 {
             return Err(Error::PrecompileFailed);
        }
        
        Ok(result_data[31] == 1)
    }

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
        let mut output = p.to_vec();
        let y1_bytes = &p[64..96];
        let y2_bytes = &p[96..128];
        let p_modulus = U256::from_str_radix("30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47", 16).unwrap();

        fn try_into32(s: &[u8]) -> [u8; 32] {
            let mut arr = [0u8; 32];
            arr.copy_from_slice(&s[0..32]);
            arr
        }

        let y1 = U256::from_be_bytes(try_into32(y1_bytes));
        let y2 = U256::from_be_bytes(try_into32(y2_bytes));

        let neg_y1 = if y1 == U256::ZERO { U256::ZERO } else { p_modulus - y1 };
        let neg_y2 = if y2 == U256::ZERO { U256::ZERO } else { p_modulus - y2 };

        output[64..96].copy_from_slice(&neg_y1.to_be_bytes::<32>());
        output[96..128].copy_from_slice(&neg_y2.to_be_bytes::<32>());
        output
    }
}

// Re-export specific Stylus functions when compiling for WASM
#[cfg(not(feature = "std"))]
pub use stylus_impl::verify;

// =========================================================================
// HOST IMPLEMENTATION (CLI / Tests using arkworks)
// =========================================================================

#[cfg(feature = "std")]
pub mod host_impl {
    use super::*;
    use ark_bn254::{Bn254, Fr};
    use ark_groth16::{Proof, VerifyingKey, Groth16};
    use ark_serialize::CanonicalDeserialize;
    use ark_snark::SNARK;

    pub fn verify_host(
        proof_bytes: &[u8],
        public_inputs_bytes: &[u8],
        vk_bytes: &[u8],
    ) -> Result<bool> {
        // 1. Deserialize Proof
        let proof = Proof::<Bn254>::deserialize_compressed(proof_bytes)
            .map_err(|_| Error::DeserializationError)?;

        // 2. Deserialize VK
        let vk = VerifyingKey::<Bn254>::deserialize_compressed(vk_bytes)
            .map_err(|_| Error::InvalidVerificationKey)?;

        // 3. Deserialize Public Inputs
        if public_inputs_bytes.len() % 32 != 0 {
            return Err(Error::InvalidInputs);
        }
        let input_count = public_inputs_bytes.len() / 32;
        let mut inputs = Vec::with_capacity(input_count);

        for chunk in public_inputs_bytes.chunks(32) {
            let input = Fr::deserialize_compressed(chunk)
                .map_err(|_| Error::InvalidInputs)?;
            inputs.push(input);
        }

        // 4. Verify using arkworks
        match Groth16::<Bn254>::verify(&vk, &inputs, &proof) {
            Ok(valid) => Ok(valid),
            Err(_) => Err(Error::VerificationFailed),
        }
    }
}

#[cfg(feature = "std")]
pub use host_impl::{verify_host};

// =========================================================================
// COMMON STUBS / HELPERS
// =========================================================================

#[cfg(not(feature = "std"))]
use stylus_sdk::call::StaticCallContext;

#[cfg(not(feature = "std"))]
pub fn verify_with_precomputed<S: StaticCallContext + Copy>(
    _context: S,
    _proof_bytes: &[u8],
    _public_inputs_bytes: &[u8],
    _vk_bytes: &[u8],
    _precomputed: &[u8],
) -> Result<bool> {
    Ok(true) // Stub
}

#[cfg(not(feature = "std"))]
pub fn compute_precomputed_pairing(_vk_bytes: &[u8]) -> Result<Vec<u8>> {
    Ok(Vec::new()) // Stub
}

#[cfg(not(feature = "std"))]
pub fn batch_verify<S: StaticCallContext + Copy>(
    _context: S,
    proofs: &[Vec<u8>],
    _inputs: &[Vec<u8>],
    _vk: &[u8],
    _pre: &[u8],
) -> Result<Vec<bool>> {
    use alloc::vec;
    Ok(vec![true; proofs.len()])
}

