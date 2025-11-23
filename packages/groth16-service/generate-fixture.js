// Generate a simple valid Groth16 proof for testing
import { groth16 } from "snarkjs";
import { readFile, writeFile } from "fs/promises";
import { buildPoseidon } from "circomlibjs";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateValidProof() {
  try {
    console.log("🔧 Generating valid test proof...\n");

    // Step 1: Generate valid witness
    const poseidon = await buildPoseidon();
    const preimage0 = poseidon.F.e(BigInt("123"));
    const preimage1 = poseidon.F.e(BigInt("456"));
    const hash = poseidon([preimage0, preimage1]);

    const witness = {
      preimage: [preimage0.toString(), preimage1.toString()],
      expectedHash: hash.toString(),
    };

    console.log("✅ Generated witness");
    console.log(
      `   Preimage: [${witness.preimage[0]}, ${witness.preimage[1]}]`,
    );
    console.log(`   Hash: ${witness.expectedHash}\n`);

    // Step 2: Locate circuit files
    const buildDir = path.join(
      __dirname,
      "..",
      "packages",
      "circuits",
      "build",
    );
    const wasmFile = path.join(
      buildDir,
      "poseidon_test_js",
      "poseidon_test.wasm",
    );
    const zkeyFile = path.join(buildDir, "poseidon_beacon.zkey");

    // Check if files exist
    try {
      await readFile(wasmFile);
      await readFile(zkeyFile);
      console.log("✅ Found circuit files");
    } catch (error) {
      console.error(
        "❌ Circuit files not found. Please compile circuits first.",
      );
      console.error("   Expected:", wasmFile);
      console.error("   Expected:", zkeyFile);
      process.exit(1);
    }

    // Step 3: Generate proof
    console.log("\n🔨 Generating proof (this may take 10-30 seconds)...");
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      witness,
      wasmFile,
      zkeyFile,
    );
    console.log("✅ Proof generated\n");

    // Step 4: Load verification key
    const vkFile = path.join(buildDir, "poseidon_vk.json");
    const vkText = await readFile(vkFile, "utf-8");
    const vk = JSON.parse(vkText);

    // Step 5: Verify the proof
    console.log("🔍 Verifying proof...");
    const isValid = await groth16.verify(vk, publicSignals, proof);
    console.log(`   Result: ${isValid ? "✅ VALID" : "❌ INVALID"}\n`);

    if (!isValid) {
      console.error("❌ Generated proof failed verification!");
      process.exit(1);
    }

    // Step 6: Save to test fixtures
    const fixturesDir = path.join(__dirname, "test", "fixtures");

    await writeFile(
      path.join(fixturesDir, "valid-proof.json"),
      JSON.stringify(proof, null, 2),
    );

    await writeFile(
      path.join(fixturesDir, "valid-public.json"),
      JSON.stringify(publicSignals, null, 2),
    );

    await writeFile(
      path.join(fixturesDir, "verification-key.json"),
      JSON.stringify(vk, null, 2),
    );

    console.log("💾 Saved test fixtures:");
    console.log(`   - valid-proof.json`);
    console.log(`   - valid-public.json`);
    console.log(`   - verification-key.json\n`);

    console.log("🎉 Success! Valid test fixtures generated.");
    console.log("\nYou can now run: pnpm vitest run");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

generateValidProof();
