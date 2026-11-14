
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const accountsRoutes = require("./routes/accounts.routes");
const forecastsRoutes = require("./routes/forecasts.routes");

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Liquidity Forecasting API is running",
    database: "PostgreSQL",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/accounts", accountsRoutes);
app.use("/api/forecasts", forecastsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

module.exports = app;
