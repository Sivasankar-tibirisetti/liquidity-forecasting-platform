
module.exports = {
  seed: 20261022,

  currencies: ["INR", "USD", "EUR", "GBP", "JPY"],

  reportingCurrency: "INR",

  scale: {
    entities: 30,
    accountsPerEntity: 5,
    ledgerEntries: 100000,
    receivables: 10000,
    payables: 10000,
  },

  dateRange: {
    start: "2026-01-01",
    end: "2026-12-31",
  },

  fxCoverageDays: 400,

  actuals: {
    cutoffDate: "2026-11-14",
    maxSettlementDelayDays: 5,
    settlementInterval: 3,
  },

  batchSize: 1000,
};
