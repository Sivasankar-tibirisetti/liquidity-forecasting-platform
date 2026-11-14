
const prisma = require("../config/prisma");

async function reconcileAccountBalance(bankAccountId, snapshotDate, statementClosingBalance = null) {
  const account = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
  });

  if (!account) {
    throw new Error(`Bank account not found: ${bankAccountId}`);
  }

  const date = new Date(snapshotDate);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid snapshot date");
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: {
      bankAccountId,
      entryDate: {
        gte: account.openingBalanceDate,
        lte: date,
      },
    },
    select: {
      direction: true,
      amount: true,
    },
  });

  let inflows = 0;
  let outflows = 0;

  for (const entry of entries) {
    const amount = Number(entry.amount);

    if (entry.direction === "INFLOW") {
      inflows += amount;
    } else {
      outflows += amount;
    }
  }

  const openingBalance = Number(account.openingBalance);

  const calculatedClosingBalance =
    openingBalance + inflows - outflows;

  const statementBalance =
    statementClosingBalance === null
      ? null
      : Number(statementClosingBalance);

  const difference =
    statementBalance === null
      ? null
      : calculatedClosingBalance - statementBalance;

  const tolerance = 0.01;

  const isReconciled =
    difference !== null &&
    Math.abs(difference) <= tolerance;

  const snapshot = await prisma.accountBalanceSnapshot.upsert({
    where: {
      bankAccountId_snapshotDate: {
        bankAccountId,
        snapshotDate: date,
      },
    },
    update: {
      openingBalance,
      ledgerInflows: inflows,
      ledgerOutflows: outflows,
      calculatedClosingBalance,
      statementClosingBalance: statementBalance,
      reconciliationDifference: difference,
      isReconciled,
    },
    create: {
      id: `SNAP-${bankAccountId}-${date.toISOString().slice(0, 10)}`,
      bankAccountId,
      snapshotDate: date,
      openingBalance,
      ledgerInflows: inflows,
      ledgerOutflows: outflows,
      calculatedClosingBalance,
      statementClosingBalance: statementBalance,
      reconciliationDifference: difference,
      isReconciled,
    },
  });

  return {
    snapshot,
    bankAccountId,
    currency: account.currency,
    calculatedClosingBalance,
    statementClosingBalance: statementBalance,
    reconciliationDifference: difference,
    isReconciled,
  };
}

module.exports = {
  reconcileAccountBalance,
};
