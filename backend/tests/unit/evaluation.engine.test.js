
jest.mock("../../src/config/prisma", () => ({
  actualCashFlow: {
    findMany: jest.fn(),
  },
}));

const prisma = require("../../src/config/prisma");
const {
  evaluateLinkedCashFlows,
} = require("../../src/engines/evaluation.engine");

describe("evaluateLinkedCashFlows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("calculates account-level signed cash-flow variances", async () => {
    prisma.actualCashFlow.findMany.mockResolvedValue([
      {
        id: "ACT-001",
        bankAccountId: "BANK-001",
        actualDate: new Date("2026-01-10T00:00:00.000Z"),
        flowType: "INFLOW",
        amount: 100,
        currency: "INR",
        cashFlowForecast: {
          id: "CF-001",
          expectedDate: new Date("2026-01-10T00:00:00.000Z"),
          amount: 110,
          currency: "INR",
          flowType: "INFLOW",
        },
      },
      {
        id: "ACT-002",
        bankAccountId: "BANK-001",
        actualDate: new Date("2026-01-10T00:00:00.000Z"),
        flowType: "OUTFLOW",
        amount: 25,
        currency: "INR",
        cashFlowForecast: {
          id: "CF-002",
          expectedDate: new Date("2026-01-10T00:00:00.000Z"),
          amount: 30,
          currency: "INR",
          flowType: "OUTFLOW",
        },
      },
      {
        id: "ACT-003",
        bankAccountId: "BANK-001",
        actualDate: new Date("2026-01-10T00:00:00.000Z"),
        flowType: "INFLOW",
        amount: 50,
        currency: "USD",
        cashFlowForecast: {
          id: "CF-003",
          expectedDate: new Date("2026-01-10T00:00:00.000Z"),
          amount: 50,
          currency: "INR",
          flowType: "INFLOW",
        },
      },
    ]);

    const result = await evaluateLinkedCashFlows();

    expect(result.matchedActualRecords).toBe(2);
    expect(result.skippedRecords).toBe(1);
    expect(result.comparisonGroups).toBe(1);

    expect(result.comparisons[0]).toMatchObject({
      bankAccountId: "BANK-001",
      currency: "INR",
      forecastAmount: 80,
      actualAmount: 75,
      variance: -5,
      matchedTransactions: 2,
    });

    expect(result.metrics).toMatchObject({
      MAE: 5,
      RMSE: 5,
      meanBias: -5,
      totalBias: -5,
      percentageErrorGroups: 1,
    });

    expect(result.metrics.MAPE_percent).toBeCloseTo(6.67, 2);
  });

  test("returns null metrics when there are no matched records", async () => {
    prisma.actualCashFlow.findMany.mockResolvedValue([]);

    const result = await evaluateLinkedCashFlows();

    expect(result.matchedActualRecords).toBe(0);
    expect(result.comparisonGroups).toBe(0);
    expect(result.metrics.MAE).toBeNull();
    expect(result.metrics.RMSE).toBeNull();
    expect(result.metrics.MAPE_percent).toBeNull();
  });
});
