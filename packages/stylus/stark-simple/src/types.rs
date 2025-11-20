//! Type definitions and error handling

use core::fmt;

/// Error types for STARK operations
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Error {
    /// Proof deserialization failed
    DeserializationError,
    
    /// Proof structure is malformed
    InvalidProofStructure,
    
    /// Proof verification failed
    VerificationFailed,
    
    /// Input size exceeds limits
    InvalidInputSize,
    
    /// Merkle proof verification failed
    MerkleProofFailed,
    
    /// Constraint check failed
    ConstraintFailed,
    
    /// Invalid query position
    InvalidQueryPosition,
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::DeserializationError => write!(f, "Failed to deserialize proof"),
            Error::InvalidProofStructure => write!(f, "Invalid proof structure"),
            Error::VerificationFailed => write!(f, "Proof verification failed"),
            Error::InvalidInputSize => write!(f, "Input size exceeds limits"),
            Error::MerkleProofFailed => write!(f, "Merkle proof verification failed"),
            Error::ConstraintFailed => write!(f, "Constraint check failed"),
            Error::InvalidQueryPosition => write!(f, "Invalid query position"),
        }
    }
}

/// Result type for STARK operations
pub type Result<T> = core::result::Result<T, Error>;

/// Security level for STARK proofs
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SecurityLevel {
    /// 96-bit security (fast, suitable for testing)
    Test96 = 96,
    
    /// 100-bit security (recommended minimum for production)
    Proven100 = 100,
    
    /// 128-bit security (high security, slower verification)
    High128 = 128,
}

impl SecurityLevel {
    /// Get the number of queries needed for this security level
    pub fn num_queries(&self) -> usize {
        match self {
            SecurityLevel::Test96 => 27,
            SecurityLevel::Proven100 => 28,
            SecurityLevel::High128 => 36,
        }
    }
    
    /// Get the blowup factor
    pub fn blowup_factor(&self) -> usize {
        match self {
            SecurityLevel::Test96 => 8,
            SecurityLevel::Proven100 => 8,
            SecurityLevel::High128 => 16,
        }
    }
}

/// Gas cost estimate breakdown
#[derive(Debug, Clone)]
pub struct GasEstimate {
    pub merkle_proofs: usize,
    pub constraint_checks: usize,
    pub field_operations: usize,
    pub overhead: usize,
    pub total: usize,
}
