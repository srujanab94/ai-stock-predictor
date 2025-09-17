/**
 * AI Stock Predictor - Simple Live Data Version
 */

class AIStockPredictor {
    constructor() {
        this.aiEngine = new AIStockEngine();
        this.stockData = new Map();
        this.recommendations = [];
        this.isLiveMode = false;
        
        console.log('🚀 AI Stock Predictor starting...');
        this.init();
    }

    async init() {
        try {
            // Check if we have an API key
            const apiKey = getAPIKey();
            this.isLiveMode = (apiKey !== 'DEMO_KEY' && apiKey !== 'ENTER_YOUR_KEY_HERE');
            
            console.log(`Mode: ${this.isLiveMode ? 'LIVE' : 'DEMO'}`);
            
            // Update status
            this.updateStatus(this.isLiveMode ? '🔴 LIVE Mode Active' : '📊 Demo Mode Active');
            
            // Load data
            await this.loadData();
            
            // Render UI
            this.renderUI();
            
            console.log('✅ AI Stock Predictor initialized');
            
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.handleError(error);
        }
    }

    async loadData() {
        const symbols = CONFIG.STOCKS.WATCHLIST;
        
        if (this.isLiveMode) {
            await this.loadLiveData(symbols);
        } else {
            this.loadDemoData(symbols);
        }
    }

    async loadLiveData(symbols) {
        console.log('📊 Loading live market data...');
        
        try {
            const apiKey = getAPIKey();
            
            for (const symbol of symbols) {
                try {
                    const data = await this.fetchAlphaVantageData(symbol, apiKey);
                    if (data) {
                        this.stockData.set(symbol, data);
                    }
                    // Small delay to respect rate limits
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.warn(`⚠️ Failed to fetch ${symbol}: ${error.message}`);
                    // Add fallback data
                    this.stockData.set(symbol, this.generateFallbackData(symbol));
                }
            }
            
            console.log(`✅ Loaded data for ${this.stockData.size} stocks`);
            
        } catch (error) {
            console.error('❌ Live data loading failed:', error);
            this.loadDemoData(symbols);
            this.isLiveMode = false;
        }
    }

    async fetchAlphaVantageData(symbol, apiKey) {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data['Error Message'] || data['Note']) {
            throw new Error(data['Error Message'] || 'Rate limit hit');
        }
        
        const quote = data['Global Quote'];
        if (!quote || !quote['05. price']) {
            throw new Error('Invalid response');
        }
        
