// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../interfaces/IUniversalVerifier.sol";

/**
 * @title MockStylusVerifier
 * @notice Mock implementation of Stylus WASM verifier for testing
 * @dev Simulates Stylus contract behavior without WASM deployment
 */
contract MockStylusVerifier is IUniversalVerifier {
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    mapping(bytes32 => bool) private _registeredVKs;
    mapping(bytes32 => bool) private _usedNullifiers;
    uint256 private _verificationCount;
    bool private _paused;
    address private _admin;
    
    // ============================================
    // CONFIGURATION
    // ============================================
    
    bool public alwaysSucceed;
    bool public shouldRevert;
    string public revertMessage;
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(address admin) {
        _admin = admin;
        alwaysSucceed = true; // Default to success for testing
    }
    
    // ============================================
    // TEST HELPERS
    // ============================================
    
    function setAlwaysSucceed(bool value) external {
        alwaysSucceed = value;
    }
    
    function setShouldRevert(bool value, string calldata message) external {
        shouldRevert = value;
        revertMessage = message;
    }
    
    // ============================================
    // UNIVERSAL VERIFICATION
    // ============================================
    
    function verify(
        uint8 proofType,
        bytes calldata proof,
        bytes calldata publicInputs,
        bytes32 vkHash
    ) external override returns (bool valid) {
        if (_paused) revert ContractPaused();
        if (shouldRevert) revert(revertMessage);
        if (!_registeredVKs[vkHash]) revert VKNotRegistered();
        
        // Validate proof type
        if (proofType > 2) revert InvalidProofType();
        
        // Basic validation
        if (proof.length == 0) revert MalformedProof();
        if (publicInputs.length == 0) revert InvalidPublicInputs();
        
        _verificationCount++;
        
        return alwaysSucceed;
    }
    
    function batchVerify(
        uint8 proofType,
        bytes[] calldata proofs,
        bytes[] calldata publicInputs,
        bytes32 vkHash
    ) external override returns (bool[] memory results) {
        if (_paused) revert ContractPaused();
        if (shouldRevert) revert(revertMessage);
        if (!_registeredVKs[vkHash]) revert VKNotRegistered();
        if (proofs.length != publicInputs.length) revert InvalidInputSize();
        
        results = new bool[](proofs.length);
        
        for (uint256 i = 0; i < proofs.length; i++) {
            if (proofs[i].length == 0) revert MalformedProof();
            if (publicInputs[i].length == 0) revert InvalidPublicInputs();
            
            results[i] = alwaysSucceed;
            _verificationCount++;
        }
        
        return results;
    }
    
    function registerVkTyped(
        uint8 proofType,
        bytes calldata vk
    ) external override returns (bytes32 vkHash) {
        if (proofType > 2) revert InvalidProofType();
        if (vk.length == 0) revert InvalidVerificationKey();
        
        vkHash = keccak256(vk);
        _registeredVKs[vkHash] = true;
        
        return vkHash;
    }
    
    // ============================================
    // GROTH16-SPECIFIC (LEGACY)
    // ============================================
    
    function verifyGroth16(
        bytes calldata proof,
        bytes calldata publicInputs,
        bytes32 vkHash
    ) external override returns (bool valid) {
        if (_paused) revert ContractPaused();
        if (shouldRevert) revert(revertMessage);
        if (!_registeredVKs[vkHash]) revert VKNotRegistered();
        
        if (proof.length == 0) revert MalformedProof();
        if (publicInputs.length == 0) revert InvalidPublicInputs();
        
        _verificationCount++;
        return alwaysSucceed;
    }
    
    function registerVk(bytes calldata vk) 
        external 
        override 
        returns (bytes32 vkHash) 
    {
        if (vk.length == 0) revert InvalidVerificationKey();
        
        vkHash = keccak256(vk);
        _registeredVKs[vkHash] = true;
        
        return vkHash;
    }
    
    // ============================================
    // QUERY FUNCTIONS
    // ============================================
    
    function getVerificationCount() 
        external 
        view 
        override 
        returns (uint256 count) 
    {
        return _verificationCount;
    }
    
    function isVkRegistered(bytes32 vkHash) 
        external 
        view 
        override 
        returns (bool registered) 
    {
        return _registeredVKs[vkHash];
    }
    
    function isPaused() external view override returns (bool paused) {
        return _paused;
    }
    
    function isNullifierUsed(bytes32 nullifier) 
        external 
        view 
        override 
        returns (bool used) 
    {
        return _usedNullifiers[nullifier];
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    function pause() external override {
        require(msg.sender == _admin, "Not admin");
        _paused = true;
    }
    
    function unpause() external override {
        require(msg.sender == _admin, "Not admin");
        _paused = false;
    }
    
    function markNullifierUsed(bytes32 nullifier) 
        external 
        override 
        returns (bool success) 
    {
        require(msg.sender == _admin, "Not admin");
        
        if (_usedNullifiers[nullifier]) {
            return false;
        }
        
        _usedNullifiers[nullifier] = true;
        return true;
    }
}
