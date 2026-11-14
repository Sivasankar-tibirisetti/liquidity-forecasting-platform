# Business Rules

## Currency
- Reporting currency is INR.
- Supported currencies are INR, USD, EUR, GBP and JPY.
- Amounts in different currencies must not be added without conversion.
- FX conversion requires an applicable rate for the effective date.
- No cross-currency aggregation should be presented as a single amount unless converted.

## Cash position
Closing balance = opening balance + ledger inflows - ledger outflows.

Ledger entries are evaluated for the relevant bank account and date range.

## Forecast eligibility
Forecast inputs use eligible scheduled or confirmed cash-flow records within the configured forecast horizon. Actual records must not leak into forecast inputs after the forecast cutoff.

## Scenario rules
- Base scenario uses baseline cash-flow assumptions.
- Delayed-receipt scenario changes eligible inflow dates according to its delay assumption.
- Stress scenario applies its documented receipt and payment adjustments.
- Scenario outputs must retain their scenario identity and forecast version.

## Actual cash flows
Actual cash flows link to their source forecast when a match exists. Actual records are retained separately from forecast inputs.

## Reconciliation
Opening balance plus ledger inflows minus ledger outflows must equal calculated closing balance.

## Duplicate handling
Repeated deduplication keys require duplicate review. Baseline records should not be silently deleted or overwritten.

## Anomaly fixtures
The isolated fixtures cover:
1. Opening/ledger/closing mismatch.
2. Missing FX rate.
3. Duplicate cash flow.
4. Actual transaction after forecast cutoff.
5. Mixed currencies without conversion.

Fixture labels are stored separately from the fixture inputs. They do not alter baseline records.
