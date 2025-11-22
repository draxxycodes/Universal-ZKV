/**
 * WASM Loader for PLONK Verification
 * 
 * Loads and initializes the Stylus WASM module for off-chain verification
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import pino from 'pino';

const logger = pino({ name: 'wasm-loader' });

interface WasmExports {
  memory: WebAssembly.Memory;
  verify_plonk_proof?: (
    proofPtr: number,
    proofLen: number,
    publicInputsPtr: number,
    publicInputsLen: number,
    vkHashPtr: number
  ) => number;
  alloc?: (size: number) => number;
  dealloc?: (ptr: number, size: number) => void;
}

class PlonkWasmVerifier {
  private instance: WebAssembly.Instance | null = null;
  private exports: WasmExports | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.info('WASM already initialized');
      return;
    }

    try {
      const wasmPath = process.env.WASM_PATH || '../../stylus/target/wasm32-unknown-unknown/release/uzkv_stylus.wasm';
      const absolutePath = resolve(process.cwd(), wasmPath);
      
      logger.info({ path: absolutePath }, 'Loading WASM module');
      
      const wasmBuffer = await readFile(absolutePath);
      logger.info({ size: wasmBuffer.length }, 'WASM module loaded');

      const wasmModule = await WebAssembly.compile(wasmBuffer);
      this.instance = await WebAssembly.instantiate(wasmModule, {
        env: {
          // Stylus SDK imports
          abort: () => {
            throw new Error('WASM abort called');
          },
        },
      });

      this.exports = this.instance.exports as WasmExports;
      this.initialized = true;

      logger.info('PLONK WASM verifier initialized successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize WASM verifier');
      throw error;
    }
  }

  /**
   * Verify a PLONK proof using the WASM module
   * 
   * @param proof - Serialized PLONK proof bytes
   * @param publicInputs - Public input field elements
   * @param vkHash - Verification key hash (32 bytes)
   * @returns true if proof is valid, false otherwise
   */
  async verify(
    proof: Uint8Array,
    publicInputs: Uint8Array,
    vkHash: Uint8Array
  ): Promise<boolean> {
    if (!this.initialized || !this.exports) {
      throw new Error('WASM verifier not initialized');
    }

    if (!this.exports.verify_plonk_proof) {
      throw new Error('verify_plonk_proof export not found in WASM module');
    }

    try {
      // Allocate memory for proof
      const proofPtr = this.exports.alloc?.(proof.length);
      if (proofPtr === undefined) {
        throw new Error('Failed to allocate memory for proof');
      }

      // Allocate memory for public inputs
      const publicInputsPtr = this.exports.alloc?.(publicInputs.length);
      if (publicInputsPtr === undefined) {
        this.exports.dealloc?.(proofPtr, proof.length);
        throw new Error('Failed to allocate memory for public inputs');
      }

      // Allocate memory for VK hash
      const vkHashPtr = this.exports.alloc?.(vkHash.length);
      if (vkHashPtr === undefined) {
        this.exports.dealloc?.(proofPtr, proof.length);
        this.exports.dealloc?.(publicInputsPtr, publicInputs.length);
        throw new Error('Failed to allocate memory for VK hash');
      }

      // Copy data to WASM memory
      const memory = new Uint8Array(this.exports.memory.buffer);
      memory.set(proof, proofPtr);
      memory.set(publicInputs, publicInputsPtr);
      memory.set(vkHash, vkHashPtr);

      // Call verification function
      const result = this.exports.verify_plonk_proof(
        proofPtr,
        proof.length,
        publicInputsPtr,
        publicInputs.length,
        vkHashPtr
      );

      // Clean up memory
      this.exports.dealloc?.(proofPtr, proof.length);
      this.exports.dealloc?.(publicInputsPtr, publicInputs.length);
      this.exports.dealloc?.(vkHashPtr, vkHash.length);

      return result === 1;
    } catch (error) {
      logger.error({ error }, 'WASM verification failed');
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const wasmVerifier = new PlonkWasmVerifier();
