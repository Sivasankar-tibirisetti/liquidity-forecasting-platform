
const prisma = require("../src/config/prisma");
const config = require("../../data-generator/config/generator.config");

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function pad(value, length) {
  return String(value).padStart(length, "0");
}

async function main() {
  // Safety check: never overwrite or regenerate existing actuals.
  const existingActualCount = await prisma.actualCashFlow.count();

  if (existingActualCount > 0) {
    throw new Error(
      `Found ${existingActualCount} existing actual records. Stopping safely.`
    );
  }

  const cutoffDate = new Date(
    `${config.actuals.cutoffDate}T00:00:00.000Z`
  );

  const maxDelay = config.actuals.maxSettlementDelayDays;
  const settlementInterval = config.actuals.settlementInterval;

  if (
    Number.isNaN(cutoffDate.getTime()) ||
    !Number.isInteger(maxDelay) ||
    maxDelay < 0 ||
    !Number.isInteger(settlementInterval) ||
    settlementInterval < 2
  ) {
    throw new Error("Invalid actual settlement configuration.");
  }

  console.log("Reading existing forecast cash flows...");

  const cashFlows = await prisma.cashFlowForecast.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      bankAccountId: true,
      expectedDate: true,
      flowType: true,
      amount: true,
      currency: true,
    },
  });

  if (cashFlows.length === 0) {
    throw new Error("No forecast cash flows found.");
  }

  const actualRecords = [];

  for (let i = 0; i < cashFlows.length; i++) {
    const flow = cashFlows[i];
    const sequence = i + 1;

    // Every Nth forecast remains unsettled.
    if (sequence % settlementInterval === 0) {
      continue;
    }

    const delayDays = sequence % (maxDelay + 1);
    const actualDate = addDays(flow.expectedDate, delayDays);

    // Exclude actuals beyond the historical cutoff.
    if (actualDate > cutoffDate) {
      continue;
    }

    const amountMultiplier = 0.97 + (sequence % 7) * 0.01;

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

  console.log("Eligible actual records:", actualRecords.length);

  for (
    let i = 0;
    i < actualRecords.length;
    i += config.batchSize
  ) {
    const batch = actualRecords.slice(i, i + config.batchSize);

    await prisma.actualCashFlow.createMany({
      data: batch,
    });

    console.log(
      `Inserted ${Math.min(i + config.batchSize, actualRecords.length)} / ${actualRecords.length}`
    );
  }

  console.log("Actual cash-flow generation completed.");

  console.log({
    forecastCashFlows: cashFlows.length,
    generatedActualCashFlows: await prisma.actualCashFlow.count(),
    cutoffDate: config.actuals.cutoffDate,
  });
}

main()
  .catch((error) => {
    console.error("Actual generation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
