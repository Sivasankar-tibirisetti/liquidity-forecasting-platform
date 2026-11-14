# Architecture

## Overview
LiquiSight uses a React/Vite frontend, a Node.js/Express backend, Prisma ORM and PostgreSQL persistence.

## Main layers
1. Presentation: React dashboard and forecast visualizations.
2. API: Express routes for forecast operations and summaries.
3. Domain engines: cash-position calculation, forecasting, FX conversion and evaluation.
4. Persistence: Prisma models and PostgreSQL relationships.
5. Data generation and evidence: synthetic data generator, anomaly fixtures and export scripts.

## Forecast flow
1. Load legal entities and active bank accounts.
2. Calculate account cash position from opening balance and ledger entries.
3. Select eligible scheduled/confirmed cash flows.
4. Apply scenario assumptions and adjustments.
5. Calculate daily account balances.
6. Convert reporting values using applicable FX rates.
7. Persist versioned forecast runs, items and traceable lines.
8. Expose forecast summaries to the dashboard.

## Scenario behavior
- BASE: baseline assumptions.
- DELAYED_RECEIPT: delays eligible inflows.
- STRESS: applies documented receipt and payment stress assumptions.

## Evaluation
Linked actual cash flows are matched to their source forecast records and grouped by account and forecast expected date. Currency-specific metrics are calculated separately. This is transaction-cohort evaluation, not a historical daily backtest.

## Persistence and traceability
Forecast runs are versioned. ForecastRunItem stores daily account positions; ForecastRunLine records source forecast references and adjusted dates/amounts. AuditEvent and EntityEvent models are defined, but currently have no exported records.

## Technology
React, Vite, Node.js, Express, Prisma and PostgreSQL.
