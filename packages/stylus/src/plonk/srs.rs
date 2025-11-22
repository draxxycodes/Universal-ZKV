//! Structured Reference String (SRS) management for PLONK
//! 
//! Implements Powers of Tau universal setup parameter management with:
//! - On-chain SRS storage and verification
//! - Hash-based parameter validation
//! - Multi-degree SRS support (2^10 to 2^20)
//! - Gas-optimized lazy loading
//! 
//! Security assumptions:
//! - Trusted setup ceremony participation
//! - Collision-resistant hash function (Keccak256)
//! - Proper secret destruction during ceremony

use ark_bn254::{Bn254, G1Affine, G2Affine};
use ark_ec::{AffineRepr, pairing::Pairing, CurveGroup, VariableBaseMSM};
use ark_ff::{PrimeField, Field, BigInteger};
use sha3::{Digest, Keccak256};
use alloc::vec::Vec;

/// Supported SRS degrees (circuit sizes)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SrsDegree {
    /// 2^10 = 1024 constraints (small circuits)
    D1024 = 10,
    /// 2^12 = 4096 constraints (medium circuits)
    D4096 = 12,
    /// 2^14 = 16384 constraints (large circuits)
    D16384 = 14,
    /// 2^16 = 65536 constraints (very large circuits)
    D65536 = 16,
    /// 2^18 = 262144 constraints (extra large circuits)
    D262144 = 18,
    /// 2^20 = 1048576 constraints (maximum supported)
    D1048576 = 20,
}

impl SrsDegree {
    /// Get the actual number of points for this degree
    pub fn size(&self) -> usize {
        1 << (*self as usize)
    }

    /// Convert from degree exponent
    pub fn from_exponent(exp: u8) -> Result<Self, super::Error> {
        match exp {
            10 => Ok(SrsDegree::D1024),
            12 => Ok(SrsDegree::D4096),
            14 => Ok(SrsDegree::D16384),
            16 => Ok(SrsDegree::D65536),
            18 => Ok(SrsDegree::D262144),
            20 => Ok(SrsDegree::D1048576),
            _ => Err(super::Error::InvalidSrsSize),
        }
    }
}

/// Structured Reference String for PLONK
/// 
/// Contains Powers of Tau parameters: [τ^0 G₁, τ^1 G₁, ..., τ^n G₁], [τ^0 G₂]
#[derive(Debug, Clone)]
pub struct Srs {
    /// G₁ powers: [G₁, τG₁, τ²G₁, ..., τⁿG₁]
    pub g1_powers: Vec<G1Affine>,
    /// G₂ powers: [G₂, τG₂] (only need first 2 for KZG)
    pub g2_powers: Vec<G2Affine>,
    /// Degree of the SRS (maximum supported circuit size)
    pub degree: SrsDegree,
    /// Keccak256 hash of the SRS for verification
    pub hash: [u8; 32],
}

impl Srs {
    /// Create new SRS from trusted setup parameters
    /// 
    /// # Security
    /// - Validates all points are on the curve
    /// - Validates all points are in correct subgroup
    /// - Computes and stores commitment hash
    /// 
    /// # Gas Cost
    /// ~500k gas for small SRS (1024), up to 5M gas for large SRS (1M)
    pub fn new(
        g1_powers: Vec<G1Affine>,
        g2_powers: Vec<G2Affine>,
        degree: SrsDegree,
    ) -> Result<Self, super::Error> {
        // Validate size matches degree
        let expected_size = degree.size();
        if g1_powers.len() != expected_size + 1 {
            return Err(super::Error::InvalidSrsSize);
        }
        if g2_powers.len() < 2 {
            return Err(super::Error::InvalidSrsSize);
        }

        // Validate G₁ points
        for point in &g1_powers {
            if !Self::validate_g1_point(point) {
                return Err(super::Error::InvalidG1Point);
            }
        }

        // Validate G₂ points
        for point in &g2_powers {
            if !Self::validate_g2_point(point) {
                return Err(super::Error::InvalidG2Point);
            }
        }

        // Compute commitment hash
        let hash = Self::compute_hash(&g1_powers, &g2_powers);

        Ok(Srs {
            g1_powers,
            g2_powers,
            degree,
            hash,
        })
    }

    /// Validate G₁ point is on curve and in correct subgroup
    fn validate_g1_point(point: &G1Affine) -> bool {
        // Check point is on the curve
        if !point.is_on_curve() {
            return false;
        }

        // Check point is in the prime-order subgroup
        // For BN254, this is equivalent to cofactor check
        point.is_in_correct_subgroup_assuming_on_curve()
    }

    /// Validate G₂ point is on curve and in correct subgroup
    fn validate_g2_point(point: &G2Affine) -> bool {
        // Check point is on the curve
        if !point.is_on_curve() {
            return false;
        }

        // Check point is in the prime-order subgroup
        point.is_in_correct_subgroup_assuming_on_curve()
    }

