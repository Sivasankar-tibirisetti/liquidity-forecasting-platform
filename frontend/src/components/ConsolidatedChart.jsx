
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const formatAmount = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);

const formatCrores = (value) =>
  `₹${formatAmount(value / 10000000)} Cr`;

export default function ConsolidatedChart({ data = [] }) {
  const chartData = data.map((day) => ({
    ...day,
    date: new Date(`${day.forecastDate}T00:00:00`).toLocaleDateString(
      "en-IN",
      { day: "2-digit", month: "short" }
    ),
  }));

  return (
    <div className="chart-container">
      {chartData.length === 0 ? (
        <div className="empty-chart">
          Generate or load a forecast to view consolidated liquidity.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 15, left: 5, bottom: 5 }}
          >
            <defs>
              <linearGradient
                id="consolidatedBalanceGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#5558df" stopOpacity={0.24} />
                <stop offset="95%" stopColor="#5558df" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e5e7eb"
            />

            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={20}
            />

            {/* Left axis: Closing liquidity */}
            <YAxis
              yAxisId="liquidity"
              orientation="left"
              tickFormatter={formatCrores}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={95}
            />

            {/* Right axis: Daily inflows and outflows */}
            <YAxis
              yAxisId="cashflow"
              orientation="right"
              tickFormatter={formatCrores}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={95}
            />

            <Tooltip
              labelFormatter={(label) => `Date: ${label}`}
              formatter={(value, name) => [
                `₹${formatAmount(value)} (${formatCrores(value)})`,
                name,
              ]}
              contentStyle={{
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                fontSize: "12px",
              }}
            />

            <Legend />

            <Area
              yAxisId="liquidity"
              type="monotone"
              dataKey="closingBalance"
              name="Closing liquidity"
              stroke="#5558df"
              fill="url(#consolidatedBalanceGradient)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5 }}
            />

            <Area
              yAxisId="cashflow"
              type="monotone"
              dataKey="totalInflows"
              name="Inflows"
              stroke="#16a34a"
              fill="transparent"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />

            <Area
              yAxisId="cashflow"
              type="monotone"
              dataKey="totalOutflows"
              name="Outflows"
              stroke="#ea580c"
              fill="transparent"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
