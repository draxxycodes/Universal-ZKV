use stark_simple::{estimate_gas_cost, SecurityLevel, GasEstimate};

fn main() {
    println!("=== STARK Verifier Gas Benchmarking ===\n");
    
    // Calculate gas for all security levels
    let test96 = estimate_gas_cost(SecurityLevel::Test96);
    let proven100 = estimate_gas_cost(SecurityLevel::Proven100);
    let high128 = estimate_gas_cost(SecurityLevel::High128);
    
    // Reference values for comparison
    let groth16_gas = 450_000u64;
    let plonk_gas = 950_000u64;
    
    // Print detailed breakdown
    println!("## Test96 Security (27 queries)");
    print_gas_breakdown(&test96);
    print_comparison(test96.total, groth16_gas, plonk_gas);
    
    println!("\n## Proven100 Security (28 queries)");
    print_gas_breakdown(&proven100);
    print_comparison(proven100.total, groth16_gas, plonk_gas);
    
    println!("\n## High128 Security (36 queries)");
    print_gas_breakdown(&high128);
    print_comparison(high128.total, groth16_gas, plonk_gas);
    
    // Print comparison table
    println!("\n## Gas Cost Comparison Table\n");
    println!("| Security Level | Queries | Gas Cost | vs Groth16 | vs PLONK |");
    println!("|---------------|---------|----------|------------|----------|");
    
    print_table_row("Test96", 27, test96.total, groth16_gas, plonk_gas);
    print_table_row("Proven100", 28, proven100.total, groth16_gas, plonk_gas);
    print_table_row("High128", 36, high128.total, groth16_gas, plonk_gas);
    
    println!("\n## Component Breakdown (Proven100)\n");
    println!("| Component | Gas Cost | Percentage |");
    println!("|-----------|----------|------------|");
    println!("| Merkle Proofs | {:>8} | {:>3}% |", proven100.merkle_proofs, 
             (proven100.merkle_proofs * 100) / proven100.total);
    println!("| Constraint Checks | {:>8} | {:>3}% |", proven100.constraint_checks, 
             (proven100.constraint_checks * 100) / proven100.total);
    println!("| Field Operations | {:>8} | {:>3}% |", proven100.field_operations, 
             (proven100.field_operations * 100) / proven100.total);
    println!("| Overhead | {:>8} | {:>3}% |", proven100.overhead, 
             (proven100.overhead * 100) / proven100.total);
    println!("| **Total** | **{:>8}** | **100%** |", proven100.total);
    
    println!("\n## Savings Summary\n");
    println!("STARK Test96 is:");
    println!("  - {}% cheaper than Groth16", calculate_savings(test96.total, groth16_gas));
    println!("  - {}% cheaper than PLONK", calculate_savings(test96.total, plonk_gas));
    println!("\nSTARK Proven100 is:");
    println!("  - {}% cheaper than Groth16", calculate_savings(proven100.total, groth16_gas));
    println!("  - {}% cheaper than PLONK", calculate_savings(proven100.total, plonk_gas));
    println!("\nSTARK High128 is:");
    println!("  - {}% cheaper than Groth16", calculate_savings(high128.total, groth16_gas));
    println!("  - {}% cheaper than PLONK", calculate_savings(high128.total, plonk_gas));
}

fn print_gas_breakdown(estimate: &GasEstimate) {
    println!("  Merkle Proofs:     {:>8} gas", estimate.merkle_proofs);
    println!("  Constraint Checks: {:>8} gas", estimate.constraint_checks);
    println!("  Field Operations:  {:>8} gas", estimate.field_operations);
    println!("  Overhead:          {:>8} gas", estimate.overhead);
    println!("  ─────────────────────────────");
    println!("  Total:             {:>8} gas", estimate.total);
}

fn print_comparison(stark_gas: usize, groth16_gas: u64, plonk_gas: u64) {
    let groth16_savings = calculate_savings(stark_gas, groth16_gas);
    let plonk_savings = calculate_savings(stark_gas, plonk_gas);
    
    println!("\n  vs Groth16 ({} gas): {} gas ({} savings)", 
             groth16_gas, 
             if stark_gas < groth16_gas as usize { 
                 format!("-{}", groth16_gas - stark_gas as u64) 
             } else { 
                 format!("+{}", stark_gas as u64 - groth16_gas) 
             },
             if groth16_savings >= 0 {
                 format!("{}%", groth16_savings)
             } else {
                 format!("{}% more expensive", -groth16_savings)
             }
    );
    
    println!("  vs PLONK ({} gas):   {} gas ({} savings)", 
             plonk_gas,
             if stark_gas < plonk_gas as usize { 
                 format!("-{}", plonk_gas - stark_gas as u64) 
             } else { 
                 format!("+{}", stark_gas as u64 - plonk_gas) 
             },
             if plonk_savings >= 0 {
                 format!("{}%", plonk_savings)
             } else {
                 format!("{}% more expensive", -plonk_savings)
             }
    );
}

fn print_table_row(level: &str, queries: u32, gas: usize, groth16: u64, plonk: u64) {
    let groth16_pct = calculate_savings(gas, groth16);
    let plonk_pct = calculate_savings(gas, plonk);
    
    println!("| {} | {} | ~{:>7} | {:>4}% {} | {:>4}% {} |", 
             level, 
             queries, 
             gas,
             groth16_pct.abs(),
             if groth16_pct >= 0 { "✅" } else { "❌" },
             plonk_pct.abs(),
             if plonk_pct >= 0 { "✅" } else { "❌" }
    );
}

fn calculate_savings(stark_gas: usize, reference_gas: u64) -> i64 {
    let stark = stark_gas as i64;
    let reference = reference_gas as i64;
    if stark >= reference {
        -((stark - reference) * 100 / reference)
    } else {
        (reference - stark) * 100 / reference
    }
}
