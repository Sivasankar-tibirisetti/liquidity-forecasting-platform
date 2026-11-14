const prisma = require("../config/prisma");
const { calculateCashPosition } = require("./cashPosition.engine");

const VALID_SCENARIOS = [
  "BASE",
  "DELAYED_RECEIPT",
  "STRESS",
];

function dateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function normalizeAssumptions(assumptions = {}) {
  const values = {
    receiptDelayDays: Number(assumptions.receiptDelayDays ?? 0),
    receiptMultiplier: Number(assumptions.receiptMultiplier ?? 1),
    paymentMultiplier: Number(assumptions.paymentMultiplier ?? 1),
  };

  if (
    !Number.isInteger(values.receiptDelayDays) ||
    values.receiptDelayDays < 0 ||
    !Number.isFinite(values.receiptMultiplier) ||
    values.receiptMultiplier < 0 ||
    !Number.isFinite(values.paymentMultiplier) ||
    values.paymentMultiplier < 0
  ) {
    throw new Error("Invalid scenario assumptions");
  }

  return values;
}

function getScenarioAdjustment(flow, assumptions) {
  if (flow.flowType === "INFLOW") {
    return {
      delayDays: assumptions.receiptDelayDays,
      multiplier: assumptions.receiptMultiplier,
    };
  }

  if (flow.flowType === "OUTFLOW") {
    return {
      delayDays: 0,
      multiplier: assumptions.paymentMultiplier,
    };
  }

  throw new Error(`Unsupported cash flow type: ${flow.flowType}`);
}

async function generateAccountForecast({
  bankAccountId,
  scenarioType = "BASE",
  assumptions = {},
  startDate,
  endDate,
}) {
  if (!VALID_SCENARIOS.includes(scenarioType)) {
    throw new Error(`Invalid scenario type: ${scenarioType}`);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (
    !startDate ||
    !endDate ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
    throw new Error("A valid startDate and endDate are required");
  }

  const scenarioAssumptions = normalizeAssumptions(assumptions);

  const account = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
  });

  if (!account) {
    throw new Error(`Bank account not found: ${bankAccountId}`);
  }

  const openingPosition = await calculateCashPosition(
    bankAccountId,
    start
  );

  const flows = await prisma.cashFlowForecast.findMany({
    where: {
      bankAccountId,
      expectedDate: {
        gt: start,
        lte: end,
      },
      status: {
        in: ["SCHEDULED", "CONFIRMED"],
      },
    },
    orderBy: {
      expectedDate: "asc",
    },
  });

  const dailyTotals = new Map();
  const forecastLines = [];

  for (const flow of flows) {
    const adjustment = getScenarioAdjustment(
      flow,
      scenarioAssumptions
    );

    const adjustedDate = addDays(
      flow.expectedDate,
      adjustment.delayDays
    );

    const adjustedAmount =
      Number(flow.amount) * adjustment.multiplier;

    const isIncluded = adjustedDate <= end;

    forecastLines.push({
      cashFlowForecastId: flow.id,
      originalDate: flow.expectedDate,
      adjustedDate,
      originalAmount: Number(flow.amount),
      adjustedAmount,
      originalCurrency: flow.currency,
      inclusionStatus: isIncluded ? "INCLUDED" : "EXCLUDED",
      exclusionReason: isIncluded
        ? null
        : "Adjusted cash flow date falls outside forecast horizon",
    });

    if (!isIncluded) {
      continue;
    }

    const key = dateKey(adjustedDate);

    if (!dailyTotals.has(key)) {
      dailyTotals.set(key, {
        inflows: 0,
        outflows: 0,
        transactionCount: 0,
      });
    }

    const day = dailyTotals.get(key);

    if (flow.flowType === "INFLOW") {
      day.inflows += adjustedAmount;
    } else {
      day.outflows += adjustedAmount;
    }

    day.transactionCount++;
  }

  const results = [];
  let runningBalance = Number(openingPosition.closingBalance);

  for (
    let current = new Date(start);
    current <= end;
    current = addDays(current, 1)
  ) {
    const key = dateKey(current);

    const day = dailyTotals.get(key) || {
      inflows: 0,
      outflows: 0,
      transactionCount: 0,
    };

    const openingBalance = runningBalance;

    runningBalance =
      openingBalance + day.inflows - day.outflows;

    results.push({
      bankAccountId,
      forecastDate: new Date(current),
      scenarioType,
      currency: account.currency,
      openingBalance,
      totalInflows: day.inflows,
      totalOutflows: day.outflows,
      closingBalance: runningBalance,
      transactionCount: day.transactionCount,
      isLiquidityShortfall: runningBalance < 0,
    });
  }

  return {
    bankAccountId,
    entityId: account.entityId,
    currency: account.currency,
    scenarioType,
    assumptions: scenarioAssumptions,
    startDate: start,
    endDate: end,
    openingBalance: Number(openingPosition.closingBalance),
    closingBalance: runningBalance,
    minimumBalance: Math.min(
      ...results.map((item) => item.closingBalance)
    ),
    shortfallDays: results.filter(
      (item) => item.isLiquidityShortfall
    ).length,
    dailyForecast: results,
    forecastLines,
  };
}

module.exports = {
  generateAccountForecast,
};