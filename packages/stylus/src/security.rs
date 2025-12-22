//! Security Formalization for Universal ZK Verifier
//!
//! Provides formal security checks and invariant validation for the dispatch boundary.
//!
//! # Threat Model
//!
//! | Threat | Attack Vector | Mitigation |
//! |--------|---------------|------------|
//! | Proof Type Confusion | Submit Groth16 proof as PLONK | VK binding check |
//! | Curve Mismatch | Use BLS12-381 proof on BN254 verifier | Curve ID validation |
//! | VK Substitution | Swap VK to accept invalid proofs | VK commitment binding |
//! | Recursion Bomb | Unbounded recursive verification | Depth limit check |
//! | Input Overflow | Excessive public inputs | Size limit validation |
//!
//! # Security Invariants
//!
//! 1. **Proof-VK Binding**: A proof MUST only be verified against its intended VK
//! 2. **Type Safety**: Proof system ID in descriptor MUST match registered VK type
//! 3. **Curve Compatibility**: Proof curve MUST match verifier curve
//! 4. **Bounded Inputs**: Public input count MUST not exceed verifier limits

extern crate alloc;

use crate::types::{ProofType, UniversalProofDescriptor, CurveId};
use crate::verifier_traits::SecurityModel;

/// Security validation errors
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SecurityError {
    /// Proof type in descriptor doesn't match registered VK
    ProofTypeMismatch {
        expected: u8,
        actual: u8,
    },

    /// VK commitment doesn't match
    VKCommitmentMismatch,

    /// Curve in descriptor doesn't match verifier curve
    CurveMismatch {
        descriptor_curve: CurveId,
        verifier_curve: CurveId,
    },

    /// Recursion depth exceeds maximum allowed
    ExcessiveRecursionDepth {
        depth: u8,
        max_allowed: u8,
    },

    /// Too many public inputs for this verifier
    TooManyPublicInputs {
        count: u16,
        max_allowed: u16,
    },

    /// Proof size exceeds maximum for proof system
    ProofTooLarge {
        size: u32,
        max_allowed: u32,
    },

    /// Invalid proof format (failed structural check)
    InvalidProofStructure,

    /// Circuit ID not recognized
    UnknownCircuitId,

    /// Proof system not supported
    UnsupportedProofSystem,

    /// Security level insufficient for operation
    InsufficientSecurityLevel {
        required_bits: u8,
        provided_bits: u8,
    },

    /// Post-quantum security required but not provided
    PostQuantumRequired,
}

impl core::fmt::Display for SecurityError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            Self::ProofTypeMismatch { expected, actual } => {
                write!(f, "Proof type mismatch: expected {}, got {}", expected, actual)
            }
            Self::VKCommitmentMismatch => write!(f, "VK commitment mismatch"),
            Self::CurveMismatch { descriptor_curve, verifier_curve } => {
                write!(f, "Curve mismatch: descriptor {:?}, verifier {:?}", descriptor_curve, verifier_curve)
            }
            Self::ExcessiveRecursionDepth { depth, max_allowed } => {
                write!(f, "Recursion depth {} exceeds max {}", depth, max_allowed)
            }
            Self::TooManyPublicInputs { count, max_allowed } => {
                write!(f, "Public input count {} exceeds max {}", count, max_allowed)
            }
            Self::ProofTooLarge { size, max_allowed } => {
                write!(f, "Proof size {} exceeds max {}", size, max_allowed)
            }
            Self::InvalidProofStructure => write!(f, "Invalid proof structure"),
            Self::UnknownCircuitId => write!(f, "Unknown circuit ID"),
            Self::UnsupportedProofSystem => write!(f, "Unsupported proof system"),
            Self::InsufficientSecurityLevel { required_bits, provided_bits } => {
                write!(f, "Security level {} bits required, {} provided", required_bits, provided_bits)
            }
            Self::PostQuantumRequired => write!(f, "Post-quantum security required"),
        }
    }
}

/// Registered verification key metadata
///
/// Stored on-chain to validate incoming proofs.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RegisteredVK {
    /// Proof system this VK is for
    pub proof_type: ProofType,

    /// Keccak256 hash of the VK bytes
    pub vk_hash: [u8; 32],

    /// Circuit identifier
    pub circuit_id: [u8; 32],

    /// Curve the VK is defined over
    pub curve_id: CurveId,

    /// Maximum public inputs this VK supports
    pub max_public_inputs: u16,

    /// Whether this VK is active (can accept proofs)
    pub active: bool,
}

impl RegisteredVK {
    /// Create a new registered VK
    pub fn new(
        proof_type: ProofType,
        vk_hash: [u8; 32],
        circuit_id: [u8; 32],
        curve_id: CurveId,
        max_public_inputs: u16,
    ) -> Self {
        Self {
            proof_type,
            vk_hash,
            circuit_id,
            curve_id,
            max_public_inputs,
            active: true,
        }
    }
}

