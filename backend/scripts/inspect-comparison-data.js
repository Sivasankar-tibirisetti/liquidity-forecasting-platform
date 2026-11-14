
const prisma = require("../src/config/prisma");

async function main() {
  const runs = await prisma.forecastRun.findMany({
    orderBy: [
      { scenarioId: "asc" },
      { version: "desc" },
    ],
    select: {
      id: true,
      scenarioId: true,
      version: true,
      asOfDate: true,
      cutoffAt: true,
      status: true,
      items: {
        select: {
          forecastDate: true,
        },
      },
      lines: {
        select: {
          originalDate: true,
          adjustedDate: true,
          inclusionStatus: true,
        },
      },
    },
  });

  for (const run of runs) {
    const dates = run.lines.map((line) => line.adjustedDate);
    const included = run.lines.filter(
      (line) => line.inclusionStatus === "INCLUDED"
    );

    console.log({
      runId: run.id,
      scenarioId: run.scenarioId,
      version: run.version,
      status: run.status,
      asOfDate: run.asOfDate,
      cutoffAt: run.cutoffAt,
      forecastLineCount: run.lines.length,
      includedLineCount: included.length,
      earliestAdjustedDate: dates.length
        ? new Date(Math.min(...dates.map(Number))).toISOString().slice(0, 10)
        : null,
      latestAdjustedDate: dates.length
        ? new Date(Math.max(...dates.map(Number))).toISOString().slice(0, 10)
        : null,
    });
  }

  const actuals = await prisma.actualCashFlow.aggregate({
    _min: { actualDate: true },
    _max: { actualDate: true },
    _count: { _all: true },
  });

  console.log("Actual date range:", {
    count: actuals._count._all,
    earliest: actuals._min.actualDate,
    latest: actuals._max.actualDate,
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
