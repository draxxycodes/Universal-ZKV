//! Merkle Tree implementation using Keccak256
//!
//! Provides Merkle tree construction and proof verification for STARK commitments.
//! Uses Keccak256 for EVM compatibility (can verify proofs on-chain).

use alloc::vec::Vec;
use sha3::{Keccak256, Digest};

/// Merkle tree for committing to trace values
#[derive(Debug, Clone)]
pub struct MerkleTree {
    /// All tree nodes, stored level by level (leaves first)
    nodes: Vec<[u8; 32]>,
    /// Number of leaves
    num_leaves: usize,
}

impl MerkleTree {
    /// Build a Merkle tree from leaf data
    ///
    /// Each leaf is hashed with Keccak256.
    /// Tree is padded to power of 2 if necessary.
    pub fn new(leaves: &[[u8; 32]]) -> Self {
        if leaves.is_empty() {
            return MerkleTree {
                nodes: Vec::new(),
                num_leaves: 0,
            };
        }

        // Pad to power of 2
        let num_leaves = leaves.len().next_power_of_two();
        let total_nodes = 2 * num_leaves - 1;
        let mut nodes = vec![[0u8; 32]; total_nodes];

        // Copy leaves (first num_leaves nodes)
        for (i, leaf) in leaves.iter().enumerate() {
            nodes[i] = *leaf;
        }

        // Pad remaining leaves with zero hash
        for i in leaves.len()..num_leaves {
            nodes[i] = [0u8; 32];
        }

        // Build tree bottom-up
        // Internal nodes start at index num_leaves
        let mut level_start = 0;
        let mut level_size = num_leaves;

        while level_size > 1 {
            let next_level_start = level_start + level_size;
            let next_level_size = level_size / 2;

            for i in 0..next_level_size {
                let left_idx = level_start + 2 * i;
                let right_idx = level_start + 2 * i + 1;
                let parent_idx = next_level_start + i;

                nodes[parent_idx] = hash_pair(&nodes[left_idx], &nodes[right_idx]);
            }

            level_start = next_level_start;
            level_size = next_level_size;
        }

        MerkleTree { nodes, num_leaves }
    }

    /// Build a Merkle tree from u64 values
    pub fn from_u64_values(values: &[u64]) -> Self {
        let leaves: Vec<[u8; 32]> = values
            .iter()
            .map(|v| hash_leaf(&v.to_le_bytes()))
            .collect();
        Self::new(&leaves)
    }

    /// Get the Merkle root
    pub fn root(&self) -> [u8; 32] {
        if self.nodes.is_empty() {
            return [0u8; 32];
        }
        // Root is the last node
        self.nodes[self.nodes.len() - 1]
    }

    /// Generate a Merkle proof for leaf at given index
    pub fn proof(&self, leaf_index: usize) -> Option<MerkleProof> {
        if leaf_index >= self.num_leaves || self.nodes.is_empty() {
            return None;
        }

        let mut siblings = Vec::new();
        let mut current_idx = leaf_index;
        let mut level_start = 0;
        let mut level_size = self.num_leaves;

        while level_size > 1 {
            // Find sibling
            let sibling_idx = if current_idx % 2 == 0 {
                level_start + current_idx + 1
            } else {
                level_start + current_idx - 1
            };

            // Bounds check
            if sibling_idx < level_start + level_size {
                siblings.push(self.nodes[sibling_idx]);
            } else {
                siblings.push([0u8; 32]); // Padding node
            }

            // Move to parent level
            current_idx /= 2;
            level_start += level_size;
            level_size /= 2;
        }

        Some(MerkleProof {
            leaf_index,
            siblings,
        })
    }
}

/// Merkle proof for a single leaf
#[derive(Debug, Clone)]
pub struct MerkleProof {
    /// Index of the leaf
    pub leaf_index: usize,
    /// Sibling hashes from leaf to root
    pub siblings: Vec<[u8; 32]>,
}

impl MerkleProof {
    /// Verify the proof against a root and leaf hash
    pub fn verify(&self, leaf_hash: &[u8; 32], root: &[u8; 32]) -> bool {
        let mut current_hash = *leaf_hash;
        let mut current_idx = self.leaf_index;

        for sibling in &self.siblings {
            current_hash = if current_idx % 2 == 0 {
                hash_pair(&current_hash, sibling)
            } else {
                hash_pair(sibling, &current_hash)
            };
            current_idx /= 2;
        }

        current_hash == *root
    }

