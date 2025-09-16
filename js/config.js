// Configurable settings for APIs, intervals, and risk levels

const CONFIG = {
  primaryAPI: "https://query1.finance.yahoo.com/v8/finance/chart",
  backupAPI: "https://financialmodelingprep.com/api/v3/quote",
  newsAPI: "https://newsapi.org/v2/everything",
  updateIntervalMs: 60000, // 1 minute
  riskTolerance: "medium", // options: "conservative", "medium", "aggressive"
  alertSound: true, // play sound on alert trigger
  supportedSymbols: ["NVDA", "META", "TSLA", "AAPL", "MSFT", "AMZN", "GOOGL"]
};
