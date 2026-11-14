# Data Dictionary

The Prisma schema in `backend/prisma/schema.prisma` is the authoritative source for exact field names, types, constraints and relations.

## Core business models

| Model | Purpose | Important relationships |
|---|---|---|
| LegalEntity | Legal/business entity | Parent of bank accounts, receivables, payables and forecasts |
| BankAccount | Entity bank account and opening position | Belongs to LegalEntity |
| LedgerEntry | Posted account transaction | Belongs to BankAccount |
| Receivable | Expected incoming payment | Belongs to LegalEntity |
| Payable | Expected outgoing payment | Belongs to LegalEntity |
| CurrencyRate | Dated currency conversion rate | Unique by base currency, quote currency and effective date |
| CashFlowForecast | Expected incoming/outgoing cash flow | Belongs to LegalEntity; may reference account, receivable or payable |
| LiquidityScenario | Scenario assumptions | Parent of ForecastRun |
| ForecastRun | Versioned forecast execution | Belongs to LiquidityScenario |
| ScenarioAdjustment | Scenario-specific flow adjustment | References scenario and forecast flow |
| ForecastRunItem | Daily account-level forecast result | References ForecastRun and BankAccount |
| ForecastRunLine | Source-level forecast traceability | References ForecastRun and CashFlowForecast |
| ActualCashFlow | Realized transaction | References BankAccount and optionally CashFlowForecast |
| AccountBalanceSnapshot | Reconciliation snapshot | References BankAccount |
| ForecastComparison | Forecast-versus-actual comparison | References ForecastRun and BankAccount |
| AuditEvent | Generic audit history | Stores aggregate identity and event details |
| EntityEvent | Legal entity lifecycle event | References LegalEntity |

## Common conventions
- IDs are primary keys unless otherwise defined.
- Foreign keys represent explicit relationships.
- Monetary fields use decimal database types.
- Effective and transaction dates are represented as date/time fields.
- Currency values use ISO-style currency codes.
- Scenario, flow and lifecycle fields use Prisma enums where defined; some business statuses are strings.

## Key constraints
- LegalEntity code is unique.
- BankAccount account sequence is unique within an entity.
- CurrencyRate is unique by base currency, quote currency and effective date.
- ForecastRun version is unique within a scenario.
- ForecastRunItem is unique by forecast run, account and forecast date.
- ForecastComparison is unique by forecast run, account and comparison date.

Refer to `backend/prisma/schema.prisma` for the complete field-level dictionary, nullability, defaults, precision and relation definitions.
