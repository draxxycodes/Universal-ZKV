const inp = require("./test-inputs/merkle_proof.old/input_3.json");
console.log("Leaf:", inp.leaf);
console.log("Length:", inp.leaf.length);
console.log("BigInt:", BigInt(inp.leaf).toString());
console.log("\nRoot:", inp.root);
console.log("Length:", inp.root.length);
console.log("BigInt:", BigInt(inp.root).toString());
