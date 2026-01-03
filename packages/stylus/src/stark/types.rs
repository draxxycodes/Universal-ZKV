//! Type definitions and error handling
//! Generic AIR (Algebraic Intermediate Representation) Support

use core::fmt;
use alloc::vec::Vec;
use stylus_sdk::{
    alloy_primitives::U256,
};
use alloc::vec;

// ============================================================================
// Generic AIR Types (Universal STARK)
// ============================================================================

/// Atomic term in an AIR constraint
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ConstraintTerm {
    pub coefficient: U256,
    pub offset: u32,       // Relative row offset
    pub register: u32,     // Column index
    pub power: u32,        // Exponent
}

/// A generic AIR constraint equation
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AirConstraint {
    pub degree: u8,
    pub terms: Vec<ConstraintTerm>,
}

/// STARK Verification Key (Generic)
#[derive(Debug, Clone)]
pub struct StarkVerificationKey {
    pub trace_width: usize,
    pub constraints: Vec<AirConstraint>,
}

impl StarkVerificationKey {
    /// Deserialize VK from bytes
    /// 
    /// Format:
    /// [trace_width: 4 bytes]
    /// [num_constraints: 4 bytes]
    /// [Constraint 1]
    /// ...
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.is_empty() { return Err(Error::DeserializationError); }
        let mut idx = 0;
        
        let read_u32 = |i: &mut usize| -> Result<u32> {
            if *i + 4 > bytes.len() { return Err(Error::DeserializationError); }
            let val = u32::from_be_bytes(bytes[*i..*i+4].try_into().unwrap());
            *i += 4;
            Ok(val)
        };
        
        let trace_width = read_u32(&mut idx)? as usize;
        let num_constraints = read_u32(&mut idx)?;
        
        let mut constraints = Vec::with_capacity(num_constraints as usize);
        
        for _ in 0..num_constraints {
            // Constraint Format:
            // [degree: 1 byte]
            // [num_terms: 4 bytes]
            // [Term 1] ...
            
            if idx + 1 > bytes.len() { return Err(Error::DeserializationError); }
            let degree = bytes[idx];
            idx += 1;
            
            let num_terms = read_u32(&mut idx)?;
            let mut terms = Vec::with_capacity(num_terms as usize);
            
            for _ in 0..num_terms {
                // Term Format:
                // [coeff: 32 bytes]
                // [offset: 4 bytes]
                // [register: 4 bytes]
                // [power: 4 bytes]
                
                if idx + 32 > bytes.len() { return Err(Error::DeserializationError); }
                let coefficient = U256::from_be_slice(&bytes[idx..idx+32]);
                idx += 32;
                
                let offset = read_u32(&mut idx)?;
                let register = read_u32(&mut idx)?;
                let power = read_u32(&mut idx)?;
                
                terms.push(ConstraintTerm {
                    coefficient,
                    offset,
                    register,
                    power,
                });
            }
            
            constraints.push(AirConstraint { degree, terms });
        }
        
        Ok(StarkVerificationKey {
            trace_width,
            constraints,
        })
    }
}

/// Generic STARK Proof
/// ... (Rest is unchanged)
#[derive(Debug, Clone)]
pub struct StarkProof {
    pub trace_commitment: [u8; 32],
    pub query_values: Vec<(usize, u64)>, // (position, value) pair
    pub merkle_proofs: Vec<Vec<[u8; 32]>>,
    pub expected_result: u64, // Public Output
}

/// Error types
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Error {
    DeserializationError,
    InvalidProofStructure,
    VerificationFailed,
    InvalidInputSize,
    MerkleProofFailed,
    ConstraintFailed,
    InvalidQueryPosition,
    ConstraintSchemaInvalid,
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::DeserializationError => write!(f, "Failed to deserialize proof"),
            Error::InvalidProofStructure => write!(f, "Invalid structure"),
            Error::VerificationFailed => write!(f, "Verification failed"),
            Error::InvalidInputSize => write!(f, "Invalid size"),
            Error::MerkleProofFailed => write!(f, "Merkle failed"),
            Error::ConstraintFailed => write!(f, "Constraint failed"),
            Error::InvalidQueryPosition => write!(f, "Query invalid"),
            Error::ConstraintSchemaInvalid => write!(f, "Schema invalid"),
        }
    }
}

pub type Result<T> = core::result::Result<T, Error>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SecurityLevel {
    Test96 = 96,
    Proven100 = 100,
    High128 = 128,
}

impl SecurityLevel {
    pub fn num_queries(&self) -> usize {
        match self {
            SecurityLevel::Test96 => 27,
            SecurityLevel::Proven100 => 28,
            SecurityLevel::High128 => 36,
        }
    }
}

pub struct GasEstimate {
    pub merkle_proofs: usize,
    pub constraint_checks: usize,
    pub field_operations: usize,
    pub overhead: usize,
    pub total: usize,
}
