
import { useEffect, useMemo, useState } from "react";

import {
  Activity,
  Building2,
  Wallet,
  RefreshCw,
  Play,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Landmark,
} from "lucide-react";

import StatCard from "./components/StatCard";
import ForecastChart from "./components/ForecastChart";
import ConsolidatedChart from "./components/ConsolidatedChart";
import AccountTable from "./components/AccountTable";

import {
  getAccounts,
  getScenarios,
  generateForecast,
  getForecastRun,
  getForecastSummary,
  getLatestForecastRun,
} from "./services/api";

function unwrap(response) {
  return response?.data ?? response;
}

function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatINR(value) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatCrores(value) {
  if (value === null || value === undefined) return "—";

  return `₹${(Number(value) / 10000000).toFixed(2)} Cr`;
}

export default function App() {
  const [accounts, setAccounts] = useState([]);
  const [scenarios, setScenarios] = useState([]);

  const [selectedScenario, setSelectedScenario] = useState("BASE");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [forecastDays, setForecastDays] = useState(30);

  const [forecastItems, setForecastItems] = useState([]);
  const [latestRun, setLatestRun] = useState(null);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadSavedForecast(scenarioCode = "BASE") {
    try {
      const latestResponse = await getLatestForecastRun(scenarioCode);
      const run = unwrap(latestResponse);

      if (!run?.id) {
        throw new Error("Latest forecast run was not returned.");
      }

      const [summaryResponse, runResponse] = await Promise.all([
        getForecastSummary(run.id),
        getForecastRun(run.id),
      ]);

      const summaryData = unwrap(summaryResponse);
      const runData = unwrap(runResponse);

      setSummary(summaryData);
      setLatestRun({
        forecastRunId: run.id,
        scenario: run.scenario?.code || scenarioCode,
        version: run.version,
        accountCount: summaryData.accountCount,
        forecastItemCount: summaryData.forecastItemCount,
        forecastDays: summaryData.forecastDays,
      });

      setForecastItems(runData?.items || []);
      setSelectedScenario(scenarioCode);

      return summaryData;
    } catch (err) {
      if (err.response?.status === 404) {
        setSummary(null);
        setLatestRun(null);
        setForecastItems([]);
        return null;
      }

      throw err;
    }
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const [accountResponse, scenarioResponse] = await Promise.all([
        getAccounts(),
        getScenarios(),
      ]);

    const accountList = accountResponse?.data || [];
const scenarioList = scenarioResponse?.data || [];

setAccounts(accountList);
setScenarios(scenarioList);

if (accountList.length > 0) {
  setSelectedAccountId(accountList[0].id);
}

const baseScenario = scenarioList.find(
  (scenario) => scenario.code === "BASE"
);

const initialScenario =
  baseScenario?.code ||
  scenarioList[0]?.code ||
  "BASE";

      setSelectedScenario(initialScenario);

      await loadSavedForecast(initialScenario);
    } catch (err) {
      console.error("Dashboard loading error:", err);

      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

 useEffect(() => {
  Promise.resolve().then(() => loadDashboard());
  // Initial dashboard load only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      setError("");
      setMessage("");

      await loadSavedForecast(selectedScenario);

      setMessage("Dashboard refreshed from saved forecast records.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to refresh dashboard."
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function handleGenerateForecast() {
    try {
      setGenerating(true);
      setError("");
      setMessage("");

      const response = await generateForecast({
        scenarioCode: selectedScenario,
        asOfDate: getToday(),
        forecastDays: Number(forecastDays),
        reportingCurrency: "INR",
      });

      const resultData = unwrap(response);
      const runId = resultData?.forecastRunId;

      if (!runId) {
        throw new Error("Forecast was generated, but no run ID was returned.");
      }

      const [summaryResponse, runResponse] = await Promise.all([
        getForecastSummary(runId),
        getForecastRun(runId),
      ]);

      const summaryData = unwrap(summaryResponse);
      const runData = unwrap(runResponse);

      setSummary(summaryData);
      setForecastItems(runData?.items || []);

      setLatestRun({
        forecastRunId: runId,
        scenario: resultData.scenario,
        version: resultData.version,
        accountCount: summaryData.accountCount,
        forecastItemCount: summaryData.forecastItemCount,
        forecastDays: summaryData.forecastDays,
      });

      setMessage(
        `${resultData.scenario} forecast generated successfully.`
      );
    } catch (err) {
      console.error("Forecast generation error:", err);

      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to generate forecast."
      );
    } finally {
      setGenerating(false);
    }
  }

  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId
  );

  const accountCurrency = selectedAccount?.currency || "INR";

  const accountChartData = useMemo(() => {
    return forecastItems
      .filter((item) => item.bankAccountId === selectedAccountId)
      .sort(
        (a, b) =>
          new Date(a.forecastDate) - new Date(b.forecastDate)
      )
      .map((item) => ({
        date: new Date(item.forecastDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
        closingBalance: Number(item.closingBalance),
        totalInflows: Number(item.totalInflows),
        totalOutflows: Number(item.totalOutflows),
      }));
  }, [forecastItems, selectedAccountId]);

  const dailySummary = summary?.dailySummary || [];

  const latestLiquidity = summary?.latestProjectedLiquidity;
  const firstDayLiquidity = summary?.openingLiquidity;

  function navigateToSection(sectionId) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

  if (loading) {
    return (
      <div className="loading-screen">
        <RefreshCw className="spin" size={28} />
        <p>Loading liquidity dashboard...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Activity size={23} />
          </div>

          <div>
            <h2>LiquiSight</h2>
            <span>Cash intelligence</span>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

       <button
  className="nav-item active"
  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
>
  <Activity size={18} />
  Overview
</button>

<button
  className="nav-item"
  onClick={() => navigateToSection("cash-positions")}
>
  <Wallet size={18} />
  Cash positions
</button>

<button
  className="nav-item"
  onClick={() => navigateToSection("forecasts")}
>
  <CalendarDays size={18} />
  Forecasts
</button>

<button
  className="nav-item"
  onClick={() => navigateToSection("bank-accounts")}
>
  <Building2 size={18} />
  Bank accounts
</button>

        <div className="sidebar-footer">
          <span className="online-dot" />
          Backend connected
          <small>API · localhost:5000</small>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">TREASURY MANAGEMENT</p>
            <h1>Liquidity Overview</h1>
            <p className="page-description">
              Monitor consolidated liquidity across multiple currencies.
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={handleRefresh}
            disabled={refreshing || generating}
          >
            <RefreshCw size={16} className={refreshing ? "spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        <section className="stats-grid">
          <StatCard
            title="Bank accounts"
            value={accounts.length}
            subtitle="Active accounts"
            icon={Building2}
          />

          <StatCard
            title="Reporting currency"
            value="INR"
            subtitle="Historical FX conversion"
            icon={Landmark}
          />

          <StatCard
            title="Forecast horizon"
            value={summary ? `${summary.forecastDays} days` : "—"}
            subtitle="Saved forecast period"
            icon={CalendarDays}
          />

          <StatCard
            title="Latest projected liquidity"
            value={formatCrores(latestLiquidity)}
            subtitle="Consolidated closing balance"
            icon={Wallet}
          />
        </section>

        <section className="stats-grid">
          <StatCard
            title="Total forecast inflows"
            value={formatCrores(summary?.totalInflows)}
            subtitle="Across all forecast days"
            icon={TrendingUp}
          />

          <StatCard
            title="Total forecast outflows"
            value={formatCrores(summary?.totalOutflows)}
            subtitle="Across all forecast days"
            icon={TrendingDown}
          />

          <StatCard
            title="Net cash flow"
            value={formatCrores(summary?.netCashFlow)}
            subtitle="Total inflows minus outflows"
            icon={Activity}
          />

          <StatCard
            title="First-day closing liquidity"
            value={formatCrores(firstDayLiquidity)}
            subtitle="First forecast date"
            icon={Wallet}
          />
        </section>

        <section className="panel" id="cash-positions">
          <div className="section-heading">
            <div>
              <h3>Consolidated liquidity trend</h3>
              <p>
                Daily projected balances, inflows and outflows in INR
              </p>
            </div>

            <span className="live-badge">FX CONVERTED · INR</span>
          </div>

          <ConsolidatedChart data={dailySummary} />

          {summary && (
            <div className="run-info">
              <span>Scenario: {summary.scenario}</span>
              <span>Version: {summary.version}</span>
              <span>Accounts: {summary.accountCount}</span>
              <span>Records: {summary.forecastItemCount}</span>
              <span>
                Latest liquidity: {formatINR(latestLiquidity)}
              </span>
            </div>
          )}
        </section>

        <section className="panel" id="forecasts">
          <div className="section-heading">
            <div>
              <h3>Generate liquidity forecast</h3>
              <p>
                Select a scenario and forecast horizon.
              </p>
            </div>

            <span className="live-badge">SCENARIO ENGINE</span>
          </div>

          <div className="forecast-controls">
            <label>
              Scenario

              <select
                value={selectedScenario}
                onChange={(event) => setSelectedScenario(event.target.value)}
              >
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.code}>
                    {scenario.code}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Forecast horizon

              <select
                value={forecastDays}
                onChange={(event) => setForecastDays(event.target.value)}
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </label>

            <button
              className="primary-button"
              onClick={handleGenerateForecast}
              disabled={generating || scenarios.length === 0}
            >
              {generating ? (
                <RefreshCw size={17} className="spin" />
              ) : (
                <Play size={17} />
              )}

              {generating ? "Generating..." : "Generate forecast"}
            </button>
          </div>

          {latestRun && (
            <div className="run-info">
              <span>Run ID: {latestRun.forecastRunId}</span>
              <span>Scenario: {latestRun.scenario}</span>
              <span>Version: {latestRun.version}</span>
              <span>Accounts: {latestRun.accountCount}</span>
            </div>
          )}
        </section>

       <section className="panel" id="bank-accounts">
          <div className="section-heading">
            <div>
              <h3>Daily cash flow summary</h3>
              <p>Consolidated daily movement in INR</p>
            </div>

            <span className="count-label">
              {dailySummary.length} days
            </span>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Forecast date</th>
                  <th>Inflows</th>
                  <th>Outflows</th>
                  <th>Net cash flow</th>
                  <th>Closing liquidity</th>
                </tr>
              </thead>

              <tbody>
                {dailySummary.map((day) => (
                  <tr key={day.forecastDate}>
                    <td>
                      <strong>{day.forecastDate}</strong>
                    </td>
                    <td className="positive-value">
                      {formatINR(day.totalInflows)}
                    </td>
                    <td className="negative-value">
                      {formatINR(day.totalOutflows)}
                    </td>
                    <td>
                      {formatINR(day.netCashFlow)}
                    </td>
                    <td>
                      <strong>
                        {formatINR(day.closingBalance)}
                      </strong>
                    </td>
                  </tr>
                ))}

                {dailySummary.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-cell">
                      No saved forecast data. Generate a forecast to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h3>Individual account analytics</h3>
              <p>
                {selectedAccount
                  ? `Account: ${selectedAccount.bankName || selectedAccount.id}`
                  : "Select an account to view forecast data"}
              </p>
            </div>

            <select
              className="account-select"
              value={selectedAccountId}
              onChange={(event) => setSelectedAccountId(event.target.value)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountNumberMasked || account.id}
                </option>
              ))}
            </select>
          </div>

          <ForecastChart data={accountChartData} />

          {accountChartData.length > 0 && (
            <p className="chart-note">
              Individual account values are displayed in {accountCurrency}.
              Consolidated values above are converted to INR.
            </p>
          )}
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h3>Bank accounts</h3>
              <p>Click an account to view its forecast chart.</p>
            </div>

            <span className="count-label">
              {accounts.length} accounts
            </span>
          </div>

          <AccountTable
            accounts={accounts}
            selectedId={selectedAccountId}
            onSelect={setSelectedAccountId}
          />
        </section>

        <section className="notice">
          <Activity size={18} />

          <div>
            <strong>Forecasting information</strong>

            <p>
              Consolidated liquidity is calculated using historical FX rates
              and saved forecast records. Individual account balances remain
              available in their original currencies. Forecasts are
              projections, not guaranteed cash positions.
            </p>
          </div>
        </section>

        <footer className="footer">
          LiquiSight · Liquidity Forecasting Platform · 2026
        </footer>
      </main>
    </div>
  );
}