    /// Serialize proof to bytes
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&(self.leaf_index as u32).to_le_bytes());
        bytes.extend_from_slice(&(self.siblings.len() as u32).to_le_bytes());
        for sibling in &self.siblings {
            bytes.extend_from_slice(sibling);
        }
        bytes
    }

    /// Deserialize proof from bytes
    pub fn from_bytes(bytes: &[u8]) -> Option<Self> {
        if bytes.len() < 8 {
            return None;
        }

        let leaf_index = u32::from_le_bytes(bytes[0..4].try_into().ok()?) as usize;
        let num_siblings = u32::from_le_bytes(bytes[4..8].try_into().ok()?) as usize;

        if bytes.len() < 8 + num_siblings * 32 {
            return None;
        }

        let mut siblings = Vec::with_capacity(num_siblings);
        for i in 0..num_siblings {
            let start = 8 + i * 32;
            let mut sibling = [0u8; 32];
            sibling.copy_from_slice(&bytes[start..start + 32]);
            siblings.push(sibling);
        }

        Some(MerkleProof {
            leaf_index,
            siblings,
        })
    }
}

/// Hash two nodes together (parent = keccak(left || right))
fn hash_pair(left: &[u8; 32], right: &[u8; 32]) -> [u8; 32] {
    let mut hasher = Keccak256::new();
    hasher.update(left);
    hasher.update(right);
    let result = hasher.finalize();
    let mut output = [0u8; 32];
    output.copy_from_slice(&result);
    output
}

/// Hash a leaf value
fn hash_leaf(data: &[u8]) -> [u8; 32] {
    let mut hasher = Keccak256::new();
    hasher.update(b"leaf:");
    hasher.update(data);
    let result = hasher.finalize();
    let mut output = [0u8; 32];
    output.copy_from_slice(&result);
    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merkle_tree_single_leaf() {
        let leaves = [[1u8; 32]];
        let tree = MerkleTree::new(&leaves);
        
        // Root should be the single leaf
        let proof = tree.proof(0).unwrap();
        assert!(proof.verify(&leaves[0], &tree.root()));
    }

    #[test]
    fn test_merkle_tree_two_leaves() {
        let leaves = [[1u8; 32], [2u8; 32]];
        let tree = MerkleTree::new(&leaves);
        
        let proof0 = tree.proof(0).unwrap();
        let proof1 = tree.proof(1).unwrap();
        
        assert!(proof0.verify(&leaves[0], &tree.root()));
        assert!(proof1.verify(&leaves[1], &tree.root()));
    }

    #[test]
    fn test_merkle_tree_four_leaves() {
        let leaves = [[1u8; 32], [2u8; 32], [3u8; 32], [4u8; 32]];
        let tree = MerkleTree::new(&leaves);
        
        for (i, leaf) in leaves.iter().enumerate() {
            let proof = tree.proof(i).unwrap();
            assert!(proof.verify(leaf, &tree.root()), "Proof {} failed", i);
        }
    }

    #[test]
    fn test_merkle_tree_from_u64() {
        let values = [1u64, 2, 3, 4, 5, 6, 7, 8];
        let tree = MerkleTree::from_u64_values(&values);
        
        // Verify each value
        for (i, &value) in values.iter().enumerate() {
            let leaf_hash = hash_leaf(&value.to_le_bytes());
            let proof = tree.proof(i).unwrap();
            assert!(proof.verify(&leaf_hash, &tree.root()), "Proof {} failed", i);
        }
    }

    #[test]
    fn test_proof_serialization() {
        let leaves = [[1u8; 32], [2u8; 32], [3u8; 32], [4u8; 32]];
        let tree = MerkleTree::new(&leaves);
        
        let proof = tree.proof(2).unwrap();
        let bytes = proof.to_bytes();
        let restored = MerkleProof::from_bytes(&bytes).unwrap();
        
        assert_eq!(proof.leaf_index, restored.leaf_index);
        assert_eq!(proof.siblings.len(), restored.siblings.len());
        assert!(restored.verify(&leaves[2], &tree.root()));
    }

    #[test]
    fn test_invalid_proof_fails() {
        let leaves = [[1u8; 32], [2u8; 32]];
        let tree = MerkleTree::new(&leaves);
        
        let proof = tree.proof(0).unwrap();
        
        // Wrong leaf should fail
        let wrong_leaf = [99u8; 32];
        assert!(!proof.verify(&wrong_leaf, &tree.root()));
        
        // Wrong root should fail
        let wrong_root = [99u8; 32];
        assert!(!proof.verify(&leaves[0], &wrong_root));
    }
}
