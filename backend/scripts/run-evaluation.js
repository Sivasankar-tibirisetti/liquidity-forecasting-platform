
const fs = require("fs");
const path = require("path");
const prisma = require("../src/config/prisma");
const {
  evaluateLinkedCashFlows,
} = require("../src/engines/evaluation.engine");

async function main() {
  const result = await evaluateLinkedCashFlows();

  const outputDirectory = path.join(__dirname, "../../exports");

  fs.mkdirSync(outputDirectory, { recursive: true });

  const outputPath = path.join(
    outputDirectory,
    "forecast-evaluation.json"
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(result, null, 2),
    "utf8"
  );

  console.log("Forecast evaluation completed.");
  console.log({
    matchedActualRecords: result.matchedActualRecords,
    skippedRecords: result.skippedRecords,
    comparisonGroups: result.comparisonGroups,
    metrics: result.metrics,
    outputPath,
  });
}

main()
  .catch((error) => {
    console.error("Evaluation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
