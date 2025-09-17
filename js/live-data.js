/**
 * LIVE Market Data Handler
 * Real-time stock data from Alpha Vantage API
 */

class LiveDataHandler {
    constructor() {
        this.cache = new Map();
        this.requestCount = 0;
        this.dailyRequestCount = 0;
        this.lastRequestTime = 0;
        this.rateLimitHit = false;
        
        // Load daily request count from localStorage
        const today = new Date().toDateString();
        const savedDate = localStorage.getItem('requestDate');
        
        if (savedDate === today) {
            this.dailyRequestCount = parseInt(localStorage.getItem('dailyRequests')) || 0;
        } else {
            localStorage.setItem('requestDate', today);
            localStorage.setItem('dailyRequests', '0');
        }
        
        console.log('🔴 Live Data Handler initialized');
        console.log(`📊 Daily API requests used: ${this.dailyRequestCount}/25`);
    }

    /**
     * Fetch real stock data from Alpha Vantage
     */
    async fetchLiveStock(symbol) {
        try {
            console.log(`📊 Fetching LIVE data for ${symbol}...`);
            
            // Check cache first
            if (this.isCacheValid(symbol)) {
                console.log(`💾 Using cached data for ${symbol}`);
                return this.cache.get(symbol);
            }

            // Check rate limits
            if (this.dailyRequestCount >= 25) {
                console.warn('⚠️ Daily rate limit reached (25/25)');
                throw new Error('Daily API limit reached');
            }

            if (this.rateLimitHit) {
                console.warn('⚠️ Rate limit cooldown active');
                throw new Error('Rate limit cooldown active');
            }

            const apiKey = getAPIKey();
            if (apiKey === 'DEMO_KEY' || apiKey === 'ENTER_YOUR_KEY_HERE') {
                throw new Error('API key not configured');
            }

            // Make API request
            const data = await this.callAlphaVantageAPI(symbol, apiKey);
            
            if (data) {
                // Update cache and counters
                this.updateCache(symbol, data);
                this.incrementRequestCount();
                
                console.log(`✅ LIVE: ${symbol} = $${data.price} (${data.change >= 0 ? '+' : ''}$${data.change.toFixed(2)})`);
                return data;
            }

            throw new Error('No data received');

        } catch (error) {
            console.error(`❌ Failed to fetch live data for ${symbol}: ${error.message}`);
            
            // Try to return cached data if available
            if (this.cache.has(symbol)) {
                const cached = this.cache.get(symbol);
                console.log(`🔄 Using cached data for ${symbol} (${Math.round((Date.now() - cached.timestamp) / 1000)}s old)`);
                return cached;
            }
            
            throw error;
        }
    }

    /**
     * Call Alpha Vantage Global Quote API
     */
    async callAlphaVantageAPI(symbol, apiKey) {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'AIStockPredictor/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Check for API errors
        if (data['Error Message']) {
            throw new Error(data['Error Message']);
        }

        if (data['Note'] && data['Note'].includes('rate limit')) {
            console.warn('⚠️ Rate limit hit, activating cooldown');
            this.rateLimitHit = true;
            setTimeout(() => {
                this.rateLimitHit = false;
                console.log('✅ Rate limit cooldown ended');
            }, 60000); // 1 minute cooldown
            throw new Error('API rate limit exceeded');
        }

        const quote = data['Global Quote'];
        if (!quote || Object.keys(quote).length === 0) {
            throw new Error('Empty response from Alpha Vantage');
        }

        // Parse the data
        return this.parseAlphaVantageData(quote);
    }

    /**
     * Parse Alpha Vantage response into our format
     */
    parseAlphaVantageData(quote) {
        const symbol = quote['01. symbol'];
        const price = parseFloat(quote['05. price']);
        const change = parseFloat(quote['09. change']);
        const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
        const volume = parseInt(quote['06. volume']) || 0;
        const high = parseFloat(quote['03. high']);
        const low = parseFloat(quote['04. low']);
        const previousClose = parseFloat(quote['08. previous close']);
        
        return {
            symbol: symbol,
            name: this.getCompanyName(symbol),
            price: price,
            change: change,
            changePercent: changePercent,
            volume: volume,
            high: high,
            low: low,
            previousClose: previousClose,
            marketCap: this.estimateMarketCap(symbol, price),
            source: 'Alpha Vantage (LIVE)',
            timestamp: Date.now(),
            lastTradingDay: quote['07. latest trading day'],
            isLiveData: true
        };
    }

