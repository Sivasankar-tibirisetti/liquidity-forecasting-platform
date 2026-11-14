
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "../..");
const groundTruthDirectory = path.join(root, "ground_truth");

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(groundTruthDirectory, fileName), "utf8")
  );
}

function main() {
  const inputs = readJson("anomaly-inputs.json");
  const truth = readJson("anomaly-ground-truth.json");

  const records = inputs.records;
  const labels = truth.records;

  const checks = [];

  // 1. Opening balance reconciliation
  const reconciliation = records[0];
  const calculatedClosing =
    reconciliation.openingBalance +
    reconciliation.ledgerInflows -
    reconciliation.ledgerOutflows;

  checks.push({
    recordId: reconciliation.recordId,
    issueType: "OPENING_LEDGER_CLOSING_MISMATCH",
    detected:
      calculatedClosing !== reconciliation.reportedClosingBalance,
    calculatedClosing,
    reportedClosing: reconciliation.reportedClosingBalance
  });

  // 2. Missing FX rate
  const missingFx = records[1];

  checks.push({
    recordId: missingFx.recordId,
    issueType: "MISSING_FX_RATE",
    detected:
      missingFx.sourceCurrency !== missingFx.reportingCurrency &&
      missingFx.exchangeRate === null
  });

  // 3. Duplicate cash flow
  const duplicate = records[2];
  const keys = duplicate.transactions.map(
    (transaction) => transaction.dedupeKey
  );

  const hasDuplicate =
    new Set(keys).size !== keys.length;

  checks.push({
    recordId: duplicate.recordId,
    issueType: "DUPLICATE_CASH_FLOW",
    detected: hasDuplicate
  });

  // 4. Actual after forecast cutoff
  const cutoff = records[3];

  checks.push({
    recordId: cutoff.recordId,
    issueType: "ACTUAL_AFTER_FORECAST_CUTOFF",
    detected:
      cutoff.actualTransaction.actualDate >
      cutoff.forecastCutoffDate
  });

  // 5. Mixed currencies without conversion
  const mixed = records[4];

  const currencies = new Set(
    mixed.transactions.map((transaction) => transaction.currency)
  );

  checks.push({
    recordId: mixed.recordId,
    issueType: "MIXED_CURRENCY_WITHOUT_CONVERSION",
    detected:
      currencies.size > 1 &&
      mixed.conversionApplied === false
  });

  const results = checks.map((check) => {
    const matchingLabel = labels.find(
      (label) => label.recordId === check.recordId
    );

    return {
      ...check,
      labelExists: Boolean(matchingLabel),
      labelMatches:
        Boolean(matchingLabel) &&
        matchingLabel.issueType === check.issueType,
      passed:
        check.detected &&
        Boolean(matchingLabel) &&
        matchingLabel.issueType === check.issueType
    };
  });

  const passed = results.filter((item) => item.passed).length;
  const failed = results.length - passed;

  const report = {
    generatedAt: new Date().toISOString(),
    totalCases: results.length,
    passed,
    failed,
    baselineDataModified: inputs.baselineDataModified,
    results
  };

  const outputPath = path.join(
    root,
    "exports",
    "anomaly-validation-report.json"
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  fs.writeFileSync(
    outputPath,
    JSON.stringify(report, null, 2)
  );

  console.log(JSON.stringify(report, null, 2));

  if (failed > 0) {
    throw new Error(`${failed} anomaly validation case(s) failed.`);
  }

  console.log("All anomaly fixture checks passed.");
}

main();
