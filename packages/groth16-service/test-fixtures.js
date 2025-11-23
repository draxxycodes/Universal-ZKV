import { groth16 } from "snarkjs";
import { readFile } from "fs/promises";

async function test() {
  try {
    const proofText = await readFile(
      "./test/fixtures/valid-proof.json",
      "utf-8",
    );
    const pubText = await readFile(
      "./test/fixtures/valid-public.json",
      "utf-8",
    );
    const vkText = await readFile(
      "./test/fixtures/verification-key.json",
      "utf-8",
    );

    const proof = JSON.parse(proofText);
    const pub = JSON.parse(pubText);
    const vk = JSON.parse(vkText);

    console.log("Testing verification with actual test fixtures:");
    console.log("- Proof pi_a length:", proof.pi_a?.length);
    console.log("- Public signals:", pub);
    console.log("- Public signals count:", pub.length);

    const result = await groth16.verify(vk, pub, proof);
    console.log("\\nVerification result:", result);

    if (!result) {
      console.log("\\n❌ VERIFICATION FAILED");
      console.log("This means the test fixtures don\\t form a valid proof!");
    } else {
      console.log("\\n✅ VERIFICATION PASSED");
    }
  } catch (error) {
    console.error("Error during verification:", error.message);
    console.error(error.stack);
  }
}

test();
