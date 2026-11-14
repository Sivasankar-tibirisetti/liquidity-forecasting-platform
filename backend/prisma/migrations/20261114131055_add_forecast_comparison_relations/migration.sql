/*
  Warnings:

  - A unique constraint covering the columns `[forecastRunId,bankAccountId,comparisonDate]` on the table `ForecastComparison` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ForecastComparison_forecastRunId_bankAccountId_comparisonDa_key" ON "ForecastComparison"("forecastRunId", "bankAccountId", "comparisonDate");

-- AddForeignKey
ALTER TABLE "ForecastComparison" ADD CONSTRAINT "ForecastComparison_forecastRunId_fkey" FOREIGN KEY ("forecastRunId") REFERENCES "ForecastRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastComparison" ADD CONSTRAINT "ForecastComparison_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
