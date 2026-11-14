
const prisma = require("../src/config/prisma");

async function main() {
  const cutoffDate = new Date("2026-11-14T23:59:59.999Z");

  const [
    totalActuals,
    linkedActuals,
    actualsAfterCutoff,
    missingAccounts,
    missingForecastLinks,
    duplicateForecastLinks,
  ] = await Promise.all([
    prisma.actualCashFlow.count(),

    prisma.actualCashFlow.count({
      where: { cashFlowForecastId: { not: null } },
    }),

    prisma.actualCashFlow.count({
      where: { actualDate: { gt: cutoffDate } },
    }),

    prisma.actualCashFlow.count({
      where: { bankAccountId: "" },
    }),

    prisma.actualCashFlow.count({
      where: { cashFlowForecastId: null },
    }),

    prisma.$queryRaw`
      SELECT COUNT(*)::int AS duplicate_groups
      FROM (
        SELECT "cashFlowForecastId"
        FROM "ActualCashFlow"
        WHERE "cashFlowForecastId" IS NOT NULL
        GROUP BY "cashFlowForecastId"
        HAVING COUNT(*) > 1
      ) duplicates
    `,
  ]);

  const duplicateGroups = duplicateForecastLinks[0].duplicate_groups;

  console.log({
    totalActuals,
    linkedActuals,
    actualsAfterCutoff,
    missingAccounts,
    missingForecastLinks,
    duplicateForecastLinkGroups: duplicateGroups,
  });

  if (
    totalActuals === 12486 &&
    linkedActuals === totalActuals &&
    actualsAfterCutoff === 0 &&
    missingAccounts === 0 &&
    missingForecastLinks === 0 &&
    duplicateGroups === 0
  ) {
    console.log("Basic actual-data integrity checks passed.");
  } else {
    console.log("Integrity verification needs investigation.");
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
