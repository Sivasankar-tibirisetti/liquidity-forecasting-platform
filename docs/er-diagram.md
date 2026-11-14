# Entity Relationship Diagram

The following Mermaid diagram summarizes the main business relationships. The Prisma schema is authoritative for exact optionality and constraints.

```mermaid
erDiagram
    LegalEntity ||--o{ BankAccount : owns
    LegalEntity ||--o{ Receivable : records
    LegalEntity ||--o{ Payable : records
    LegalEntity ||--o{ CashFlowForecast : defines

    BankAccount ||--o{ LedgerEntry : has
    BankAccount ||--o{ CashFlowForecast : allocates
    BankAccount ||--o{ ActualCashFlow : receives
    BankAccount ||--o{ ForecastRunItem : forecasts
    BankAccount ||--o{ AccountBalanceSnapshot : snapshots
    BankAccount ||--o{ ForecastComparison : compares

    Receivable o|--o{ CashFlowForecast : generates
    Payable o|--o{ CashFlowForecast : generates

    LiquidityScenario ||--o{ ForecastRun : executes
    LiquidityScenario ||--o{ ScenarioAdjustment : configures

    ForecastRun ||--o{ ForecastRunItem : contains
    ForecastRun ||--o{ ForecastRunLine : traces
    ForecastRun ||--o{ ForecastComparison : evaluates

    CashFlowForecast ||--o{ ForecastRunLine : source
    CashFlowForecast ||--o{ ActualCashFlow : realized_by
    CashFlowForecast ||--o{ ScenarioAdjustment : adjusted_by

    LegalEntity ||--o{ EntityEvent : records
```

## Relationship notes
- A legal entity can own multiple bank accounts.
- A bank account can have multiple ledger entries and actual cash flows.
- A forecast run belongs to one liquidity scenario.
- A forecast run contains daily account-level items and source-level forecast lines.
- A forecast flow can optionally reference a bank account, receivable or payable.
- Actual cash flows may link to a source forecast.
- CurrencyRate is an effective-dated currency pair lookup.
- AuditEvent uses aggregate type and aggregate ID fields for generic audit references.
