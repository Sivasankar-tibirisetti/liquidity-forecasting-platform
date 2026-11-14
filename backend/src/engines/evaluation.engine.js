
const prisma = require("../config/prisma");

function round(value, decimals = 4) {
  return Number(value.toFixed(decimals));
}

function signedAmount(amount, flowType) {
  const value = Number(amount);

  if (flowType === "INFLOW") return value;
  if (flowType === "OUTFLOW") return -value;

  throw new Error(`Unsupported flow type: ${flowType}`);
}

async function evaluateLinkedCashFlows() {
  const actuals = await prisma.actualCashFlow.findMany({
    where: {
      cashFlowForecastId: { not: null },
    },
    select: {
      id: true,
      bankAccountId: true,
      actualDate: true,
      flowType: true,
      amount: true,
      currency: true,
      cashFlowForecast: {
        select: {
          id: true,
          expectedDate: true,
          amount: true,
          currency: true,
          flowType: true,
        },
      },
    },
    orderBy: { actualDate: "asc" },
  });

  const groups = new Map();
  let skippedRecords = 0;

  for (const actual of actuals) {
    const forecast = actual.cashFlowForecast;

    if (!forecast) {
      skippedRecords++;
      continue;
    }

    if (
      actual.currency !== forecast.currency ||
      actual.flowType !== forecast.flowType
    ) {
      skippedRecords++;
      continue;
    }

    const date = new Date(forecast.expectedDate)
      .toISOString()
      .slice(0, 10);

    const key = `${actual.bankAccountId}|${date}`;

    if (!groups.has(key)) {
      groups.set(key, {
        bankAccountId: actual.bankAccountId,
        comparisonDate: new Date(`${date}T00:00:00.000Z`),
        currency: forecast.currency,
        forecastAmount: 0,
        actualAmount: 0,
        matchedTransactions: 0,
        actualDates: [],
      });
    }

    const group = groups.get(key);

    group.forecastAmount += signedAmount(
      forecast.amount,
      forecast.flowType
    );

    group.actualAmount += signedAmount(
      actual.amount,
      actual.flowType
    );

    group.matchedTransactions++;
    group.actualDates.push(actual.actualDate);
  }

  const comparisons = Array.from(groups.values()).map((group) => {
    const variance = group.actualAmount - group.forecastAmount;

    const variancePercent =
      group.actualAmount === 0
        ? null
        : (variance / Math.abs(group.actualAmount)) * 100;

    return {
      ...group,
      forecastAmount: round(group.forecastAmount),
      actualAmount: round(group.actualAmount),
      variance: round(variance),
      variancePercent:
        variancePercent === null ? null : round(variancePercent, 2),
      absoluteError: Math.abs(variance),
      squaredError: variance * variance,
    };
  });

  const count = comparisons.length;

  const absoluteErrorTotal = comparisons.reduce(
    (sum, item) => sum + item.absoluteError,
    0
  );

  const squaredErrorTotal = comparisons.reduce(
    (sum, item) => sum + item.squaredError,
    0
  );

  const biasTotal = comparisons.reduce(
    (sum, item) => sum + item.variance,
    0
  );

  const percentageErrors = comparisons
    .filter(
      (item) =>
        item.actualAmount !== 0 &&
        item.variancePercent !== null
    )
    .map((item) => Math.abs(item.variancePercent));

  const mape =
    percentageErrors.length > 0
      ? percentageErrors.reduce((sum, value) => sum + value, 0) /
        percentageErrors.length
      : null;

  return {
    generatedAt: new Date().toISOString(),
    evaluationMethod:
      "Matched transaction cohorts grouped by bank account and forecast expected date",
    currencyTreatment:
      "Amounts compared only within the original account currency; no cross-currency aggregation",
    matchedActualRecords: actuals.length - skippedRecords,
    skippedRecords,
    comparisonGroups: count,
    metrics: {
      MAE: count ? round(absoluteErrorTotal / count) : null,
      RMSE: count ? round(Math.sqrt(squaredErrorTotal / count)) : null,
      MAPE_percent: mape === null ? null : round(mape, 2),
      meanBias: count ? round(biasTotal / count) : null,
      totalBias: round(biasTotal),
      percentageErrorGroups: percentageErrors.length,
    },
    comparisons,
  };
}

module.exports = { evaluateLinkedCashFlows };
