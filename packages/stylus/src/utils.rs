//! Utility functions for BN254 Scalar Field (Fr) Arithmetic
//!
//! EVM Precompiles handle G1/G2 Curve arithmetic (Base Field Fq), but PLONK requires
//! extensive Scalar Field (Fr) arithmetic for polynomial evaluations.
//!
//! This module implements Fr operations using U256 with the BN254 Scalar Modulus.

use stylus_sdk::alloy_primitives::U256;

/// BN254 Scalar Field Modulus (r)
/// r = 21888242871839275222246405745257275088548364400416034343698204186575808495617
/// Hex: 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
pub const BN254_SCALAR_MODULUS: U256 = U256::from_be_bytes([
    0x30, 0x64, 0x4e, 0x72, 0xe1, 0x31, 0xa0, 0x29,
    0xb8, 0x50, 0x45, 0xb6, 0x81, 0x81, 0x58, 0x5d,
    0x28, 0x33, 0xe8, 0x48, 0x79, 0xb9, 0x70, 0x91,
    0x43, 0xe1, 0xf5, 0x93, 0xf0, 0x00, 0x00, 0x01
]);

/// Modular Addition: (a + b) % r
pub fn fr_add(a: U256, b: U256) -> U256 {
    a.add_mod(b, BN254_SCALAR_MODULUS)
}

/// Modular Subtraction: (a - b) % r
/// Modular Subtraction: (a - b) % r
pub fn fr_sub(a: U256, b: U256) -> U256 {
    if a >= b {
        a - b
    } else {
        // a < b, so result is (a + P) - b
        let p_minus_b = BN254_SCALAR_MODULUS - b;
        a.add_mod(p_minus_b, BN254_SCALAR_MODULUS)
    }
}

/// Modular Multiplication: (a * b) % r
pub fn fr_mul(a: U256, b: U256) -> U256 {
    a.mul_mod(b, BN254_SCALAR_MODULUS)
}

/// Modular Exponentiation: (base ^ exp) % r
pub fn fr_pow(base: U256, exp: U256) -> U256 {
    // alloy_primitives U256 doesn't have a direct pow_mod? 
    // It has pow(), but that overflows.
    // We implement square-and-multiply.
    
    let mut result = U256::from(1);
    let mut base = base % BN254_SCALAR_MODULUS;
    let mut exp = exp;

    while exp > U256::ZERO {
        if (exp & U256::from(1)) == U256::from(1) {
            result = fr_mul(result, base);
        }
        base = fr_mul(base, base);
        exp >>= 1;
    }
    result
}

/// Modular Inverse: a^(-1) % r encoded as a^(r-2) % r (Fermat's Little Theorem)
pub fn fr_inv(a: U256) -> Option<U256> {
    if a == U256::ZERO {
        return None;
    }
    let r_minus_2 = BN254_SCALAR_MODULUS.saturating_sub(U256::from(2));
    Some(fr_pow(a, r_minus_2))
}

/// Convert byte slice to U256 (Big Endian) and reduce modulo r
pub fn fr_from_be_bytes_mod(bytes: &[u8]) -> U256 {
    // If bytes are 32 bytes or less, direct conversion
    let val = if bytes.len() <= 32 {
        U256::from_be_slice(bytes)
    } else {
        // If longer (e.g. from hash), take first 32 bytes or handle appropriately?
        // Specifically for Keccak output (32 bytes), direct conversion is fine.
        // But for safety, from_be_slice handles up to 32 bytes.
        // If > 32 bytes, we might truncate or need loop. 
        // Stylus/Alloy U256::from_be_slice panics if > 32 bytes? No, it takes whatever fits?
        // Safe bet: resize to 32.
        let mut buf = [0u8; 32];
        let len = bytes.len().min(32);
        // Copy last 'len' bytes if we want big endian, or first? 
        // Usually for hash-to-field, we interpret the hash bytes as a number.
        buf[32-len..].copy_from_slice(&bytes[..len]);
        U256::from_be_bytes(buf)
    };
    
    val % BN254_SCALAR_MODULUS
}