    /**
     * Fetch multiple stocks with proper rate limiting
     */
    async fetchMultipleLiveStocks(symbols) {
        console.log(`📊 Fetching LIVE data for ${symbols.length} stocks...`);
        const results = [];
        const errors = [];

        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            
            try {
                const data = await this.fetchLiveStock(symbol);
                results.push(data);
                
                // Add delay between requests to avoid rate limiting
                if (i < symbols.length - 1) {
                    await this.delay(2000); // 2 second delay
                }
                
            } catch (error) {
                console.warn(`⚠️ Failed to fetch ${symbol}: ${error.message}`);
                errors.push({ symbol, error: error.message });
                
                // Generate fallback data for failed requests
                try {
                    const fallback = this.generateFallbackData(symbol);
                    results.push(fallback);
                } catch (fallbackError) {
                    console.error(`❌ Fallback failed for ${symbol}`);
                }
            }
        }

        const liveCount = results.filter(r => r.isLiveData).length;
        console.log(`✅ Fetched ${liveCount}/${symbols.length} live stocks, ${results.length - liveCount} fallback`);
        
        if (errors.length > 0) {
            console.warn('⚠️ Some requests failed:', errors);
        }

        return results;
    }

    /**
     * Check if cached data is still valid
     */
    isCacheValid(symbol) {
        if (!this.cache.has(symbol)) return false;
        
        const cached = this.cache.get(symbol);
        const age = Date.now() - cached.timestamp;
        const maxAge = this.isMarketOpen() ? CONFIG.STOCKS.CACHE_DURATION : CONFIG.STOCKS.CACHE_DURATION * 3;
        
        return age < maxAge;
    }

    /**
     * Update cache with new data
     */
    updateCache(symbol, data) {
        this.cache.set(symbol, data);
        
        // Clean old entries
        if (this.cache.size > 100) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }

    /**
     * Increment request counters
     */
    incrementRequestCount() {
        this.requestCount++;
        this.dailyRequestCount++;
        this.lastRequestTime = Date.now();
        
        // Save to localStorage
        localStorage.setItem('dailyRequests', this.dailyRequestCount.toString());
        
        console.log(`📊 API usage: ${this.dailyRequestCount}/25 daily requests`);
    }

    /**
     * Check if US market is open
     */
    isMarketOpen() {
        const now = new Date();
        const nyTime = new Date(now.toLocaleString("en-US", {timeZone: CONFIG.MARKET_HOURS.TIMEZONE}));
        
        const day = nyTime.getDay(); // 0 = Sunday
        const time = nyTime.getHours() * 100 + nyTime.getMinutes();
        
        // Weekend
        if (day === 0 || day === 6) return false;
        
        // Market hours: 9:30 AM - 4:00 PM EST
        return time >= CONFIG.MARKET_HOURS.OPEN && time <= CONFIG.MARKET_HOURS.CLOSE;
    }

    /**
     * Generate fallback data when API fails
     */
    generateFallbackData(symbol) {
        const basePrices = {
            'AAPL': 230.49, 'NVDA': 177.88, 'TSLA': 295.14, 'MSFT': 470.38,
            'GOOGL': 173.68, 'META': 750.00, 'AMZN': 213.57
        };
        
        const basePrice = basePrices[symbol] || 100;
        const volatility = 0.02; // 2% random movement
        const randomChange = (Math.random() - 0.5) * volatility * 2;
        const currentPrice = basePrice * (1 + randomChange);
        const change = currentPrice - basePrice;
        const changePercent = (change / basePrice) * 100;
        
        return {
            symbol: symbol,
            name: this.getCompanyName(symbol),
            price: currentPrice,
            change: change,
            changePercent: changePercent,
            volume: Math.floor(Math.random() * 50000000) + 1000000,
            marketCap: this.estimateMarketCap(symbol, currentPrice),
            source: 'Fallback Data',
            timestamp: Date.now(),
            isLiveData: false,
            isFallback: true
        };
    }

    // Utility functions
    getCompanyName(symbol) {
        const companies = {
            'AAPL': 'Apple Inc.',
            'NVDA': 'NVIDIA Corporation',
            'TSLA': 'Tesla, Inc.',
            'MSFT': 'Microsoft Corporation',
            'GOOGL': 'Alphabet Inc.',
            'META': 'Meta Platforms, Inc.',
            'AMZN': 'Amazon.com, Inc.'
        };
        return companies[symbol] || `${symbol} Corporation`;
    }

    estimateMarketCap(symbol, price) {
        const sharesOutstanding = {
            'AAPL': 15200000000, 'NVDA': 24600000000, 'TSLA': 3170000000,
            'MSFT': 7430000000, 'GOOGL': 12400000000, 'META': 2540000000,
            'AMZN': 10700000000
        };
        return price * (sharesOutstanding[symbol] || 1000000000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get API usage statistics
     */
    getUsageStats() {
        return {
            dailyRequests: this.dailyRequestCount,
            dailyLimit: 25,
            remainingRequests: 25 - this.dailyRequestCount,
            cacheSize: this.cache.size,
            rateLimitHit: this.rateLimitHit,
            lastRequestTime: this.lastRequestTime,
            marketOpen: this.isMarketOpen()
        };
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.LiveDataHandler = LiveDataHandler;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LiveDataHandler;
}
