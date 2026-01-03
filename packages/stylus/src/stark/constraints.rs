//! Dynamic AIR Constraint Evaluator
//! 
//! Evaluates arbitrary polynomial constraints defined in the Verification Key.

use alloc::vec::Vec;
use stylus_sdk::alloy_primitives::U256;
use crate::utils::{fr_add, fr_sub, fr_mul, fr_pow};
use super::types::{AirConstraint, Result, Error};

/// Evaluator for Generic AIR Constraints
pub struct ConstraintEvaluator;

impl ConstraintEvaluator {
    /// Evaluate a constraint at a specific domain point (row)
    /// 
    /// # Arguments
    /// * `constraint` - The generic constraint description (from VK)
    /// * `trace_window` - A window of trace values around the current row [T(i), T(i+1), ...]
    /// * `width` - Trace width (number of registers)
    pub fn evaluate(
        constraint: &AirConstraint,
        trace_window: &[u64], // Flattened window [reg0_t0, reg1_t0, ..., reg0_t1, ...]
        width: usize,
    ) -> Result<U256> {
        let mut sum = U256::ZERO;

        for term in &constraint.terms {
            // Calculate index in the flattened trace window
            // window_idx = (offset * width) + register
            let window_idx = (term.offset as usize * width) + term.register as usize;
            
            if window_idx >= trace_window.len() {
                return Err(Error::ConstraintSchemaInvalid);
            }
            
            // Get value from trace (lift to U256)
            let val_u64 = trace_window[window_idx];
            let val = U256::from(val_u64);
            
            // Compute term: coeff * value^power
            let mut term_val = val;
            if term.power > 1 {
                term_val = fr_pow(val, U256::from(term.power));
            } else if term.power == 0 {
                term_val = U256::from(1);
            }
            
            let weighted_term = fr_mul(term.coefficient, term_val);
            
            // Add to sum (assuming positive terms for now, negative coeffs handled via modular arithmetic)
            // Note: In BN254, negative numbers are large positive numbers.
            sum = fr_add(sum, weighted_term);
        }
        
        Ok(sum)
    }
}
