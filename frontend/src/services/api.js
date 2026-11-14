
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export const getAccounts = async () => {
  const response = await api.get("/accounts");
  return response.data;
};

export const getScenarios = async () => {
  const response = await api.get("/forecasts/scenarios");
  return response.data;
};

export const generateForecast = async (payload) => {
  const response = await api.post("/forecasts/run", payload);
  return response.data;
};

export const getForecastRun = async (runId) => {
  const response = await api.get(`/forecasts/${runId}`);
  return response.data;
};

export const getForecastSummary = async (runId) => {
  const response = await api.get(`/forecasts/${runId}/summary`);
  return response.data;
};

export const getLatestForecastRun = async (scenarioCode = "BASE") => {
  const response = await api.get("/forecasts/latest", {
    params: { scenarioCode },
  });
  return response.data;
};

export default api;
