//! Universal Proof Protocol Types
//!
//! This module defines the canonical binary format for all proofs submitted to UZKV.
//! These types form the frozen protocol interface between clients, SDK, Solidity proxy,
//! and the Stylus verifier core.
//!
//! # Design Principles
//! - **Version-stable**: Breaking changes require new version numbers
//! - **Borsh encoding**: Deterministic, efficient, well-tested serialization
//! - **Type safety**: Strong enums prevent invalid proof type routing
//! - **Audit-ready**: Clear structure with explicit field sizes
//!
//! # Protocol Versioning
//! - Version 1: Initial release (Groth16, PLONK, STARK)
//! - Future versions: Will support recursive proofs, aggregation, etc.

extern crate alloc;

use alloc::vec::Vec;

/// Proof system identifier
///
/// Each variant corresponds to a different zero-knowledge proof construction
/// with distinct performance and security characteristics.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum ProofType {
    /// Groth16 zkSNARK
    /// - Trusted setup required (circuit-specific)
    /// - Smallest proof size (~128 bytes)
    /// - Fastest verification (~280k gas)
    /// - Battle-tested (10+ years in production)
    Groth16 = 0,

    /// PLONK universal SNARK
    /// - Universal trusted setup (one-time ceremony)
    /// - Moderate proof size (~800 bytes)
    /// - Fast verification (~400k gas)
    /// - More flexible circuit updates
    PLONK = 1,

    /// STARK (Scalable Transparent ARgument of Knowledge)
    /// - Transparent setup (no trusted ceremony)
    /// - Larger proof size (~40-100 KB)
    /// - Slower verification (~540k gas)
    /// - Post-quantum secure (hash-based)
    STARK = 2,
}

impl ProofType {
    /// Convert raw u8 to ProofType enum
    ///
    /// # Returns
    /// Returns `Some(ProofType)` for valid values (0-2), `None` otherwise.
    /// This prevents routing to non-existent verifiers.
    ///
    /// # Examples
    /// ```
    /// use uzkv_stylus::types::ProofType;
    /// assert_eq!(ProofType::from_u8(0), Some(ProofType::Groth16));
    /// assert_eq!(ProofType::from_u8(99), None);
    /// ```
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(ProofType::Groth16),
            1 => Some(ProofType::PLONK),
            2 => Some(ProofType::STARK),
            _ => None,
        }
    }

    /// Convert ProofType to u8 for encoding
    ///
    /// # Examples
    /// ```
    /// use uzkv_stylus::types::ProofType;
    /// assert_eq!(ProofType::Groth16.to_u8(), 0);
    /// assert_eq!(ProofType::PLONK.to_u8(), 1);
    /// assert_eq!(ProofType::STARK.to_u8(), 2);
    /// ```
    pub fn to_u8(self) -> u8 {
        self as u8
    }
}

/// Public statement shared across all proof systems
///
/// This struct defines the semantic meaning of public inputs for UZKV.
/// All circuits (Poseidon, EdDSA, Merkle) MUST encode their public inputs
/// according to this layout for semantic consistency.
///
/// # Fields Explanation
/// - `merkle_root`: Root hash of state tree (balances, identities, commitments)
/// - `public_key`: EdDSA public key of the prover (identity binding)
/// - `nullifier`: Unique value preventing double-spending/replay attacks
/// - `value`: Scalar value (amount, index, timestamp, etc.)
/// - `extra`: Application-specific extension bytes (optional metadata)
///
/// # Security Notes
/// - The nullifier MUST be derived from secret inputs to ensure uniqueness
/// - The public_key should be verified against an EdDSA signature in the circuit
/// - The merkle_root must match the current on-chain state root
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PublicStatement {
    /// Root of the Merkle tree representing application state
    /// Size: 32 bytes (Poseidon hash output or SHA256)
    pub merkle_root: [u8; 32],

    /// EdDSA public key of the prover
    /// Size: 32 bytes (compressed Edwards curve point)
    pub public_key: [u8; 32],

    /// Anti-replay nullifier (derived from private inputs)
    /// Size: 32 bytes (Poseidon hash output)
    pub nullifier: [u8; 32],

    /// Scalar value (application-specific: amount, ID, etc.)
    /// Size: 16 bytes (u128 encoded as little-endian)
    pub value: u128,

    /// Application-specific extension data
    /// Examples: extra constraints, metadata, auxiliary commitments
    pub extra: Vec<u8>,
}

impl PublicStatement {
    /// Create a new PublicStatement with empty extra data
    pub fn new(
        merkle_root: [u8; 32],
        public_key: [u8; 32],
        nullifier: [u8; 32],
        value: u128,
    ) -> Self {
        Self {
            merkle_root,
            public_key,
            nullifier,
            value,
            extra: Vec::new(),
        }
    }

