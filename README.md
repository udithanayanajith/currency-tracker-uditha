# Currency Exchange Tracker

## Project Overview

Real-time monitoring system for USD, EUR, GBP vs LKR exchange rates with automated alerts.

## Features

- Real-time exchange rate monitoring
- Visual threshold alerts (cards turn red)
- Audio notifications for rate breaches
- Historical data (last 7 records)
- Automatic scheduled updates
- Responsive web dashboard

## Technology Stack

- **Backend:** Node.js, Express.js
- **Database:** Firebase Firestore
- **Frontend:** HTML, CSS, JavaScript
- **API:** FastForex API
- **Scheduling:** node-cron

## Deployment Steps

### 1\. Prerequisites

- Node.js v14+
- Firebase project
- FastForex API key

### 2\. Installation

    git clone <repository-url>
    cd currency-tracker-uditha
    npm install

### 3\. Environment Setup

Create `.env` file:

    FASTFOREX_API_KEY=your_api_key
    FASTFOREX_API_URL=https://api.fastforex.io/convert
    PORT=3000

### 4\. Firebase Setup

- Create Firebase project
- Enable Firestore Database
- Add serviceAccountKey.json to project root

### 5\. Run Application

    npm start
    # Access: http://localhost:3000

## API Reference

### External API

**FastForex API:** https://api.fastforex.io/convert

- Fetches real-time LKR to USD/EUR/GBP rates
- Requires API key authentication

### Internal APIs

- `GET /api/current` - Latest rates with thresholds
- `GET /api/rates/history` - Last 7 rate records
- `POST /api/fetch-realtime` - Manual rate fetch
- `GET /api/events` - Real-time SSE updates

## Configuration

### Threshold Settings

Update in `src/services/alertService.js`:

    const thresholds = {
      USD: 330,
      EUR: 370,
      GBP: 420
    };

### Scheduler

Update in `src/app.js`:

    // Testing (every 5 minutes)
    cron.schedule("*/5 * * * *", fetchRates);

    // Production (daily at 9 AM)
    cron.schedule("0 9 * * *", fetchRates);

## Challenges Faced

### 1\. Real-time Data Synchronization

- Implemented Server-Sent Events for live updates
- Handled connection drops with automatic reconnection
- Managed multiple client connections efficiently

### 2\. Data Storage Optimization

- Limited to 7 latest records to prevent database bloat
- Implemented automatic cleanup of old records
- Used Firestore timestamp-based sorting

### 3\. Error Handling

- API rate limiting from FastForex
- Network connectivity issues
- Firebase authentication and quota limits

### 4\. Security Implementation

- Environment variables for sensitive data
- Input validation and sanitization
- CORS configuration for cross-origin requests

### 5\. Frontend-Backend Communication

- SSE implementation for real-time updates
- State management for rate changes
- Audio alert synchronization with visual indicators

## Project Structure

    currency-tracker-uditha/
    ├── src/
    │   ├── services/
    │   │   ├── currencyService.js
    │   │   ├── alertService.js
    │   │   ├── emailService.js
    │   │   └── firebase.js
    │   ├── routes/
    │   │   └── rates.js
    │   └── app.js
    ├── public/
    │   └── index.html
    ├── .env
    └── package.json

## Usage

1.  Access dashboard at http://localhost:3000
2.  View real-time USD, EUR, GBP rates in LKR
3.  Monitor color-coded alerts (red = threshold exceeded)
4.  Check rate history in the table below
5.  Use "Fetch Latest Rates" for manual updates

## Dependencies

- express - Web server framework
- firebase-admin - Firebase integration
- axios - HTTP requests
- node-cron - Scheduled tasks
- cors - Cross-origin requests
- dotenv - Environment variables
