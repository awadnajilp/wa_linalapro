import { searchTrainingData } from "/Users/awadnejil/Desktop/wa.linala/code/server/services/training.service";

async function test() {
  console.log("=== TESTING SEARCH FOR SKYSECRETARY ===");
  const res1 = await searchTrainingData(
    "f19ba916-7860-4c84-b83a-394bcbcbdece",
    "a5566d97-5557-4773-a9c4-a5fc7668d973",
    "skysecretary"
  );
  console.log("Skysecretary search results:", JSON.stringify(res1, null, 2));

  console.log("\n=== TESTING SEARCH FOR URBAN KISSAN ===");
  const res2 = await searchTrainingData(
    "c680b0b1-3f65-465f-bb60-d540cacb67ac",
    "8f2d9712-cc95-4484-97dd-591f1dc203eb",
    "Invention"
  );
  console.log("Urban Kissan search results:", JSON.stringify(res2, null, 2));
}

test().catch(console.error).finally(() => process.exit(0));
