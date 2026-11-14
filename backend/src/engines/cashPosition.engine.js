
const prisma = require("../config/prisma");

/**
 * Calculate the cash position of a bank account.
 *
 * Formula:
 * Closing Balance = Opening Balance + Inflows - Outflows
 */
async function calculateCashPosition(bankAccountId, asOfDate = new Date()) {
  const account = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
  });

  if (!account) {
    throw new Error(`Bank account not found: ${bankAccountId}`);
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: {
      bankAccountId,
      entryDate: {
        gte: account.openingBalanceDate,
        lte: asOfDate,
      },
    },
    select: {
      direction: true,
      amount: true,
    },
  });

  let totalInflows = 0;
  let totalOutflows = 0;

  for (const entry of entries) {
    const amount = Number(entry.amount);

    if (entry.direction === "INFLOW") {
      totalInflows += amount;
    } else if (entry.direction === "OUTFLOW") {
      totalOutflows += amount;
    }
  }

  const openingBalance = Number(account.openingBalance);
  const closingBalance =
    openingBalance + totalInflows - totalOutflows;

  return {
    bankAccountId,
    currency: account.currency,
    asOfDate,
    openingBalance,
    totalInflows,
    totalOutflows,
    closingBalance,
    transactionCount: entries.length,
  };
}

module.exports = {
  calculateCashPosition,
};
