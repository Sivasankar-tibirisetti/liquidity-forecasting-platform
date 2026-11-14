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

export default function ForecastChart({ data }) {
  const formatAmount = (value) =>
    new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="chart-container">
      <div className="section-heading">
        <div>
          <h3>Daily liquidity forecast</h3>
          <p>Projected cash movement by forecast date</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="empty-chart">
          Generate a forecast to view the chart.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={310}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              tickFormatter={(value) => `₹${formatAmount(value)}`}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={90}
            />

            <Tooltip
              formatter={(value) => `₹${formatAmount(value)}`}
            />

            <Legend />

            <Area
              type="monotone"
              dataKey="closingBalance"
              name="Closing balance"
              stroke="#6366f1"
              fill="url(#balanceGradient)"
              strokeWidth={3}
            />

            <Area
              type="monotone"
              dataKey="totalInflows"
              name="Inflows"
              stroke="#16a34a"
              fill="transparent"
              strokeWidth={2}
            />

            <Area
              type="monotone"
              dataKey="totalOutflows"
              name="Outflows"
              stroke="#ea580c"
              fill="transparent"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}