/// Dispatch boundary security validator
///
/// Validates proofs at the dispatch boundary BEFORE invoking the verifier.
/// This is the first line of defense against malformed or malicious proofs.
pub struct DispatchValidator {
    /// Maximum allowed recursion depth
    pub max_recursion_depth: u8,

    /// Whether post-quantum security is required
    pub require_post_quantum: bool,

    /// Minimum security bits required
    pub min_security_bits: u8,
}

impl Default for DispatchValidator {
    fn default() -> Self {
        Self {
            max_recursion_depth: 8,
            require_post_quantum: false,
            min_security_bits: 128,
        }
    }
}

impl DispatchValidator {
    /// Create a new validator with default settings
    pub fn new() -> Self {
        Self::default()
    }

    /// Create a strict validator (e.g., for high-value operations)
    pub fn strict() -> Self {
        Self {
            max_recursion_depth: 4,
            require_post_quantum: true,
            min_security_bits: 128,
        }
    }

    /// Validate proof type binding
    ///
    /// Ensures the descriptor's proof type matches the registered VK's type.
    /// Prevents proof type confusion attacks.
    pub fn validate_proof_type_binding(
        &self,
        descriptor: &UniversalProofDescriptor,
        registered_vk: &RegisteredVK,
    ) -> Result<(), SecurityError> {
        // Check VK is active
        if !registered_vk.active {
            return Err(SecurityError::UnsupportedProofSystem);
        }

        // Check proof type matches
        let expected = registered_vk.proof_type as u8;
        let actual = descriptor.proof_system_id;

        if expected != actual {
            return Err(SecurityError::ProofTypeMismatch { expected, actual });
        }

        // Check VK commitment matches
        if descriptor.vk_commitment != registered_vk.vk_hash {
            return Err(SecurityError::VKCommitmentMismatch);
        }

        // Check circuit ID matches
        if descriptor.circuit_id != registered_vk.circuit_id {
            return Err(SecurityError::UnknownCircuitId);
        }

        Ok(())
    }

    /// Validate curve compatibility
    ///
    /// Ensures the proof's curve matches the verifier's expected curve.
    /// Prevents curve mismatch attacks.
    pub fn validate_curve_match(
        &self,
        descriptor: &UniversalProofDescriptor,
        registered_vk: &RegisteredVK,
    ) -> Result<(), SecurityError> {
        if descriptor.curve_id != registered_vk.curve_id {
            return Err(SecurityError::CurveMismatch {
                descriptor_curve: descriptor.curve_id,
                verifier_curve: registered_vk.curve_id,
            });
        }

        Ok(())
    }

    /// Validate recursion depth
    ///
    /// Prevents recursion bomb attacks by limiting proof nesting.
    pub fn validate_recursion_depth(
        &self,
        descriptor: &UniversalProofDescriptor,
    ) -> Result<(), SecurityError> {
        if descriptor.recursion_depth > self.max_recursion_depth {
            return Err(SecurityError::ExcessiveRecursionDepth {
                depth: descriptor.recursion_depth,
                max_allowed: self.max_recursion_depth,
            });
        }

        Ok(())
    }

    /// Validate public input count
    ///
    /// Ensures the number of public inputs doesn't exceed verifier limits.
    pub fn validate_input_count(
        &self,
        descriptor: &UniversalProofDescriptor,
        registered_vk: &RegisteredVK,
    ) -> Result<(), SecurityError> {
        if descriptor.public_input_count > registered_vk.max_public_inputs {
            return Err(SecurityError::TooManyPublicInputs {
                count: descriptor.public_input_count,
                max_allowed: registered_vk.max_public_inputs,
            });
        }

        Ok(())
    }

    /// Validate proof size
    ///
    /// Ensures proof size is within bounds for the proof system.
    pub fn validate_proof_size(
        &self,
        descriptor: &UniversalProofDescriptor,
    ) -> Result<(), SecurityError> {
        let max_size = match descriptor.proof_system_id {
            0 => 512,       // Groth16: ~256 bytes typical, 512 max
            1 => 4_096,     // PLONK: ~800 bytes typical, 4KB max
            2 => 1_000_000, // STARK: ~50KB typical, 1MB max
            _ => return Err(SecurityError::UnsupportedProofSystem),
        };

        if descriptor.proof_length > max_size {
            return Err(SecurityError::ProofTooLarge {
                size: descriptor.proof_length,
                max_allowed: max_size,
            });
        }

        Ok(())
    }

    /// Validate security level
    ///
    /// Ensures the proof system provides sufficient security.
    pub fn validate_security_level(
        &self,
        security_model: &SecurityModel,
    ) -> Result<(), SecurityError> {
        // Check minimum security bits
        if security_model.security_bits < self.min_security_bits {
            return Err(SecurityError::InsufficientSecurityLevel {
                required_bits: self.min_security_bits,
                provided_bits: security_model.security_bits,
            });
        }

        // Check post-quantum requirement
        if self.require_post_quantum && !security_model.post_quantum_secure {
            return Err(SecurityError::PostQuantumRequired);
        }

        Ok(())
    }