    /// Create a PublicStatement with application-specific extra data
    pub fn with_extra(
        merkle_root: [u8; 32],
        public_key: [u8; 32],
        nullifier: [u8; 32],
        value: u128,
        extra: Vec<u8>,
    ) -> Self {
        Self {
            merkle_root,
            public_key,
            nullifier,
            value,
            extra,
        }
    }

    /// Encode the public statement to bytes using borsh
    ///
    /// # Binary Layout (borsh encoding)
    /// ```text
    /// [merkle_root: 32 bytes]
    /// [public_key: 32 bytes]
    /// [nullifier: 32 bytes]
    /// [value: 16 bytes (u128 little-endian)]
    /// [extra_len: 4 bytes (u32 little-endian)]
    /// [extra: extra_len bytes]
    /// ```
    pub fn encode(&self) -> Vec<u8> {
        let mut buf = Vec::with_capacity(116 + self.extra.len());
        
        // Fixed-size fields (96 bytes)
        buf.extend_from_slice(&self.merkle_root);
        buf.extend_from_slice(&self.public_key);
        buf.extend_from_slice(&self.nullifier);
        
        // u128 value (16 bytes, little-endian)
        buf.extend_from_slice(&self.value.to_le_bytes());
        
        // Vec<u8> extra (4 byte length + data)
        let extra_len = self.extra.len() as u32;
        buf.extend_from_slice(&extra_len.to_le_bytes());
        buf.extend_from_slice(&self.extra);
        
        buf
    }

    /// Decode a PublicStatement from borsh-encoded bytes
    ///
    /// # Errors
    /// Returns `None` if:
    /// - Buffer is too short (< 116 bytes minimum)
    /// - Extra length field is inconsistent with buffer size
    pub fn decode(bytes: &[u8]) -> Option<Self> {
        if bytes.len() < 116 {
            return None; // Minimum size: 32+32+32+16+4 = 116
        }

        let mut offset = 0;

        // Parse merkle_root (32 bytes)
        let merkle_root: [u8; 32] = bytes[offset..offset + 32].try_into().ok()?;
        offset += 32;

        // Parse public_key (32 bytes)
        let public_key: [u8; 32] = bytes[offset..offset + 32].try_into().ok()?;
        offset += 32;

        // Parse nullifier (32 bytes)
        let nullifier: [u8; 32] = bytes[offset..offset + 32].try_into().ok()?;
        offset += 32;

        // Parse value (16 bytes as u128 little-endian)
        let value_bytes: [u8; 16] = bytes[offset..offset + 16].try_into().ok()?;
        let value = u128::from_le_bytes(value_bytes);
        offset += 16;

        // Parse extra length (4 bytes as u32 little-endian)
        let extra_len_bytes: [u8; 4] = bytes[offset..offset + 4].try_into().ok()?;
        let extra_len = u32::from_le_bytes(extra_len_bytes) as usize;
        offset += 4;

        // Parse extra data
        if bytes.len() < offset + extra_len {
            return None; // Buffer too short for declared extra length
        }
        let extra = bytes[offset..offset + extra_len].to_vec();

        Some(Self {
            merkle_root,
            public_key,
            nullifier,
            value,
            extra,
        })
    }

    /// Get the total encoded size in bytes
    pub fn encoded_size(&self) -> usize {
        116 + self.extra.len() // 32+32+32+16+4 + extra
    }
}

/// Universal proof envelope
///
/// This is the top-level structure that wraps all proofs submitted to UZKV.
/// Every proof, regardless of type (Groth16/PLONK/STARK), MUST be encoded
/// in this format before being submitted on-chain.
///
/// # Binary Protocol
/// The `encode()` method produces a deterministic byte stream that can be
/// verified across different implementations (Rust, TypeScript, Python, etc.).
///
/// # Security Invariants
/// - `vk_hash` MUST match the stored verification key for (proof_type, program_id)
/// - `program_id` binds the proof to a specific circuit/program
/// - `version` allows protocol upgrades while maintaining backward compatibility
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UniversalProof {
    /// Protocol version (currently 1)
    /// Future versions may support recursion, aggregation, etc.
    pub version: u8,

    /// Which proof system was used to generate this proof
    pub proof_type: ProofType,

    /// Program/circuit identifier
    /// Allows multiple circuits per proof type (e.g., Poseidon, EdDSA, Merkle)
    /// Range: 0-4294967295 (u32)
    pub program_id: u32,

    /// Hash of the verification key
    /// MUST match the on-chain registered VK for (proof_type, program_id)
    /// Size: 32 bytes (keccak256 or sha256 of VK bytes)
    pub vk_hash: [u8; 32],

    /// The actual proof bytes (system-specific encoding)
    /// - Groth16: ~128 bytes (2 G1 points + 1 G2 point)
    /// - PLONK: ~800 bytes (commitments + evaluations + opening proof)
    /// - STARK: ~40-100 KB (FRI proof + trace commitments)
    pub proof_bytes: Vec<u8>,

    /// Encoded public statement (borsh-encoded PublicStatement)
    /// This is what the proof is attesting to
    pub public_inputs_bytes: Vec<u8>,
}

