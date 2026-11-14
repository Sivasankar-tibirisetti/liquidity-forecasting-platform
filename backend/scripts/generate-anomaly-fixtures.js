
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "../..");
const inputDirectory = path.join(root, "ground_truth");
const outputDirectory = path.join(root, "ground_truth");

const anomalyInputs = [
  {
    recordId: "ANOM-001",
    accountId: "BANKACC-ENT-000001-001",
    openingBalance: 100000,
    ledgerInflows: 20000,
    ledgerOutflows: 5000,
    reportedClosingBalance: 130000,
    currency: "INR"
  },
  {
    recordId: "ANOM-002",
    transactionId: "FX-TXN-001",
    sourceCurrency: "USD",
    reportingCurrency: "INR",
    amount: 1000,
    exchangeRate: null,
    convertedAmount: null,
    effectiveDate: "2026-11-10"
  },
  {
    recordId: "ANOM-003",
    transactions: [
      {
        transactionId: "CF-DUP-001",
        dedupeKey: "INVOICE-2026-0091",
        amount: 25000,
        currency: "INR"
      },
      {
        transactionId: "CF-DUP-002",
        dedupeKey: "INVOICE-2026-0091",
        amount: 25000,
        currency: "INR"
      }
    ]
  },
  {
    recordId: "ANOM-004",
    forecastCutoffDate: "2026-11-14",
    actualTransaction: {
      transactionId: "ACT-LATE-001",
      actualDate: "2026-11-16",
      amount: 45000,
      currency: "INR"
    }
  },
  {
    recordId: "ANOM-005",
    reportingCurrency: "INR",
    transactions: [
      {
        transactionId: "MIX-001",
        amount: 1000,
        currency: "INR"
      },
      {
        transactionId: "MIX-002",
        amount: 100,
        currency: "USD"
      }
    ],
    reportedCombinedAmount: 1100,
    conversionApplied: false
  }
];

const groundTruth = [
  {
    recordId: "ANOM-001",
    issueType: "OPENING_LEDGER_CLOSING_MISMATCH",
    severity: "HIGH",
    expectedValue: 115000,
    observedValue: 130000,
    difference: 15000,
    detectionRule:
      "Opening balance + ledger inflows - ledger outflows must equal closing balance."
  },
  {
    recordId: "ANOM-002",
    issueType: "MISSING_FX_RATE",
    severity: "HIGH",
    detectionRule:
      "A non-reporting-currency transaction requires an applicable FX rate for its effective date."
  },
  {
    recordId: "ANOM-003",
    issueType: "DUPLICATE_CASH_FLOW",
    severity: "HIGH",
    detectionRule:
      "Multiple transactions with the same deduplication key must be reviewed as duplicates."
  },
  {
    recordId: "ANOM-004",
    issueType: "ACTUAL_AFTER_FORECAST_CUTOFF",
    severity: "HIGH",
    detectionRule:
      "Actual transactions dated after the forecast cutoff must not enter the historical forecast input set."
  },
  {
    recordId: "ANOM-005",
    issueType: "MIXED_CURRENCY_WITHOUT_CONVERSION",
    severity: "HIGH",
    detectionRule:
      "Amounts in different currencies must not be added without conversion into a common reporting currency."
  }
];

function writeJson(fileName, data) {
  const filePath = path.join(outputDirectory, fileName);

  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2),
    "utf8"
  );

  console.log(`Created: ${filePath}`);
}

function main() {
  fs.mkdirSync(inputDirectory, { recursive: true });

  writeJson("anomaly-inputs.json", {
    datasetType: "Isolated synthetic anomaly fixtures",
    baselineDataModified: false,
    records: anomalyInputs
  });

  writeJson("anomaly-ground-truth.json", {
    datasetType: "Expected anomaly labels and detection rules",
    records: groundTruth
  });

  console.log({
    anomalyInputRecords: anomalyInputs.length,
    groundTruthLabels: groundTruth.length,
    baselineDataModified: false,
    status: "Anomaly fixtures generated successfully"
  });
}

main();
