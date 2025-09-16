const APIHandlers = {
  async getStockQuote(symbol) {
    try {
      // Try Yahoo Finance first
      let res = await fetch(`${CONFIG.primaryAPI}/${symbol}`);
      let json = await res.json();
      let price = json.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price) return {current: price};
    } catch {}
    try {
      // Try Financial Modeling Prep
      let res = await fetch(`${CONFIG.backupAPI}/${symbol}?apikey=demo`);
      let json = await res.json();
      if (Array.isArray(json) && json[0]?.price)
        return {current: json[0].price};
    } catch {}
    // Fallback: Simulated
    const fallback = {
      NVDA: 177.88, META: 750.00, TSLA: 295.14,
      AAPL: 189.00, MSFT: 330.00, AMZN: 135.00, GOOGL: 140.50
    };
    return fallback[symbol] ? {current: fallback[symbol]} : null;
  }
};
