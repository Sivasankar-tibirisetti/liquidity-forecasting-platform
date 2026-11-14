-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'FROZEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "FlowType" AS ENUM ('INFLOW', 'OUTFLOW');

-- CreateEnum
CREATE TYPE "FlowStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ScenarioType" AS ENUM ('BASE', 'DELAYED_RECEIPT', 'STRESS');

-- CreateEnum
CREATE TYPE "ForecastStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('OPENING_BALANCE', 'RECEIPT', 'PAYMENT', 'TRANSFER', 'ADJUSTMENT', 'FEE');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('DELAY_DAYS', 'AMOUNT_MULTIPLIER', 'EXCLUDE_FLOW', 'ADDITIONAL_OUTFLOW');

-- CreateTable
CREATE TABLE "LegalEntity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "accountSequence" INTEGER NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumberMasked" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "openingBalance" DECIMAL(20,4) NOT NULL,
    "openingBalanceDate" DATE NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "entryDate" DATE NOT NULL,
    "postingDate" TIMESTAMP(3),
    "entryType" "LedgerEntryType" NOT NULL,
    "direction" "FlowType" NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receivable" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "expectedDate" DATE NOT NULL,
    "actualReceivedAt" TIMESTAMP(3),
    "actualAmount" DECIMAL(20,4),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payable" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "expectedDate" DATE NOT NULL,
    "actualPaidAt" TIMESTAMP(3),
    "actualAmount" DECIMAL(20,4),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencyRate" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rate" DECIMAL(20,8) NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurrencyRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashFlowForecast" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "receivableId" TEXT,
    "payableId" TEXT,
    "flowType" "FlowType" NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "expectedDate" DATE NOT NULL,
    "status" "FlowStatus" NOT NULL DEFAULT 'SCHEDULED',
    "sourceReference" TEXT,
    "dedupeKey" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashFlowForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiquidityScenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "scenarioType" "ScenarioType" NOT NULL,
    "description" TEXT,
    "assumptions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiquidityScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastRun" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "asOfDate" DATE NOT NULL,
    "cutoffAt" TIMESTAMP(3) NOT NULL,
    "reportingCurrency" TEXT NOT NULL,
    "status" "ForecastStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioAdjustment" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "cashFlowForecastId" TEXT NOT NULL,
    "adjustmentType" "AdjustmentType" NOT NULL,
    "delayDays" INTEGER,
    "amountMultiplier" DECIMAL(12,6),
    "description" TEXT,

    CONSTRAINT "ScenarioAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastRunItem" (
    "id" TEXT NOT NULL,
    "forecastRunId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "forecastDate" DATE NOT NULL,
    "currency" TEXT NOT NULL,
    "openingBalance" DECIMAL(20,4) NOT NULL,
    "totalInflows" DECIMAL(20,4) NOT NULL,
    "totalOutflows" DECIMAL(20,4) NOT NULL,
    "closingBalance" DECIMAL(20,4) NOT NULL,
    "reportingCurrency" TEXT NOT NULL,
    "fxRateUsed" DECIMAL(20,8),
    "closingBalanceReporting" DECIMAL(20,4),

    CONSTRAINT "ForecastRunItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastRunLine" (
    "id" TEXT NOT NULL,
    "forecastRunId" TEXT NOT NULL,
    "cashFlowForecastId" TEXT NOT NULL,
    "originalDate" DATE NOT NULL,
    "adjustedDate" DATE NOT NULL,
    "originalAmount" DECIMAL(20,4) NOT NULL,
    "adjustedAmount" DECIMAL(20,4) NOT NULL,
    "originalCurrency" TEXT NOT NULL,
    "reportingAmount" DECIMAL(20,4),
    "inclusionStatus" TEXT NOT NULL,
    "exclusionReason" TEXT,

    CONSTRAINT "ForecastRunLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActualCashFlow" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "cashFlowForecastId" TEXT,
    "actualDate" DATE NOT NULL,
    "flowType" "FlowType" NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActualCashFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountBalanceSnapshot" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "openingBalance" DECIMAL(20,4) NOT NULL,
    "ledgerInflows" DECIMAL(20,4) NOT NULL,
    "ledgerOutflows" DECIMAL(20,4) NOT NULL,
    "calculatedClosingBalance" DECIMAL(20,4) NOT NULL,
    "statementClosingBalance" DECIMAL(20,4),
    "reconciliationDifference" DECIMAL(20,4),
    "isReconciled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountBalanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastComparison" (
    "id" TEXT NOT NULL,
    "forecastRunId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "comparisonDate" DATE NOT NULL,
    "forecastAmount" DECIMAL(20,4) NOT NULL,
    "actualAmount" DECIMAL(20,4) NOT NULL,
    "variance" DECIMAL(20,4) NOT NULL,
    "variancePercent" DECIMAL(12,6),
    "varianceReason" TEXT,

    CONSTRAINT "ForecastComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "actor" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityEvent" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalEntity_code_key" ON "LegalEntity"("code");

-- CreateIndex
CREATE INDEX "BankAccount_entityId_idx" ON "BankAccount"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_entityId_accountSequence_key" ON "BankAccount"("entityId", "accountSequence");

-- CreateIndex
CREATE INDEX "LedgerEntry_bankAccountId_entryDate_idx" ON "LedgerEntry"("bankAccountId", "entryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Receivable_invoiceNumber_key" ON "Receivable"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Receivable_entityId_expectedDate_idx" ON "Receivable"("entityId", "expectedDate");

-- CreateIndex
CREATE UNIQUE INDEX "Payable_invoiceNumber_key" ON "Payable"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Payable_entityId_expectedDate_idx" ON "Payable"("entityId", "expectedDate");

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyRate_baseCurrency_quoteCurrency_effectiveDate_key" ON "CurrencyRate"("baseCurrency", "quoteCurrency", "effectiveDate");

-- CreateIndex
CREATE INDEX "CashFlowForecast_entityId_expectedDate_idx" ON "CashFlowForecast"("entityId", "expectedDate");

-- CreateIndex
CREATE INDEX "CashFlowForecast_dedupeKey_idx" ON "CashFlowForecast"("dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "LiquidityScenario_code_key" ON "LiquidityScenario"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ForecastRun_scenarioId_version_key" ON "ForecastRun"("scenarioId", "version");

-- CreateIndex
CREATE INDEX "ScenarioAdjustment_scenarioId_idx" ON "ScenarioAdjustment"("scenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ForecastRunItem_forecastRunId_bankAccountId_forecastDate_key" ON "ForecastRunItem"("forecastRunId", "bankAccountId", "forecastDate");

-- CreateIndex
CREATE UNIQUE INDEX "AccountBalanceSnapshot_bankAccountId_snapshotDate_key" ON "AccountBalanceSnapshot"("bankAccountId", "snapshotDate");

-- CreateIndex
CREATE INDEX "ForecastComparison_comparisonDate_idx" ON "ForecastComparison"("comparisonDate");

-- CreateIndex
CREATE INDEX "AuditEvent_aggregateType_aggregateId_idx" ON "AuditEvent"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "EntityEvent_entityId_occurredAt_idx" ON "EntityEvent"("entityId", "occurredAt");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payable" ADD CONSTRAINT "Payable_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowForecast" ADD CONSTRAINT "CashFlowForecast_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowForecast" ADD CONSTRAINT "CashFlowForecast_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowForecast" ADD CONSTRAINT "CashFlowForecast_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowForecast" ADD CONSTRAINT "CashFlowForecast_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "Payable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastRun" ADD CONSTRAINT "ForecastRun_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "LiquidityScenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioAdjustment" ADD CONSTRAINT "ScenarioAdjustment_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "LiquidityScenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioAdjustment" ADD CONSTRAINT "ScenarioAdjustment_cashFlowForecastId_fkey" FOREIGN KEY ("cashFlowForecastId") REFERENCES "CashFlowForecast"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastRunItem" ADD CONSTRAINT "ForecastRunItem_forecastRunId_fkey" FOREIGN KEY ("forecastRunId") REFERENCES "ForecastRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastRunItem" ADD CONSTRAINT "ForecastRunItem_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastRunLine" ADD CONSTRAINT "ForecastRunLine_forecastRunId_fkey" FOREIGN KEY ("forecastRunId") REFERENCES "ForecastRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastRunLine" ADD CONSTRAINT "ForecastRunLine_cashFlowForecastId_fkey" FOREIGN KEY ("cashFlowForecastId") REFERENCES "CashFlowForecast"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualCashFlow" ADD CONSTRAINT "ActualCashFlow_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualCashFlow" ADD CONSTRAINT "ActualCashFlow_cashFlowForecastId_fkey" FOREIGN KEY ("cashFlowForecastId") REFERENCES "CashFlowForecast"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountBalanceSnapshot" ADD CONSTRAINT "AccountBalanceSnapshot_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityEvent" ADD CONSTRAINT "EntityEvent_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