impl UniversalProof {
    /// Create a new UniversalProof (current version: 1)
    pub fn new(
        proof_type: ProofType,
        program_id: u32,
        vk_hash: [u8; 32],
        proof_bytes: Vec<u8>,
        public_inputs_bytes: Vec<u8>,
    ) -> Self {
        Self {
            version: 1,
            proof_type,
            program_id,
            vk_hash,
            proof_bytes,
            public_inputs_bytes,
        }
    }

    /// Encode the universal proof to bytes using borsh-like encoding
    ///
    /// # Binary Layout
    /// ```text
    /// [version: 1 byte]
    /// [proof_type: 1 byte]
    /// [program_id: 4 bytes (u32 little-endian)]
    /// [vk_hash: 32 bytes]
    /// [proof_len: 4 bytes (u32 little-endian)]
    /// [proof_bytes: proof_len bytes]
    /// [public_inputs_len: 4 bytes (u32 little-endian)]
    /// [public_inputs_bytes: public_inputs_len bytes]
    /// ```
    ///
    /// Total: 46 + proof_len + public_inputs_len bytes
    pub fn encode(&self) -> Vec<u8> {
        let mut buf = Vec::with_capacity(
            46 + self.proof_bytes.len() + self.public_inputs_bytes.len()
        );

        // Fixed header (38 bytes)
        buf.push(self.version);
        buf.push(self.proof_type.to_u8());
        buf.extend_from_slice(&self.program_id.to_le_bytes());
        buf.extend_from_slice(&self.vk_hash);

        // Proof bytes (4 byte length + data)
        let proof_len = self.proof_bytes.len() as u32;
        buf.extend_from_slice(&proof_len.to_le_bytes());
        buf.extend_from_slice(&self.proof_bytes);

        // Public inputs bytes (4 byte length + data)
        let public_inputs_len = self.public_inputs_bytes.len() as u32;
        buf.extend_from_slice(&public_inputs_len.to_le_bytes());
        buf.extend_from_slice(&self.public_inputs_bytes);

        buf
    }

    /// Decode a UniversalProof from bytes
    ///
    /// # Errors
    /// Returns `None` if:
    /// - Buffer is too short (< 46 bytes minimum)
    /// - Version is not supported (currently only version 1)
    /// - Proof type is invalid
    /// - Length fields are inconsistent with buffer size
    pub fn decode(bytes: &[u8]) -> Option<Self> {
        if bytes.len() < 46 {
            return None; // Minimum size: 1+1+4+32+4+4 = 46
        }

        let mut offset = 0;

        // Parse version
        let version = bytes[offset];
        offset += 1;
        if version != 1 {
            return None; // Unsupported version
        }

        // Parse proof_type
        let proof_type = ProofType::from_u8(bytes[offset])?;
        offset += 1;

        // Parse program_id (4 bytes as u32 little-endian)
        let program_id_bytes: [u8; 4] = bytes[offset..offset + 4].try_into().ok()?;
        let program_id = u32::from_le_bytes(program_id_bytes);
        offset += 4;

        // Parse vk_hash (32 bytes)
        let vk_hash: [u8; 32] = bytes[offset..offset + 32].try_into().ok()?;
        offset += 32;

        // Parse proof_bytes length and data
        let proof_len_bytes: [u8; 4] = bytes[offset..offset + 4].try_into().ok()?;
        let proof_len = u32::from_le_bytes(proof_len_bytes) as usize;
        offset += 4;

        if bytes.len() < offset + proof_len {
            return None; // Buffer too short for proof
        }
        let proof_bytes = bytes[offset..offset + proof_len].to_vec();
        offset += proof_len;

        // Parse public_inputs_bytes length and data
        if bytes.len() < offset + 4 {
            return None; // Not enough bytes for public_inputs length
        }
        let public_inputs_len_bytes: [u8; 4] = bytes[offset..offset + 4].try_into().ok()?;
        let public_inputs_len = u32::from_le_bytes(public_inputs_len_bytes) as usize;
        offset += 4;

        if bytes.len() < offset + public_inputs_len {
            return None; // Buffer too short for public inputs
        }
        let public_inputs_bytes = bytes[offset..offset + public_inputs_len].to_vec();

        Some(Self {
            version,
            proof_type,
            program_id,
            vk_hash,
            proof_bytes,
            public_inputs_bytes,
        })
    }

