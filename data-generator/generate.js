
const path = require("path");
const fs = require("fs");

require("../backend/node_modules/dotenv").config({
  path: path.join(__dirname, "../backend/.env"),
});;

const { PrismaClient } = require("../backend/node_modules/@prisma/client");
const seedrandom = require("../backend/node_modules/seedrandom");

const config = require("./config/generator.config");

const prisma = new PrismaClient();
const rng = seedrandom(String(config.seed));

const currencies = config.currencies;
const startDate = new Date(config.dateRange.start + "T00:00:00.000Z");


const endDate = new Date(config.dateRange.end + "T00:00:00.000Z");

const DAY_MS = 24 * 60 * 60 * 1000;

const totalDateDays =
  Math.floor((endDate - startDate) / DAY_MS) + 1;

if (totalDateDays <= 0) {
  throw new Error("Invalid generator date range.");
}

function randomDateOffset() {
  return integer(0, totalDateDays - 1);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}


function random(min, max) {
  return min + rng() * (max - min);
}

function integer(min, max) {
  return Math.floor(random(min, max + 1));
}

function pick(array) {
  return array[integer(0, array.length - 1)];
}

function dateAt(dayOffset) {
  const date = new Date(startDate);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date;
}

function money(min, max) {
  return Number(random(min, max).toFixed(4));
}

function pad(value, length) {
  return String(value).padStart(length, "0");
}

function entityId(i) {
  return `ENT-${pad(i, 6)}`;
}

function accountId(entity, sequence) {
  return `BANKACC-${entity}-${pad(sequence, 3)}`;
}

function ledgerId(i) {
  return `LED-2026-${pad(i, 8)}`;
}

function cashFlowId(i) {
  return `CF-2026-${pad(i, 6)}`;
}

async function insertBatches(model, records) {
  for (
    let i = 0;
    i < records.length;
    i += config.batchSize
  ) {
    await model.createMany({
      data: records.slice(i, i + config.batchSize),
    });

    console.log(
      `${model.name}: ${Math.min(i + config.batchSize, records.length)} / ${records.length}`
    );
  }
}

async function resetDatabase() {
  console.log("Clearing previous generated records...");

  const models = [
    prisma.forecastComparison,
    prisma.forecastRunLine,
    prisma.forecastRunItem,
    prisma.actualCashFlow,
    prisma.scenarioAdjustment,
    prisma.accountBalanceSnapshot,
    prisma.entityEvent,
    prisma.auditEvent,
    prisma.forecastRun,
    prisma.cashFlowForecast,
    prisma.currencyRate,
    prisma.ledgerEntry,
    prisma.receivable,
    prisma.payable,
    prisma.liquidityScenario,
    prisma.bankAccount,
    prisma.legalEntity,
  ];

  for (const model of models) {
    await model.deleteMany();
  }
}

async function generateEntities() {
  const entities = Array.from(
    { length: config.scale.entities },
    (_, index) => ({
      id: entityId(index + 1),
      name: `Synthetic Corporation ${index + 1}`,
      code: `CORP-${pad(index + 1, 3)}`,
      country: pick(["India", "USA", "UK", "Germany", "Japan"]),
      baseCurrency: pick(currencies),
      status: "ACTIVE",
    })
  );

  await insertBatches(prisma.legalEntity, entities);

  return entities;
}

async function generateAccounts(entities) {
  const accounts = [];

  for (const entity of entities) {
    for (
      let sequence = 1;
      sequence <= config.scale.accountsPerEntity;
      sequence++
    ) {
      accounts.push({
        id: accountId(entity.id, sequence),
        entityId: entity.id,
        accountSequence: sequence,
        bankName: pick([
          "Global Commercial Bank",
          "National Trust Bank",
          "Continental Bank",
          "Metro Finance Bank",
        ]),
        accountNumberMasked: `XXXX${pad(integer(1000, 9999), 4)}`,
        currency: currencies[sequence - 1],
        openingBalance: money(100000, 10000000),
        openingBalanceDate: startDate,
        status: "ACTIVE",
      });
    }
  }

  await insertBatches(prisma.bankAccount, accounts);

  return accounts;
}


async function generateLedger(accounts) {
  const records = [];

  for (let i = 1; i <= config.scale.ledgerEntries; i++) {
    const account = pick(accounts);

    const entryType = pick([
      "RECEIPT",
      "PAYMENT",
      "TRANSFER",
      "ADJUSTMENT",
      "FEE",
    ]);

    let direction;

    // Derive direction from the transaction type.
    if (entryType === "RECEIPT") {
      direction = "INFLOW";
    } else if (
      entryType === "PAYMENT" ||
      entryType === "FEE"
    ) {
      direction = "OUTFLOW";
    } else {
      // Transfers and adjustments can move either way
      // from the perspective of an individual account.
      direction = rng() > 0.5 ? "INFLOW" : "OUTFLOW";
    }

    records.push({
      id: ledgerId(i),
      bankAccountId: account.id,
      entryDate: dateAt(randomDateOffset()),
      entryType,
      direction,
      amount: money(100, 250000),
      currency: account.currency,
      reference: `TXN-${pad(i, 8)}`,
      description: "Synthetic financial transaction",
    });
  }

  await insertBatches(prisma.ledgerEntry, records);
}


