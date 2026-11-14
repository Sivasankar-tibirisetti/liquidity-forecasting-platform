
const fs = require("fs");
const path = require("path");
const prisma = require("../src/config/prisma");

const root = path.join(__dirname, "../..");
const outputDirectory = path.join(root, "exports");

const datasets = [
  ["legalEntity", "legal-entities"],
  ["bankAccount", "bank-accounts"],
  ["ledgerEntry", "ledger-entries"],
  ["receivable", "receivables"],
  ["payable", "payables"],
  ["currencyRate", "currency-rates"],
  ["cashFlowForecast", "cash-flow-forecasts"],
  ["liquidityScenario", "liquidity-scenarios"],
  ["forecastRun", "forecast-runs"],
  ["scenarioAdjustment", "scenario-adjustments"],
  ["forecastRunItem", "forecast-run-items"],
  ["forecastRunLine", "forecast-run-lines"],
  ["actualCashFlow", "actual-cash-flows"],
  ["accountBalanceSnapshot", "account-balance-snapshots"],
  ["forecastComparison", "forecast-comparisons"],
  ["auditEvent", "audit-events"],
  ["entityEvent", "entity-events"]
];

function serialize(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function toCsv(rows) {
  if (!rows.length) return "";

  const columns = [...new Set(rows.flatMap(Object.keys))];

  const escape = (value) =>
    `"${serialize(value).replace(/"/g, '""')}"`;

  return [
    columns.map(escape).join(","),
    ...rows.map((row) =>
      columns.map((column) => escape(row[column])).join(",")
    )
  ].join("\n");
}

async function main() {
  fs.mkdirSync(outputDirectory, { recursive: true });

  const manifest = [];

  for (const [delegate, fileName] of datasets) {
    if (!prisma[delegate]) {
      throw new Error(`Prisma model delegate not found: ${delegate}`);
    }

    const rows = await prisma[delegate].findMany();

    const jsonPath = path.join(
      outputDirectory,
      `${fileName}.json`
    );

    const csvPath = path.join(
      outputDirectory,
      `${fileName}.csv`
    );

    fs.writeFileSync(
      jsonPath,
      JSON.stringify(rows, null, 2),
      "utf8"
    );

    fs.writeFileSync(
      csvPath,
      toCsv(rows),
      "utf8"
    );

    manifest.push({
      dataset: fileName,
      rowCount: rows.length,
      jsonFile: `${fileName}.json`,
      csvFile: `${fileName}.csv`
    });

    console.log(`${fileName}: ${rows.length} records exported`);
  }

  fs.writeFileSync(
    path.join(outputDirectory, "export-manifest.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        format: ["JSON", "CSV"],
        datasets: manifest,
        totalDatasets: manifest.length,
        totalRecords: manifest.reduce(
          (sum, item) => sum + item.rowCount,
          0
        )
      },
      null,
      2
    )
  );

  console.log("\nAll dataset exports completed.");
  console.log(`Output directory: ${outputDirectory}`);
}

main()
  .catch((error) => {
    console.error("Export failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