    /// Get the total encoded size in bytes
    pub fn encoded_size(&self) -> usize {
        46 + self.proof_bytes.len() + self.public_inputs_bytes.len()
    }

    /// Decode the public statement from the public_inputs_bytes field
    ///
    /// This is a convenience method that calls `PublicStatement::decode()`
    /// on the embedded public inputs.
    pub fn decode_public_statement(&self) -> Option<PublicStatement> {
        PublicStatement::decode(&self.public_inputs_bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_proof_type_roundtrip() {
        assert_eq!(ProofType::from_u8(0), Some(ProofType::Groth16));
        assert_eq!(ProofType::from_u8(1), Some(ProofType::PLONK));
        assert_eq!(ProofType::from_u8(2), Some(ProofType::STARK));
        assert_eq!(ProofType::from_u8(3), None);
        assert_eq!(ProofType::from_u8(255), None);
    }

    #[test]
    fn test_public_statement_encode_decode() {
        let statement = PublicStatement::new(
            [1u8; 32],
            [2u8; 32],
            [3u8; 32],
            12345u128,
        );

        let encoded = statement.encode();
        let decoded = PublicStatement::decode(&encoded).unwrap();

        assert_eq!(statement, decoded);
    }

    #[test]
    fn test_public_statement_with_extra() {
        let statement = PublicStatement::with_extra(
            [1u8; 32],
            [2u8; 32],
            [3u8; 32],
            12345u128,
            vec![0xDE, 0xAD, 0xBE, 0xEF],
        );

        let encoded = statement.encode();
        assert_eq!(encoded.len(), 120); // 116 + 4 extra bytes

        let decoded = PublicStatement::decode(&encoded).unwrap();
        assert_eq!(statement, decoded);
        assert_eq!(decoded.extra, vec![0xDE, 0xAD, 0xBE, 0xEF]);
    }

    #[test]
    fn test_universal_proof_encode_decode() {
        let proof = UniversalProof::new(
            ProofType::PLONK,
            42,
            [0xABu8; 32],
            vec![1, 2, 3, 4, 5], // Mock proof bytes
            vec![6, 7, 8, 9],    // Mock public inputs
        );

        let encoded = proof.encode();
        let decoded = UniversalProof::decode(&encoded).unwrap();

        assert_eq!(proof, decoded);
        assert_eq!(decoded.version, 1);
        assert_eq!(decoded.proof_type, ProofType::PLONK);
        assert_eq!(decoded.program_id, 42);
    }

    #[test]
    fn test_universal_proof_decode_invalid() {
        // Too short
        assert_eq!(UniversalProof::decode(&[0u8; 10]), None);

        // Invalid version
        let mut buf = vec![0u8; 46];
        buf[0] = 99; // Invalid version
        assert_eq!(UniversalProof::decode(&buf), None);

        // Invalid proof type
        let mut buf = vec![0u8; 46];
        buf[0] = 1; // Valid version
        buf[1] = 99; // Invalid proof type
        assert_eq!(UniversalProof::decode(&buf), None);
    }

    #[test]
    fn test_universal_proof_with_public_statement() {
        let statement = PublicStatement::new(
            [0x11u8; 32],
            [0x22u8; 32],
            [0x33u8; 32],
            999u128,
        );
        let statement_bytes = statement.encode();

        let proof = UniversalProof::new(
            ProofType::Groth16,
            1,
            [0xFFu8; 32],
            vec![0xDE, 0xAD, 0xBE, 0xEF],
            statement_bytes,
        );

        let decoded_statement = proof.decode_public_statement().unwrap();
        assert_eq!(statement, decoded_statement);
    }

    #[test]
    fn test_encoded_size() {
        let statement = PublicStatement::new([0u8; 32], [0u8; 32], [0u8; 32], 0);
        assert_eq!(statement.encoded_size(), 116); // No extra data

        let statement_with_extra = PublicStatement::with_extra(
            [0u8; 32],
            [0u8; 32],
            [0u8; 32],
            0,
            vec![0u8; 100],
        );
        assert_eq!(statement_with_extra.encoded_size(), 216); // 116 + 100

        let proof = UniversalProof::new(
            ProofType::PLONK,
            0,
            [0u8; 32],
            vec![0u8; 128],
            vec![0u8; 116],
        );
        assert_eq!(proof.encoded_size(), 290); // 46 + 128 + 116
    }
}