async function generateReceivables(entities) {
  const records = [];

  for (let i = 1; i <= config.scale.receivables; i++) {
    const entity = pick(entities);
    const issueDate = dateAt(randomDateOffset());
    const dueDate = new Date(issueDate);
    dueDate.setUTCDate(dueDate.getUTCDate() + integer(15, 60));

    const expectedDate = new Date(dueDate);

    // A subset of receipts is deliberately delayed.
    if (i % 10 === 0) {
      expectedDate.setUTCDate(
        expectedDate.getUTCDate() + integer(3, 15)
      );
    }

    records.push({
      id: `REC-2026-${pad(i, 6)}`,
      entityId: entity.id,
      invoiceNumber: `INV-REC-${pad(i, 6)}`,
      customerName: `Customer ${pad(i, 5)}`,
      currency: pick(currencies),
      amount: money(5000, 500000),
      issueDate,
      dueDate,
      expectedDate,
      status: "PENDING",
    });
  }

  await insertBatches(prisma.receivable, records);

  return records;
}

async function generatePayables(entities) {
  const records = [];

  for (let i = 1; i <= config.scale.payables; i++) {
    const entity = pick(entities);
    const issueDate = dateAt(randomDateOffset());
    const dueDate = new Date(issueDate);
    dueDate.setUTCDate(dueDate.getUTCDate() + integer(10, 45));

    records.push({
      id: `PAY-2026-${pad(i, 6)}`,
      entityId: entity.id,
      invoiceNumber: `INV-PAY-${pad(i, 6)}`,
      supplierName: `Supplier ${pad(i, 5)}`,
      currency: pick(currencies),
      amount: money(2000, 350000),
      issueDate,
      dueDate,
      expectedDate: dueDate,
      status: "PENDING",
    });
  }

  await insertBatches(prisma.payable, records);

  return records;
}

async function generateCurrencyRates() {
  const records = [];

  // Currency convention: one unit of baseCurrency
  // equals rate units of quoteCurrency.
  const rates = {
    INR: 1,
    USD: 85,
    EUR: 98,
    GBP: 112,
    JPY: 0.57,
  };

 for (let day = 0; day < config.fxCoverageDays; day++) {
    for (const currency of currencies) {
      if (currency === "INR") continue;

      const movement = random(-0.025, 0.025);

      records.push({
        id: `FX-${currency}-INR-${pad(day + 1, 4)}`,
        baseCurrency: currency,
        quoteCurrency: "INR",
        rate: Number(
          (rates[currency] * (1 + movement)).toFixed(8)
        ),
        effectiveDate: dateAt(day),
        source: "SYNTHETIC_SEEDED",
      });
    }
  }

  await insertBatches(prisma.currencyRate, records);
}

async function generateCashFlows(receivables, payables, accounts) {
  const accountMap = new Map();

  for (const account of accounts) {
    if (!accountMap.has(account.entityId)) {
      accountMap.set(account.entityId, []);
    }

    accountMap.get(account.entityId).push(account);
  }

  const records = [];

  for (let i = 0; i < receivables.length; i++) {
    const item = receivables[i];
    const account = accountMap
  .get(item.entityId)
  .find((acc) => acc.currency === item.currency);

if (!account) {
  throw new Error(`No matching account for ${item.currency}`);
}

    records.push({
      id: cashFlowId(i + 1),
      entityId: item.entityId,
      bankAccountId: account.id,
      receivableId: item.id,
      flowType: "INFLOW",
      amount: item.amount,
      currency: item.currency,
      expectedDate: item.expectedDate,
      status: "SCHEDULED",
      sourceReference: item.invoiceNumber,
      dedupeKey: `REC-${item.id}`,
      description: "Expected customer receipt",
    });
  }

  for (let i = 0; i < payables.length; i++) {
    const item = payables[i];
   const account = accountMap
  .get(item.entityId)
  .find((acc) => acc.currency === item.currency);

if (!account) {
  throw new Error(`No matching account for ${item.currency}`);
}

    records.push({
      id: cashFlowId(receivables.length + i + 1),
      entityId: item.entityId,
      bankAccountId: account.id,
      payableId: item.id,
      flowType: "OUTFLOW",
      amount: item.amount,
      currency: item.currency,
      expectedDate: item.expectedDate,
      status: "SCHEDULED",
      sourceReference: item.invoiceNumber,
      dedupeKey: `PAY-${item.id}`,
      description: "Expected supplier payment",
    });
  }

  await insertBatches(prisma.cashFlowForecast, records);

  return records;
}


