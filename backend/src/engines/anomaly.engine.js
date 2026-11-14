
const prisma = require("../config/prisma");

async function detectAccountAnomalies(bankAccountId, startDate, endDate) {
  const account = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
  });

  if (!account) {
    throw new Error(`Bank account not found: ${bankAccountId}`);
  }

  const [ledgerEntries, snapshots] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: {
        bankAccountId,
        entryDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: {
        entryDate: "asc",
      },
    }),

    prisma.accountBalanceSnapshot.findMany({
      where: {
        bankAccountId,
        snapshotDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: {
        snapshotDate: "asc",
      },
    }),
  ]);

  const anomalies = [];

  // Detect unusually large transactions.
  const amounts = ledgerEntries.map((entry) =>
    Number(entry.amount)
  );

  const averageAmount =
    amounts.length > 0
      ? amounts.reduce((sum, value) => sum + value, 0) /
        amounts.length
      : 0;

  const largeTransactionThreshold = averageAmount * 3;

  for (const entry of ledgerEntries) {
    const amount = Number(entry.amount);

    if (
      averageAmount > 0 &&
      amount > largeTransactionThreshold
    ) {
      anomalies.push({
        type: "UNUSUAL_TRANSACTION",
        severity: "MEDIUM",
        date: entry.entryDate,
        reference: entry.reference,
        amount,
        currency: entry.currency,
        description: "Transaction exceeds three times the average transaction amount.",
      });
    }
  }

  // Detect negative reconciled account balances.
  for (const snapshot of snapshots) {
    const balance = Number(snapshot.calculatedClosingBalance);

    if (balance < 0) {
      anomalies.push({
        type: "NEGATIVE_BALANCE",
        severity: "HIGH",
        date: snapshot.snapshotDate,
        amount: balance,
        currency: account.currency,
        description: "Account closing balance is negative.",
      });
    }

    // Detect statement reconciliation differences.
    if (
      snapshot.reconciliationDifference !== null &&
      Math.abs(Number(snapshot.reconciliationDifference)) > 0.01
    ) {
      anomalies.push({
        type: "RECONCILIATION_MISMATCH",
        severity: "HIGH",
        date: snapshot.snapshotDate,
        amount: Number(snapshot.reconciliationDifference),
        currency: account.currency,
        description: "Calculated balance differs from the bank statement.",
      });
    }
  }

  return {
    bankAccountId,
    entityId: account.entityId,
    currency: account.currency,
    totalAnomalies: anomalies.length,
    anomalies,
  };
}

module.exports = {
  detectAccountAnomalies,
};
