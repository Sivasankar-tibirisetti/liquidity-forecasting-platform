
const express = require("express");
const { randomUUID } = require("crypto");
const {
  loadFxRateMap,
  getFxRate,
  convertAmount,
} = require("../engines/fx.engine");

const prisma = require("../config/prisma");

const {
  generateAccountForecast,
} = require("../engines/forecast.engine");

const router = express.Router();

// GET /api/forecasts/scenarios
router.get("/scenarios", async (req, res, next) => {
  try {
    const scenarios = await prisma.liquidityScenario.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });

    res.json({
      success: true,
      count: scenarios.length,
      data: scenarios,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/forecasts/run
router.post("/run", async (req, res, next) => {
  let forecastRunId;

  try {
    const {
      scenarioCode,
      asOfDate,
      forecastDays = 30,
      reportingCurrency = "INR",
    } = req.body;

    if (!scenarioCode || !asOfDate) {
      return res.status(400).json({
        success: false,
        message: "scenarioCode and asOfDate are required",
      });
    }

    if (
      !Number.isInteger(forecastDays) ||
      forecastDays < 1 ||
      forecastDays > 90
    ) {
      return res.status(400).json({
        success: false,
        message: "forecastDays must be an integer between 1 and 90",
      });
    }

    const startDate = new Date(`${asOfDate}T00:00:00.000Z`);

    if (Number.isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid asOfDate",
      });
    }

    const scenario = await prisma.liquidityScenario.findUnique({
      where: { code: scenarioCode },
    });

    if (!scenario || !scenario.isActive) {
      return res.status(404).json({
        success: false,
        message: "Active scenario not found",
      });
    }

    const latestRun = await prisma.forecastRun.findFirst({
      where: { scenarioId: scenario.id },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const version = (latestRun?.version || 0) + 1;

    const endDate = new Date(startDate);
    endDate.setUTCDate(
  endDate.getUTCDate() + forecastDays - 1
);

    const run = await prisma.forecastRun.create({
      data: {
        id: `RUN-${randomUUID()}`,
        scenarioId: scenario.id,
        version,
        asOfDate: startDate,
        cutoffAt: new Date(),
        reportingCurrency,
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    forecastRunId = run.id;

    const accounts = await prisma.bankAccount.findMany({
      where: { status: "ACTIVE" },
      orderBy: { id: "asc" },
    });

    const fxRateMap = await loadFxRateMap({
  currencies: accounts.map((account) => account.currency),
  reportingCurrency,
  startDate,
  endDate,
});

const consolidatedByDate = new Map();

const forecastItems = [];
const forecastLines = [];

for (const account of accounts) {
  const result = await generateAccountForecast({
    bankAccountId: account.id,
    scenarioType: scenario.scenarioType,
    assumptions: scenario.assumptions,
    startDate,
    endDate,
  });

  // Save daily forecast records
 for (const day of result.dailyForecast) {
  const fxRate = getFxRate(
    fxRateMap,
    day.currency,
    day.forecastDate
  );

  const closingBalanceReporting = convertAmount(
    day.closingBalance,
    fxRate
  );

  const inflowsReporting = convertAmount(
    day.totalInflows,
    fxRate
  );

  const outflowsReporting = convertAmount(
    day.totalOutflows,
    fxRate
  );

  forecastItems.push({
    id: `ITEM-${randomUUID()}`,
    forecastRunId: run.id,
    bankAccountId: account.id,
    forecastDate: day.forecastDate,
    currency: day.currency,
    openingBalance: day.openingBalance.toFixed(4),
    totalInflows: day.totalInflows.toFixed(4),
    totalOutflows: day.totalOutflows.toFixed(4),
    closingBalance: day.closingBalance.toFixed(4),
    reportingCurrency,
    fxRateUsed: fxRate.toFixed(8),
    closingBalanceReporting: closingBalanceReporting.toFixed(4),
  });

  const key = day.forecastDate.toISOString().slice(0, 10);

  if (!consolidatedByDate.has(key)) {
    consolidatedByDate.set(key, {
      forecastDate: key,
      reportingCurrency,
      totalInflows: 0,
      totalOutflows: 0,
      closingBalance: 0,
    });
  }

  const consolidated = consolidatedByDate.get(key);

  consolidated.totalInflows += inflowsReporting;
  consolidated.totalOutflows += outflowsReporting;
  consolidated.closingBalance += closingBalanceReporting;
}

  // Save underlying cash-flow audit records
  for (const line of result.forecastLines) {
   const lineFxRate =
  line.inclusionStatus === "INCLUDED"
    ? getFxRate(
        fxRateMap,
        line.originalCurrency,
        line.adjustedDate
      )
    : null;

    forecastLines.push({
      id: `LINE-${randomUUID()}`,
      forecastRunId: run.id,
      cashFlowForecastId: line.cashFlowForecastId,
      originalDate: line.originalDate,
      adjustedDate: line.adjustedDate,
      originalAmount: line.originalAmount.toFixed(4),
      adjustedAmount: line.adjustedAmount.toFixed(4),
      originalCurrency: line.originalCurrency,
      reportingAmount:  lineFxRate === null
    ? null
    : convertAmount(
        line.adjustedAmount,
        lineFxRate
      ).toFixed(4),
      inclusionStatus: line.inclusionStatus,
      exclusionReason: line.exclusionReason,
    });
  }
}

// Save both record types together
await prisma.$transaction([
  prisma.forecastRunItem.createMany({
    data: forecastItems,
  }),
  prisma.forecastRunLine.createMany({
    data: forecastLines,
  }),
]);



    await prisma.forecastRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      message: "Forecast generated successfully",
      data: {
        forecastRunId: run.id,
        scenario: scenario.code,
        version,
        asOfDate: startDate,
        endDate,
        accountCount: accounts.length,
        forecastItemCount: forecastItems.length,
        reportingCurrency,
        note: "Daily account balances and consolidated liquidity are converted using historical FX rates.",
        consolidatedDailySummary: Array.from(
  consolidatedByDate.values()
).map((day) => ({
  forecastDate: day.forecastDate,
  reportingCurrency: day.reportingCurrency,
  totalInflows: Number(day.totalInflows.toFixed(4)),
  totalOutflows: Number(day.totalOutflows.toFixed(4)),
  closingBalance: Number(day.closingBalance.toFixed(4)),
})),
      },
    });
  } catch (error) {
    if (forecastRunId) {
      await prisma.forecastRun.update({
        where: { id: forecastRunId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage: error.message,
        },
      }).catch(() => {});
    }

    next(error);
  }
});


 // GET /api/forecasts/latest?scenarioCode=BASE
router.get("/latest", async (req, res, next) => {
  try {
    const scenarioCode = req.query.scenarioCode || "BASE";

    const latestRun = await prisma.forecastRun.findFirst({
      where: {
        status: "COMPLETED",
        scenario: {
          code: scenarioCode,
        },
      },
      orderBy: [
        { completedAt: "desc" },
        { version: "desc" },
      ],
      select: {
        id: true,
        version: true,
        asOfDate: true,
        reportingCurrency: true,
        status: true,
        completedAt: true,
        scenario: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    if (!latestRun) {
      return res.status(404).json({
        success: false,
        message: `No completed forecast found for ${scenarioCode}`,
      });
    }

    res.json({
      success: true,
      data: latestRun,
    });
  } catch (error) {
    next(error);
  }
});



// GET /api/forecasts/:id/summary
// Returns consolidated daily liquidity using saved INR-converted records.
router.get("/:id/summary", async (req, res, next) => {
  try {
    const forecast = await prisma.forecastRun.findUnique({
      where: { id: req.params.id },
      include: {
        scenario: {
          select: {
            code: true,
            name: true,
            scenarioType: true,
          },
        },
      },
    });

    if (!forecast) {
      return res.status(404).json({
        success: false,
        message: "Forecast run not found",
      });
    }

    if (forecast.status !== "COMPLETED") {
      return res.status(409).json({
        success: false,
        message: "Only completed forecast runs can be summarized",
      });
    }

    const items = await prisma.forecastRunItem.findMany({
      where: { forecastRunId: forecast.id },
      select: {
        bankAccountId: true,
        forecastDate: true,
        currency: true,
        reportingCurrency: true,
        totalInflows: true,
        totalOutflows: true,
        fxRateUsed: true,
        closingBalanceReporting: true,
      },
      orderBy: [
        { forecastDate: "asc" },
        { bankAccountId: "asc" },
      ],
    });

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No forecast records found for this run",
      });
    }

    const dailyMap = new Map();
    const accountIds = new Set();

    for (const item of items) {
      if (
        item.closingBalanceReporting === null ||
        item.fxRateUsed === null
      ) {
        throw new Error(
          `Missing FX conversion for account ${item.bankAccountId}`
        );
      }

      accountIds.add(item.bankAccountId);

      const dateKey = item.forecastDate.toISOString().slice(0, 10);
      const fxRate = Number(item.fxRateUsed);

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          forecastDate: dateKey,
          reportingCurrency: forecast.reportingCurrency,
          totalInflows: 0,
          totalOutflows: 0,
          closingBalance: 0,
        });
      }

      const daily = dailyMap.get(dateKey);

      daily.totalInflows += Number(item.totalInflows) * fxRate;
      daily.totalOutflows += Number(item.totalOutflows) * fxRate;
      daily.closingBalance += Number(item.closingBalanceReporting);
    }

    const dailySummary = Array.from(dailyMap.values()).map((day) => ({
      forecastDate: day.forecastDate,
      reportingCurrency: day.reportingCurrency,
      totalInflows: Number(day.totalInflows.toFixed(4)),
      totalOutflows: Number(day.totalOutflows.toFixed(4)),
      netCashFlow: Number(
        (day.totalInflows - day.totalOutflows).toFixed(4)
      ),
      closingBalance: Number(day.closingBalance.toFixed(4)),
    }));

    const firstDay = dailySummary[0];
    const lastDay = dailySummary[dailySummary.length - 1];

    const totalInflows = dailySummary.reduce(
      (sum, day) => sum + day.totalInflows,
      0
    );

    const totalOutflows = dailySummary.reduce(
      (sum, day) => sum + day.totalOutflows,
      0
    );

    res.json({
      success: true,
      data: {
        forecastRunId: forecast.id,
        scenario: forecast.scenario.code,
        scenarioName: forecast.scenario.name,
        scenarioType: forecast.scenario.scenarioType,
        version: forecast.version,
        status: forecast.status,
        asOfDate: forecast.asOfDate,
        reportingCurrency: forecast.reportingCurrency,
        accountCount: accountIds.size,
        forecastItemCount: items.length,
        forecastDays: dailySummary.length,
        openingLiquidity: firstDay.closingBalance,
        latestProjectedLiquidity: lastDay.closingBalance,
        totalInflows: Number(totalInflows.toFixed(4)),
        totalOutflows: Number(totalOutflows.toFixed(4)),
        netCashFlow: Number(
          (totalInflows - totalOutflows).toFixed(4)
        ),
        dailySummary,
      },
    });
  } catch (error) {
    next(error);
  }
});


// GET /api/forecasts/:id
router.get("/:id", async (req, res, next) => {
  try {
    const forecast = await prisma.forecastRun.findUnique({
      where: { id: req.params.id },
      include: {
        scenario: true,
        items: {
          orderBy: [
            { bankAccountId: "asc" },
            { forecastDate: "asc" },
          ],
        },
      },
    });

    if (!forecast) {
      return res.status(404).json({
        success: false,
        message: "Forecast run not found",
      });
    }

    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
