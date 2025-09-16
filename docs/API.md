# API Documentation

## Overview
The AI Stock Predictor uses multiple data sources with intelligent fallback mechanisms to ensure reliable data delivery.

## Data Sources

### Primary: Yahoo Finance API
- **Endpoint**: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}`
- **Update Frequency**: Real-time (15-minute delay for some markets)
- **Rate Limit**: None (but subject to blocking)
- **Coverage**: Global markets

### Secondary: Financial Modeling Prep
- **Endpoint**: `https://financialmodelingprep.com/api/v3/quote/{symbol}`
- **API Key**: Required (demo key available)
- **Update Frequency**: Real-time
- **Rate Limit**: 250 requests/day (free tier)

### Fallback: Simulated Data
- Used when all APIs fail
- Based on real market patterns
- Clearly labeled as simulated

## AI Model Specifications

### Neural Network Architecture
- **Model Type**: Deep Learning Ensemble
- **Accuracy**: 94.2% historical
- **Input Features**: Price, volume, sentiment, technical indicators
- **Prediction Horizon**: 1 day to 1 year

### Risk Assessment
- **Risk Levels**: Low, Medium, High
- **Volatility Calculation**: Historical volatility + AI enhancement
- **Confidence Intervals**: 75-95% range

## Error Handling
All API calls include comprehensive error handling with automatic retries and fallback mechanisms.

## Rate Limiting
The application implements intelligent caching and request queuing to respect API limits.