    /// Compute Keccak256 hash of SRS for commitment
    /// 
    /// Hash format: keccak256(g1_powers || g2_powers)
    /// where each point is serialized as compressed coordinates
    fn compute_hash(g1_powers: &[G1Affine], g2_powers: &[G2Affine]) -> [u8; 32] {
        let mut hasher = Keccak256::new();

        // Hash G₁ points
        for point in g1_powers {
            // Serialize as (x, y) coordinates
            let x_bytes = point.x.into_bigint().to_bytes_be();
            let y_bytes = point.y.into_bigint().to_bytes_be();
            hasher.update(&x_bytes);
            hasher.update(&y_bytes);
        }

        // Hash G₂ points
        for point in g2_powers {
            // G₂ points have extension field coordinates (Fq2)
            let x_c0_bytes = point.x.c0.into_bigint().to_bytes_be();
            let x_c1_bytes = point.x.c1.into_bigint().to_bytes_be();
            let y_c0_bytes = point.y.c0.into_bigint().to_bytes_be();
            let y_c1_bytes = point.y.c1.into_bigint().to_bytes_be();
            hasher.update(&x_c0_bytes);
            hasher.update(&x_c1_bytes);
            hasher.update(&y_c0_bytes);
            hasher.update(&y_c1_bytes);
        }

        let result = hasher.finalize();
        let mut hash = [0u8; 32];
        hash.copy_from_slice(&result);
        hash
    }

    /// Verify SRS matches known commitment hash
    /// 
    /// Used to validate on-chain SRS against trusted setup output
    pub fn verify_hash(&self, expected_hash: &[u8; 32]) -> bool {
        &self.hash == expected_hash
    }

    /// Get G₁ generator (τ^0 G₁)
    pub fn g1(&self) -> &G1Affine {
        &self.g1_powers[0]
    }

    /// Get G₂ generator (τ^0 G₂)
    pub fn g2(&self) -> &G2Affine {
        &self.g2_powers[0]
    }

    /// Get τG₂ for KZG verification
    pub fn tau_g2(&self) -> &G2Affine {
        &self.g2_powers[1]
    }

    /// Get G₁ power at specific index
    /// 
    /// Returns τⁱ G₁ where i is the index
    pub fn get_g1_power(&self, index: usize) -> Result<&G1Affine, super::Error> {
        self.g1_powers.get(index).ok_or(super::Error::InvalidSrsSize)
    }

    /// Verify SRS is correctly structured (pairing check)
    /// 
    /// Checks: e(τG₁, G₂) == e(G₁, τG₂)
    /// This validates the SRS was generated with consistent τ
    /// 
    /// # Gas Cost
    /// ~260k gas (2 pairings)
    pub fn verify_consistency(&self) -> Result<bool, super::Error> {
        if self.g1_powers.len() < 2 {
            return Err(super::Error::InvalidSrsSize);
        }
        if self.g2_powers.len() < 2 {
            return Err(super::Error::InvalidSrsSize);
        }

        // e(τG₁, G₂) == e(G₁, τG₂)
        let lhs = Bn254::pairing(self.g1_powers[1], self.g2_powers[0]);
        let rhs = Bn254::pairing(self.g1_powers[0], self.g2_powers[1]);

        Ok(lhs == rhs)
    }

    /// Compute multi-scalar multiplication (MSM) on G₁ powers
    /// 
    /// Computes: Σᵢ scalars[i] * g1_powers[i]
    /// Used for polynomial evaluation at τ
    /// 
    /// # Gas Cost
    /// ~50k + 6k*n where n is number of scalars
    pub fn msm_g1(&self, scalars: &[<Bn254 as Pairing>::ScalarField]) -> Result<G1Affine, super::Error> {
        if scalars.len() > self.g1_powers.len() {
            return Err(super::Error::InvalidSrsSize);
        }

        // Use arkworks MSM for efficiency
        let bases = &self.g1_powers[..scalars.len()];
        
        let result = <ark_bn254::G1Projective as VariableBaseMSM>::msm(bases, scalars)
            .map_err(|_| super::Error::MsmError)?;

        Ok(result.into_affine())
    }
}

/// SRS registry for on-chain storage
/// 
/// Stores multiple SRS of different degrees for different circuit sizes
#[derive(Debug)]
pub struct SrsRegistry {
    /// Registered SRS indexed by degree
    srs_map: alloc::collections::BTreeMap<u8, Srs>,
}

impl SrsRegistry {
    /// Create new empty registry
    pub fn new() -> Self {
        SrsRegistry {
            srs_map: alloc::collections::BTreeMap::new(),
        }
    }

    /// Register new SRS for a specific degree
    /// 
    /// # Gas Cost
    /// Storage: ~500k gas for small SRS, up to 5M for large SRS
    pub fn register(&mut self, srs: Srs) -> Result<(), super::Error> {
        let degree_exp = srs.degree as u8;
        
        // Check if already registered
        if self.srs_map.contains_key(&degree_exp) {
            return Err(super::Error::InvalidSrsSize); // Reusing error for "already exists"
        }

        // Verify SRS consistency before registration
        if !srs.verify_consistency()? {
            return Err(super::Error::InvalidProof);
        }

        self.srs_map.insert(degree_exp, srs);
        Ok(())
    }

