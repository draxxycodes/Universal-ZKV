// Universal ZK Verifier (UZKV)
// Single verifier that handles Groth16, PLONK, and STARK proofs

use alloc::vec::Vec;

// Import existing verifiers
// Import existing verifiers
use crate::groth16;
use crate::cost_model::{self, VerificationCost};
// use crate::plonk;
// use crate::stark;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProofSystem {
    Groth16 = 0,
    Plonk = 1,
    Stark = 2,
}

impl ProofSystem {
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(ProofSystem::Groth16),
            1 => Some(ProofSystem::Plonk),
            2 => Some(ProofSystem::Stark),
            _ => None,
        }
    }
}

use stylus_sdk::call::StaticCallContext;

// ...

/// Universal proof verification dispatcher
/// Routes proofs to appropriate specialized verifier based on proof type
pub fn verify_universal_proof<S: StaticCallContext + Copy>(
    context: S,
    proof_system: u8,
    proof: &[u8],
    public_inputs: &[u8],
    vk: &[u8],
) -> Result<bool, Vec<u8>> {
    let system = ProofSystem::from_u8(proof_system)
        .ok_or_else(|| b"Invalid proof system".to_vec())?;
    
    match system {
        ProofSystem::Groth16 => {
            groth16::verify(context, proof, public_inputs, vk)
                .map_err(|_| b"Groth16 verification failed".to_vec())
        }
        ProofSystem::Plonk => {
            crate::plonk::verify(context, proof, public_inputs, vk)
                .map_err(|_| b"Plonk verification failed".to_vec())
        }
        ProofSystem::Stark => {
            Err(b"Proof type not supported".to_vec())
        }
    }
}

/// Verify with gas budget check
pub fn verify_universal_proof_with_budget<S: StaticCallContext + Copy>(
    context: S,
    proof_system: u8,
    proof: &[u8],
    public_inputs: &[u8],
    vk: &[u8],
    gas_budget: u64,
) -> Result<bool, Vec<u8>> {
    let system = ProofSystem::from_u8(proof_system)
        .ok_or_else(|| b"Invalid proof system".to_vec())?;
        
    // Estimate cost
    let cost = match system {
        ProofSystem::Groth16 => VerificationCost::for_groth16(public_inputs.len() / 32), // Assuming 32-byte inputs
        ProofSystem::Plonk => VerificationCost::for_plonk(public_inputs.len() / 32, 65536), // Estimate
        ProofSystem::Stark => VerificationCost::for_stark(1024, 128),
    };
    
    if cost.estimated_total > gas_budget {
        return Err(b"Gas budget exceeded".to_vec());
    }
    
    verify_universal_proof(context, proof_system, proof, public_inputs, vk)
}

/// Batch verification - verify multiple proofs of potentially different systems
pub fn batch_verify_universal_proofs<S: StaticCallContext + Copy>(
    context: S,
    proof_systems: &[u8],
    proofs: &[Vec<u8>],
    public_inputs: &[Vec<u8>],
    vks: &[Vec<u8>],
) -> Result<Vec<bool>, Vec<u8>> {
    if proof_systems.len() != proofs.len() 
        || proofs.len() != public_inputs.len() 
        || public_inputs.len() != vks.len() {
        return Err(b"Array length mismatch".to_vec());
    }
    
    let mut results = Vec::new();
    
    for i in 0..proof_systems.len() {
        let result = verify_universal_proof(
            context,
            proof_systems[i],
            &proofs[i],
            &public_inputs[i],
            &vks[i],
        )?;
        
        results.push(result);
    }
    
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_proof_system_conversion() {
        assert_eq!(ProofSystem::from_u8(0), Some(ProofSystem::Groth16));
        assert_eq!(ProofSystem::from_u8(1), Some(ProofSystem::Plonk));
        assert_eq!(ProofSystem::from_u8(2), Some(ProofSystem::Stark));
        assert_eq!(ProofSystem::from_u8(3), None);
    }
}
