//! UZKV CLI - Universal ZK Verifier Command Line Tool
//! 
//! This CLI tool provides a standalone verifier that can be invoked from Node.js scripts
//! or any other environment to verify Groth16, PLONK, and STARK proofs.
//!
//! Usage:
//!   uzkv-cli --proof-type <groth16|plonk|stark> \
//!            --proof <path> \
//!            --public-inputs <path> \
//!            --vk <path>
//!
//! For STARK proofs, the --vk parameter is optional as they use transparent setup.

use std::fs;
use std::path::PathBuf;
use std::process;

// Import UZKV library functions
use uzkv_stylus::uzkv::{ProofSystem, verify_offchain};

fn main() {
    let args: Vec<String> = std::env::args().collect();
    
    if args.len() < 2 {
        print_usage();
        process::exit(1);
    }
    
    // Parse command line arguments
    let mut proof_type: Option<String> = None;
    let mut proof_path: Option<PathBuf> = None;
    let mut public_inputs_path: Option<PathBuf> = None;
    let mut vk_path: Option<PathBuf> = None;
    
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--proof-type" | "-t" => {
                if i + 1 < args.len() {
                    proof_type = Some(args[i + 1].clone());
                    i += 2;
                } else {
                    eprintln!("Error: --proof-type requires a value");
                    process::exit(1);
                }
            }
            "--proof" | "-p" => {
                if i + 1 < args.len() {
                    proof_path = Some(PathBuf::from(&args[i + 1]));
                    i += 2;
                } else {
                    eprintln!("Error: --proof requires a path");
                    process::exit(1);
                }
            }
            "--public-inputs" | "-i" => {
                if i + 1 < args.len() {
                    public_inputs_path = Some(PathBuf::from(&args[i + 1]));
                    i += 2;
                } else {
                    eprintln!("Error: --public-inputs requires a path");
                    process::exit(1);
                }
            }
            "--vk" | "-v" => {
                if i + 1 < args.len() {
                    vk_path = Some(PathBuf::from(&args[i + 1]));
                    i += 2;
                } else {
                    eprintln!("Error: --vk requires a path");
                    process::exit(1);
                }
            }
            "--help" | "-h" => {
                print_usage();
                process::exit(0);
            }
            _ => {
                eprintln!("Error: Unknown argument '{}'", args[i]);
                print_usage();
                process::exit(1);
            }
        }
    }
    
    // Validate required arguments
    if proof_type.is_none() {
        eprintln!("Error: --proof-type is required");
        process::exit(1);
    }
    if proof_path.is_none() {
        eprintln!("Error: --proof is required");
        process::exit(1);
    }
    if public_inputs_path.is_none() {
        eprintln!("Error: --public-inputs is required");
        process::exit(1);
    }
    
    let proof_type = proof_type.unwrap().to_lowercase();
    
    // Map proof type string to ProofSystem enum
    let proof_system = match proof_type.as_str() {
        "groth16" => ProofSystem::Groth16,
        "plonk" => ProofSystem::Plonk,
        "stark" => ProofSystem::Stark,
        _ => {
            eprintln!("Error: Invalid proof type '{}'. Must be 'groth16', 'plonk', or 'stark'", proof_type);
            process::exit(1);
        }
    };
    
    // Read proof file
    let proof_bytes = match fs::read(proof_path.unwrap()) {
        Ok(bytes) => bytes,
        Err(e) => {
            eprintln!("Error reading proof file: {}", e);
            process::exit(1);
        }
    };
    
    // Read public inputs file
    let public_inputs_bytes = match fs::read(public_inputs_path.unwrap()) {
        Ok(bytes) => bytes,
        Err(e) => {
            eprintln!("Error reading public inputs file: {}", e);
            process::exit(1);
        }
    };
    
    // Read VK file (optional for STARK)
    let vk_bytes = if proof_system == ProofSystem::Stark {
        // STARK doesn't require VK (transparent setup)
        vec![]
    } else {
        if vk_path.is_none() {
            eprintln!("Error: --vk is required for {} proofs", proof_type);
            process::exit(1);
        }
        match fs::read(vk_path.unwrap()) {
            Ok(bytes) => bytes,
            Err(e) => {
                eprintln!("Error reading VK file: {}", e);
                process::exit(1);
            }
        }
    };
    
    // Convert ProofSystem enum to u8
    let proof_system_u8 = proof_system as u8;
    
    // Verify proof
    match verify_offchain(proof_system_u8, &proof_bytes, &public_inputs_bytes, &vk_bytes) {
        Ok(is_valid) => {
            // Output result as JSON for easy parsing by Node.js
            let result = serde_json::json!({
                "valid": is_valid,
                "proof_type": proof_type,
                "message": if is_valid { "Proof is valid" } else { "Proof is invalid" }
            });
            println!("{}", result);
            process::exit(if is_valid { 0 } else { 1 });
        }
        Err(e) => {
            // Convert error bytes to string
            let error_msg = String::from_utf8_lossy(&e);
            let result = serde_json::json!({
                "valid": false,
                "proof_type": proof_type,
                "error": error_msg
            });
            eprintln!("{}", result);
            process::exit(2);
        }
    }
}

fn print_usage() {
    eprintln!(r#"
UZKV CLI - Universal ZK Verifier

USAGE:
    uzkv-cli [OPTIONS]

OPTIONS:
    -t, --proof-type <TYPE>        Proof system type: groth16, plonk, or stark
    -p, --proof <PATH>             Path to proof file
    -i, --public-inputs <PATH>     Path to public inputs file
    -v, --vk <PATH>                Path to verification key file (not required for STARK)
    -h, --help                     Print this help message

EXAMPLES:
    # Verify Groth16 proof
    uzkv-cli -t groth16 -p proof.bin -i inputs.bin -v vk.bin

    # Verify PLONK proof
    uzkv-cli -t plonk -p proof.bin -i inputs.bin -v vk.bin

    # Verify STARK proof (no VK needed)
    uzkv-cli -t stark -p proof.bin -i inputs.bin

OUTPUT:
    JSON object with fields:
    - valid: boolean indicating if proof is valid
    - proof_type: string identifying proof system
    - message: success or error message
    - error: (optional) detailed error if verification failed

EXIT CODES:
    0 - Proof is valid
    1 - Proof is invalid or input validation failed
    2 - Verification error occurred
"#);
}