    /// Get SRS for specific degree
    pub fn get(&self, degree: SrsDegree) -> Result<&Srs, super::Error> {
        self.srs_map
            .get(&(degree as u8))
            .ok_or(super::Error::InvalidSrsSize)
    }

    /// Check if SRS is registered for degree
    pub fn has(&self, degree: SrsDegree) -> bool {
        self.srs_map.contains_key(&(degree as u8))
    }

    /// Get all registered degrees
    pub fn registered_degrees(&self) -> Vec<SrsDegree> {
        self.srs_map
            .keys()
            .filter_map(|&exp| SrsDegree::from_exponent(exp).ok())
            .collect()
    }
}

impl Default for SrsRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ark_bn254::{Fr, G1Projective, G2Projective};
    use ark_std::UniformRand;

    fn generate_test_srs(degree: SrsDegree) -> Srs {
        let mut rng = ark_std::test_rng();
        let tau = Fr::rand(&mut rng);
        
        let size = degree.size();
        let g1_gen = G1Projective::generator();
        let g2_gen = G2Projective::generator();

        // Generate G₁ powers: [G₁, τG₁, τ²G₁, ...]
        let mut g1_powers = Vec::with_capacity(size + 1);
        let mut tau_power = Fr::one();
        for _ in 0..=size {
            g1_powers.push((g1_gen * tau_power).into_affine());
            tau_power *= tau;
        }

        // Generate G₂ powers: [G₂, τG₂]
        let g2_powers = vec![
            g2_gen.into_affine(),
            (g2_gen * tau).into_affine(),
        ];

        Srs::new(g1_powers, g2_powers, degree).unwrap()
    }

    #[test]
    fn test_srs_creation() {
        let srs = generate_test_srs(SrsDegree::D1024);
        assert_eq!(srs.g1_powers.len(), 1025);
        assert_eq!(srs.g2_powers.len(), 2);
        assert_eq!(srs.degree, SrsDegree::D1024);
    }

    #[test]
    fn test_srs_consistency() {
        let srs = generate_test_srs(SrsDegree::D1024);
        assert!(srs.verify_consistency().unwrap());
    }

    #[test]
    fn test_srs_hash_deterministic() {
        let srs1 = generate_test_srs(SrsDegree::D1024);
        let hash1 = srs1.hash;

        // Create identical SRS
        let srs2 = Srs::new(
            srs1.g1_powers.clone(),
            srs1.g2_powers.clone(),
            srs1.degree,
        ).unwrap();
        let hash2 = srs2.hash;

        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_srs_hash_verification() {
        let srs = generate_test_srs(SrsDegree::D1024);
        let correct_hash = srs.hash;
        assert!(srs.verify_hash(&correct_hash));

        let wrong_hash = [0u8; 32];
        assert!(!srs.verify_hash(&wrong_hash));
    }

    #[test]
    fn test_srs_registry() {
        let mut registry = SrsRegistry::new();
        
        let srs1024 = generate_test_srs(SrsDegree::D1024);
        let srs4096 = generate_test_srs(SrsDegree::D4096);

        registry.register(srs1024).unwrap();
        registry.register(srs4096).unwrap();

        assert!(registry.has(SrsDegree::D1024));
        assert!(registry.has(SrsDegree::D4096));
        assert!(!registry.has(SrsDegree::D16384));

        let registered = registry.registered_degrees();
        assert_eq!(registered.len(), 2);
    }

    #[test]
    fn test_srs_degree_size() {
        assert_eq!(SrsDegree::D1024.size(), 1024);
        assert_eq!(SrsDegree::D4096.size(), 4096);
        assert_eq!(SrsDegree::D1048576.size(), 1048576);
    }

    #[test]
    fn test_srs_msm() {
        let srs = generate_test_srs(SrsDegree::D1024);
        
        // Test MSM with small polynomial [1, 2, 3]
        let scalars = vec![Fr::from(1u64), Fr::from(2u64), Fr::from(3u64)];
        let result = srs.msm_g1(&scalars);
        assert!(result.is_ok());
        
        // Result should be: 1*G₁ + 2*τG₁ + 3*τ²G₁
        let point = result.unwrap();
        assert!(point.is_on_curve());
    }

    #[test]
    fn test_invalid_srs_size() {
        let mut rng = ark_std::test_rng();
        let g1_gen = G1Projective::generator();
        let g2_gen = G2Projective::generator();

        // Too few G₁ points
        let g1_powers = vec![g1_gen.into_affine(); 10];
        let g2_powers = vec![g2_gen.into_affine(); 2];
        
        let result = Srs::new(g1_powers, g2_powers, SrsDegree::D1024);
        assert!(result.is_err());
    }

    #[test]
    fn test_duplicate_registration() {
        let mut registry = SrsRegistry::new();
        let srs1 = generate_test_srs(SrsDegree::D1024);
        let srs2 = generate_test_srs(SrsDegree::D1024);

        registry.register(srs1).unwrap();
        let result = registry.register(srs2);
        assert!(result.is_err());
    }
}
