
const fs = require("fs");
const path = require("path");

const inputPath = path.join(
  __dirname,
  "../../exports/forecast-evaluation.json"
);

const outputPath = path.join(
  __dirname,
  "../../exports/forecast-evaluation-by-currency.json"
);

function round(value, decimals = 4) {
  return Number(value.toFixed(decimals));
}

function calculateMetrics(rows) {
  const count = rows.length;

  const absoluteErrors = rows.map((row) =>
    Math.abs(Number(row.variance))
  );

  const squaredErrors = rows.map((row) =>
    Number(row.variance) ** 2
  );

  const percentageErrors = rows
    .filter((row) => row.variancePercent !== null)
    .map((row) => Math.abs(Number(row.variancePercent)));

  const bias = rows.reduce(
    (sum, row) => sum + Number(row.variance),
    0
  );

  return {
    comparisonGroups: count,
    MAE: count
      ? round(absoluteErrors.reduce((a, b) => a + b, 0) / count)
      : null,
    RMSE: count
      ? round(
          Math.sqrt(
            squaredErrors.reduce((a, b) => a + b, 0) / count
          )
        )
      : null,
    MAPE_percent: percentageErrors.length
      ? round(
          percentageErrors.reduce((a, b) => a + b, 0) /
            percentageErrors.length,
          2
        )
      : null,
    meanBias: count ? round(bias / count) : null,
    totalBias: round(bias),
    percentageErrorGroups: percentageErrors.length,
  };
}

function main() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Evaluation report not found: ${inputPath}`);
  }

  const report = JSON.parse(fs.readFileSync(inputPath, "utf8"));

  const grouped = {};

  for (const row of report.comparisons) {
    const currency = row.currency;

    if (!grouped[currency]) {
      grouped[currency] = [];
    }

    grouped[currency].push(row);
  }

  const currencyMetrics = {};

  for (const [currency, rows] of Object.entries(grouped)) {
    currencyMetrics[currency] = calculateMetrics(rows);
  }

  const result = {
    generatedAt: new Date().toISOString(),
    sourceReport: "forecast-evaluation.json",
    methodology:
      "Metrics are calculated separately for each account currency. Variance is actual net flow minus forecast net flow. MAPE excludes zero-actual groups.",
    currencyMetrics,
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

  console.log("Currency-specific evaluation completed.");
  console.log(JSON.stringify(result, null, 2));
  console.log(`Saved: ${outputPath}`);
}

main();