        return {
            symbol: quote['01. symbol'],
            name: this.getCompanyName(symbol),
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change']),
            changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
            volume: parseInt(quote['06. volume']),
            source: 'Alpha Vantage (LIVE)',
            isLiveData: true,
            timestamp: Date.now()
        };
    }

    loadDemoData(symbols) {
        console.log('📊 Loading demo data...');
        
        const basePrices = {
            'AAPL': 230.49, 'NVDA': 177.88, 'TSLA': 295.14, 'MSFT': 470.38,
            'GOOGL': 173.68, 'META': 750.00, 'AMZN': 213.57
        };
        
        symbols.forEach(symbol => {
            this.stockData.set(symbol, this.generateFallbackData(symbol, basePrices[symbol]));
        });
        
        console.log(`✅ Loaded demo data for ${symbols.length} stocks`);
    }

    generateFallbackData(symbol, basePrice) {
        const price = basePrice || (100 + Math.random() * 400);
        const change = (Math.random() - 0.5) * 10;
        const changePercent = (change / price) * 100;
        
        return {
            symbol: symbol,
            name: this.getCompanyName(symbol),
            price: price,
            change: change,
            changePercent: changePercent,
            volume: Math.floor(Math.random() * 50000000) + 1000000,
            source: this.isLiveMode ? 'Fallback Data' : 'Demo Data',
            isLiveData: false,
            timestamp: Date.now()
        };
    }

    renderUI() {
        // Generate AI recommendations
        this.generateRecommendations();
        
        // Render main recommendation
        this.renderMainRecommendation();
        
        // Update status badge
        this.updateStatusBadge();
        
        // Setup profit calculator
        this.setupProfitCalculator();
    }

    generateRecommendations() {
        this.recommendations = Array.from(this.stockData.values()).map(stock => {
            return this.aiEngine.generatePrediction(stock.symbol, stock.price, 'monthly');
        });
        
        this.recommendations.sort((a, b) => b.profitPotential - a.profitPotential);
    }

    renderMainRecommendation() {
        if (this.recommendations.length === 0) return;
        
        const mainPick = this.recommendations[0];
        const stock = this.stockData.get(mainPick.symbol);
        
        // Update DOM elements
        const elements = {
            'mainStockSymbol': mainPick.symbol,
            'mainStockName': stock?.name || 'Loading...',
            'currentPrice': `$${mainPick.currentPrice.toFixed(2)}`,
            'targetPrice': `$${mainPick.targetPrice.toFixed(2)}`,
            'profitPotential': `+${mainPick.profitPotential.toFixed(1)}%`,
            'confidenceText': `${mainPick.confidence}%`
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
        
        // Update confidence bar
        const confidenceFill = document.getElementById('confidenceFill');
        if (confidenceFill) {
            confidenceFill.style.width = `${mainPick.confidence}%`;
        }
        
        // Update investment calculation
        const profit = 10000 * (mainPick.profitPotential / 100);
        const calc = document.getElementById('investmentCalculation');
        if (calc) {
            calc.innerHTML = `
                <strong>💰 Investment Calculation:</strong> 
                $10,000 investment → Expected: $${(10000 + profit).toFixed(0)} → 
                <strong>$${profit.toFixed(0)} profit</strong>
                <div style="margin-top: 8px; font-size: 0.9rem; color: ${this.isLiveMode ? '#00ff88' : '#ffa502'};">
                    ${this.isLiveMode ? '✅ Based on real market data' : '📊 Educational simulation'}
                </div>
            `;
        }
    }

    updateStatusBadge() {
        const badge = document.getElementById('accuracyBadge');
        if (badge) {
            badge.textContent = this.isLiveMode ? 
                '🔴 LIVE Market Data • Real-Time Analysis' : 
                '📊 Demo Mode • Educational Purpose Only';
        }
    }

    setupProfitCalculator() {
        // Profit calculator is already in HTML, no setup needed
        console.log('💰 Profit calculator ready');
    }

    updateStatus(message) {
        const status = document.getElementById('liveUpdates');
        if (status) {
            status.innerHTML = `
                <span class="update-dot"></span>
                ${message} • ${new Date().toLocaleTimeString()}
            `;
        }
    }

    handleError(error) {
        console.error('System error:', error);
        this.updateStatus(`Error: ${error.message}`);
    }

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

    // Static methods for button clicks
    static showDetailedAnalysis() {
        alert('🤖 Detailed Analysis\n\nThis feature shows comprehensive stock analysis including technical indicators, fundamental metrics, and AI confidence scores.\n\n✅ Available in full version');
    }

    static exportRecommendations() {
        const recommendations = `AI Stock Recommendations - ${new Date().toLocaleDateString()}\n\nGenerated by AI Stock Predictor\n\n📊 This is a demo of the export functionality.\n\n⚠️ Not financial advice`;
        
        const blob = new Blob([recommendations], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'AI_Stock_Recommendations.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    static setAlerts() {
        alert('🔔 Price Alerts\n\nThis feature would set up real-time price monitoring and notifications.\n\n✅ Available in full version');
    }

    static calculateProfits() {
        const amount = document.getElementById('investmentAmount')?.value;
        const results = document.getElementById('profitResults');
        
        if (!amount || !results) return;
        
        const investment = parseFloat(amount);
        if (investment <= 0) {
            results.innerHTML = '<div style="color: #ff6b6b;">Please enter a valid amount</div>';
            return;
        }
        
        const conservative = investment * 0.12;
        const aggressive = investment * 0.24;
        
        results.innerHTML = `
            <div><strong>Conservative:</strong> $${conservative.toFixed(2)} profit</div>
            <div><strong>Aggressive:</strong> $${aggressive.toFixed(2)} profit</div>
            <div style="margin-top: 10px; font-size: 0.8rem; color: #aaa;">
                30-day projection • Educational purposes only
            </div>
        `;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.aiStockPredictor = new AIStockPredictor();
    window.AIStockPredictor = AIStockPredictor; // For button clicks
});
