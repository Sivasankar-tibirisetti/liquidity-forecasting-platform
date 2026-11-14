
const prisma = require("../src/config/prisma");

async function main() {
  const result = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (
        WHERE fr.id IS NULL
      )::int AS missing_forecast_runs,
      COUNT(*) FILTER (
        WHERE ba.id IS NULL
      )::int AS missing_bank_accounts
    FROM "ForecastComparison" fc
    LEFT JOIN "ForecastRun" fr
      ON fr.id = fc."forecastRunId"
    LEFT JOIN "BankAccount" ba
      ON ba.id = fc."bankAccountId"
  `;

  const duplicates = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS duplicate_groups
    FROM (
      SELECT
        "forecastRunId",
        "bankAccountId",
        "comparisonDate"
      FROM "ForecastComparison"
      GROUP BY
        "forecastRunId",
        "bankAccountId",
        "comparisonDate"
      HAVING COUNT(*) > 1
    ) d
  `;

  console.log({
    ...result[0],
    duplicateGroups: duplicates[0].duplicate_groups,
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
