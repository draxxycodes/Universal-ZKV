use stark_simple::{FibonacciTrace, FibonacciProof, StarkVerifier, SecurityLevel};
use std::fs;
use std::path::Path;

fn main() {
    println!("=== STARK Proof Generation ===\n");
    
    // Create output directory
    let output_dir = Path::new("generated_proofs");
    fs::create_dir_all(output_dir).expect("Failed to create output directory");
    
    println!("Generating 100+ proofs...\n");
    
    let mut total_proofs = 0;
    let mut total_verified = 0;
    
    // Generate proofs for different trace lengths
    for &length in &[64, 128, 256, 512] {
        println!("Trace Length: {}", length);
        
        for &level in &[SecurityLevel::Test96, SecurityLevel::Proven100, SecurityLevel::High128] {
            let level_name = match level {
                SecurityLevel::Test96 => "test96",
                SecurityLevel::Proven100 => "proven100",
                SecurityLevel::High128 => "high128",
            };
            
            let num_queries = level.num_queries();
            
            // Generate 10 proofs for each combination
            for i in 0..10 {
                total_proofs += 1;
                
                // Generate trace
                let trace = match FibonacciTrace::generate(length) {
                    Ok(t) => t,
                    Err(e) => {
                        eprintln!("  Failed to generate trace: {:?}", e);
                        continue;
                    }
                };
                
                // Generate proof
                let proof = FibonacciProof::generate(&trace, num_queries);
                
                // Verify proof
                let verifier = StarkVerifier::new(level);
                let result = verifier.verify(&proof, length, [1, 1]);
                
                if result.is_ok() {
                    total_verified += 1;
                } else {
                    eprintln!("  Verification failed for proof {}", total_proofs);
                    continue;
                }
                
                // Save proof to file
                let filename = format!("proof_len{}_{}_{}.json", length, level_name, i);
                let filepath = output_dir.join(&filename);
                
                let proof_json = format!(
                    r#"{{
  "trace_length": {},
  "security_level": "{}",
  "num_queries": {},
  "trace_commitment": "{}",
  "query_values": [{}],
  "expected_result": {},
  "verified": true
}}"#,
                    length,
                    level_name,
                    num_queries,
                    hex::encode(&proof.trace_commitment),
                    proof.query_values.iter()
                        .map(|(pos, val)| format!("{{\"position\": {}, \"value\": {}}}", pos, val))
                        .collect::<Vec<_>>()
                        .join(", "),
                    proof.expected_result
                );
                
                fs::write(&filepath, proof_json)
                    .expect(&format!("Failed to write {}", filename));
            }
            
            println!("  {}: 10 proofs generated and verified", level_name);
        }
        
        println!();
    }
    
    println!("=== Generation Complete ===");
    println!("Total proofs generated: {}", total_proofs);
    println!("Total proofs verified:  {}", total_verified);
    println!("Success rate:          {:.1}%", (total_verified as f64 / total_proofs as f64) * 100.0);
    println!("\nProofs saved to: {}/", output_dir.display());
    println!("\nProof breakdown:");
    println!("  - Trace lengths: 64, 128, 256, 512");
    println!("  - Security levels: Test96, Proven100, High128");
    println!("  - 10 proofs per combination");
    println!("  - Total: {} proof files", total_proofs);
}
