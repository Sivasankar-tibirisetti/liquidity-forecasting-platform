
const prisma = require("../src/config/prisma");

async function main() {
  const [
    forecastCount,
    actualCount,
    linkedActualCount,
    forecastDates,
    actualDates,
    forecastStatuses,
    flowTypes,
  ] = await Promise.all([
    prisma.cashFlowForecast.count(),
    prisma.actualCashFlow.count(),
    prisma.actualCashFlow.count({
      where: { cashFlowForecastId: { not: null } },
    }),
    prisma.cashFlowForecast.aggregate({
      _min: { expectedDate: true },
      _max: { expectedDate: true },
    }),
    prisma.actualCashFlow.aggregate({
      _min: { actualDate: true },
      _max: { actualDate: true },
    }),
    prisma.cashFlowForecast.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.cashFlowForecast.groupBy({
      by: ["flowType"],
      _count: { id: true },
    }),
  ]);

  const sample = await prisma.actualCashFlow.findMany({
    take: 5,
    orderBy: { actualDate: "asc" },
    include: {
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
  });

  console.log({
    forecastCount,
    actualCount,
    linkedActualCount,
    forecastDateRange: forecastDates,
    actualDateRange: actualDates,
    forecastStatuses,
    flowTypes,
    sample,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
