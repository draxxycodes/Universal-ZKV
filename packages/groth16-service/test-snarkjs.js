// Quick test to check snarkjs proof verification
import { groth16 } from 'snarkjs';
import { readFile } from 'fs/promises';

const proof = {
  "pi_a": [
    "20491192805390485299153009773594534940189261866228447918068658471970481763042",
    "9383485363053290200918347156157836566562967994039712273449902621266178545958"
  ],
  "pi_b": [
    [
      "4252822878758300859123897981450591353533073413197771768651442665752259397132",
      "6375614351688725206403948262868962793625744043794305715222011528459656738731"
    ],
    [
      "21847035105528745403288232691147584728191162732299865338377159692350059136679",
      "10505242626370262277552901082094356697409835680220590971873171140371331206856"
    ]
  ],
  "pi_c": [
    "2969033023725454733394117329757513988518811822103935229254557346221872433872",
    "6636606513213556493338464817912339859914242802364748002298499355562882907773"
  ],
  "protocol": "groth16",
  "curve": "bn128"
};

const vkText = await readFile('./test/fixtures/verification-key.json', 'utf-8');
const vk = JSON.parse(vkText);
const publicInputs = ["1"];

async function test() {
  try {
    console.log('Testing snarkjs verification...');
    console.log('VK keys:', Object.keys(vk));
    console.log('Proof keys:', Object.keys(proof));
    console.log('Public inputs:', publicInputs);
    
    const result = await groth16.verify(vk, publicInputs, proof);
    console.log('Verification result:', result);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

await test();