    /// Run all validation checks
    ///
    /// Comprehensive validation before dispatching to verifier.
    pub fn validate_all(
        &self,
        descriptor: &UniversalProofDescriptor,
        registered_vk: &RegisteredVK,
        security_model: &SecurityModel,
    ) -> Result<(), SecurityError> {
        self.validate_proof_type_binding(descriptor, registered_vk)?;
        self.validate_curve_match(descriptor, registered_vk)?;
        self.validate_recursion_depth(descriptor)?;
        self.validate_input_count(descriptor, registered_vk)?;
        self.validate_proof_size(descriptor)?;
        self.validate_security_level(security_model)?;

        Ok(())
    }
}

/// Security audit record for logging/events
#[derive(Debug, Clone)]
pub struct SecurityAuditRecord {
    /// Proof descriptor hash (for reference)
    pub descriptor_hash: [u8; 32],

    /// VK hash used
    pub vk_hash: [u8; 32],

    /// Proof type
    pub proof_type: ProofType,

    /// Validation result (None = passed, Some = error)
    pub error: Option<SecurityError>,

    /// Gas consumed during validation
    pub validation_gas: u64,
}

/// Compute hash of descriptor for audit logging
/// 
/// Uses XOR folding for a simple deterministic hash.
/// In production, use stylus_sdk::crypto::keccak256.
pub fn hash_descriptor(descriptor: &UniversalProofDescriptor) -> [u8; 32] {
    let encoded = descriptor.encode();
    let mut output = [0u8; 32];

    // Simple XOR folding hash (for audit purposes only)
    // Production should use keccak256 via stylus_sdk
    for (i, byte) in encoded.iter().enumerate() {
        output[i % 32] ^= byte;
    }

    output
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::HashFunctionId;

    fn sample_descriptor() -> UniversalProofDescriptor {
        UniversalProofDescriptor::groth16(4, [1u8; 32], [2u8; 32])
    }

    fn sample_vk() -> RegisteredVK {
        RegisteredVK::new(
            ProofType::Groth16,
            [1u8; 32], // Matches descriptor vk_commitment
            [2u8; 32], // Matches descriptor circuit_id
            CurveId::BN254,
            256,
        )
    }

    #[test]
    fn test_valid_proof_type_binding() {
        let validator = DispatchValidator::new();
        let descriptor = sample_descriptor();
        let vk = sample_vk();

        let result = validator.validate_proof_type_binding(&descriptor, &vk);
        assert!(result.is_ok());
    }

    #[test]
    fn test_proof_type_mismatch() {
        let validator = DispatchValidator::new();
        let descriptor = sample_descriptor();

        let mut vk = sample_vk();
        vk.proof_type = ProofType::PLONK; // Mismatch!

        let result = validator.validate_proof_type_binding(&descriptor, &vk);
        assert!(matches!(result, Err(SecurityError::ProofTypeMismatch { .. })));
    }

    #[test]
    fn test_vk_commitment_mismatch() {
        let validator = DispatchValidator::new();
        let descriptor = sample_descriptor();

        let mut vk = sample_vk();
        vk.vk_hash = [99u8; 32]; // Mismatch!

        let result = validator.validate_proof_type_binding(&descriptor, &vk);
        assert!(matches!(result, Err(SecurityError::VKCommitmentMismatch)));
    }

    #[test]
    fn test_curve_mismatch() {
        let validator = DispatchValidator::new();
        let descriptor = sample_descriptor();

        let mut vk = sample_vk();
        vk.curve_id = CurveId::BLS12_381; // Mismatch!

        let result = validator.validate_curve_match(&descriptor, &vk);
        assert!(matches!(result, Err(SecurityError::CurveMismatch { .. })));
    }

    #[test]
    fn test_recursion_depth_exceeded() {
        let validator = DispatchValidator::new();

        let mut descriptor = sample_descriptor();
        descriptor.recursion_depth = 20; // Exceeds default max of 8

        let result = validator.validate_recursion_depth(&descriptor);
        assert!(matches!(result, Err(SecurityError::ExcessiveRecursionDepth { .. })));
    }

    #[test]
    fn test_strict_validator() {
        let validator = DispatchValidator::strict();

        let security_model = SecurityModel::groth16_bn254();

        // Groth16 is not post-quantum, strict validator requires it
        let result = validator.validate_security_level(&security_model);
        assert!(matches!(result, Err(SecurityError::PostQuantumRequired)));
    }

    #[test]
    fn test_proof_size_validation() {
        let validator = DispatchValidator::new();

        let mut descriptor = sample_descriptor();
        descriptor.proof_length = 10_000; // Too large for Groth16

        let result = validator.validate_proof_size(&descriptor);
        assert!(matches!(result, Err(SecurityError::ProofTooLarge { .. })));
    }

    #[test]
    fn test_validate_all_success() {
        let validator = DispatchValidator::new();
        let descriptor = sample_descriptor();
        let vk = sample_vk();
        let security_model = SecurityModel::groth16_bn254();

        let result = validator.validate_all(&descriptor, &vk, &security_model);
        assert!(result.is_ok());
    }
}