async function generateActualCashFlows(cashFlows) {
  const actualRecords = [];

  const cutoffDate = new Date(
    config.actuals.cutoffDate + "T00:00:00.000Z"
  );

  if (
  Number.isNaN(cutoffDate.getTime()) ||
  cutoffDate < startDate ||
  cutoffDate > endDate
) {
  throw new Error("Invalid actuals cutoff date.");
}

  const maxDelay = config.actuals.maxSettlementDelayDays;
  const settlementInterval = config.actuals.settlementInterval;

  if (maxDelay < 0 || settlementInterval < 2) {
    throw new Error("Invalid actual settlement configuration.");
  }

  for (let i = 0; i < cashFlows.length; i++) {
    const flow = cashFlows[i];
    const sequence = i + 1;

    // Deterministic settlement rule:
    // Every Nth forecast is not settled.
    if (sequence % settlementInterval === 0) {
      continue;
    }

    const delayDays = sequence % (maxDelay + 1);
    const actualDate = addDays(flow.expectedDate, delayDays);

    // Do not create actuals beyond the historical cutoff.
    if (actualDate > cutoffDate) {
      continue;
    }

    // Deterministic amount variation between 97% and 103%.
    const amountMultiplier =
      0.97 + (sequence % 7) * 0.01;

    const actualAmount = Number(
      (Number(flow.amount) * amountMultiplier).toFixed(4)
    );

    actualRecords.push({
      id: `ACT-2026-${pad(actualRecords.length + 1, 8)}`,
      bankAccountId: flow.bankAccountId,
      cashFlowForecastId: flow.id,
      actualDate,
      flowType: flow.flowType,
      amount: actualAmount,
      currency: flow.currency,
      reference: `ACTUAL-${flow.id}`,
    });
  }

  await insertBatches(prisma.actualCashFlow, actualRecords);

  console.log(
    `Actual cash flows generated: ${actualRecords.length}`
  );

  return actualRecords;
}


async function generateScenarios() {
  const scenarios = [
    {
      id: "SCENARIO-BASE",
      name: "Base Scenario",
      code: "BASE",
      scenarioType: "BASE",
      assumptions: {
        receiptDelayDays: 0,
        receiptMultiplier: 1,
        paymentMultiplier: 1,
      },
    },
    {
      id: "SCENARIO-DELAYED",
      name: "Delayed Receipt Scenario",
      code: "DELAYED",
      scenarioType: "DELAYED_RECEIPT",
      assumptions: {
        receiptDelayDays: 7,
        receiptMultiplier: 1,
        paymentMultiplier: 1,
      },
    },
    {
      id: "SCENARIO-STRESS",
      name: "Stress Scenario",
      code: "STRESS",
      scenarioType: "STRESS",
      assumptions: {
        receiptDelayDays: 15,
        receiptMultiplier: 0.7,
        paymentMultiplier: 1.2,
      },
    },
  ];

  await insertBatches(prisma.liquidityScenario, scenarios);
}

async function main() {
  if (process.argv.includes("--reset")) {
    await resetDatabase();
  } else {
    const existing = await prisma.legalEntity.count();

    if (existing > 0) {
      throw new Error(
        "Database already contains entities. Use --reset only if you intend to regenerate all project data."
      );
    }
  }

  console.log("Starting synthetic data generation...");
  console.log("Fixed seed:", config.seed);

  const entities = await generateEntities();
  const accounts = await generateAccounts(entities);

  await generateLedger(accounts);

  const receivables = await generateReceivables(entities);
  const payables = await generatePayables(entities);

  await generateCurrencyRates();

  const cashFlows = await generateCashFlows(
  receivables,
  payables,
  accounts
);

const actualFlows = await generateActualCashFlows(cashFlows);

await generateScenarios();

  console.log("Synthetic baseline generated successfully.");

  console.log({
    entities: await prisma.legalEntity.count(),
    accounts: await prisma.bankAccount.count(),
    ledgerEntries: await prisma.ledgerEntry.count(),
    receivables: await prisma.receivable.count(),
    payables: await prisma.payable.count(),
    cashFlows: await prisma.cashFlowForecast.count(),
    currencyRates: await prisma.currencyRate.count(),
    scenarios: await prisma.liquidityScenario.count(),
  });
}

main()
  .catch((error) => {
    console.error("Generation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
