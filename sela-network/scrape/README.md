# Sela Network Scraper

A TypeScript Node.js application that continuously monitors multiple URLs and collects data using the Sela Network API.

## Features

- 🌐 Web scraping through Sela Network API
- 🐦 Support for Twitter profiles and various websites
- ⏰ Individual scheduling for each target
- 🔄 Automatic retry and error handling
- 🔑 Bearer Token authentication
- 📊 Real-time status monitoring
- 🛡️ Safe shutdown handling

## Installation

```bash
# Install dependencies
npm install
# or
pnpm install

# Set up environment variables
cp env.example .env
# Set SELA_API_TOKEN to your actual token in the .env file

# Build TypeScript
npm run build
```

## Environment Variables

Create a `.env` file and set the following variables:

```env
# Required: Sela Network API token
SELA_API_TOKEN=your_actual_api_token_here

# Optional: Override default settings
DEFAULT_INTERVAL=60000
MAX_RETRIES=3
TIMEOUT=30000
```

## Usage

### Development Mode

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## Configuration

You can modify scraping targets and settings in the `src/config.ts` file:

```typescript
export const config: ScrapingConfig = {
  targets: [
    {
      url: "https://twitter.com/elonmusk",
      name: "Elon Musk Twitter",
      scrapeType: "TWITTER_PROFILE",
      interval: 30000, // Every 30 seconds
      enabled: true,
    },
    {
      url: "https://example.com",
      name: "Example Website",
      scrapeType: "WEBSITE",
      interval: 120000, // Every 2 minutes
      enabled: true,
    },
  ],
  defaultInterval: 60000,
  maxRetries: 3,
  timeout: 30000,
  apiEndpoint: "http://dev-api.selanetwork.io:8083/api/rpc/scrapeUrl",
  bearerToken: process.env.SELA_API_TOKEN || "YOUR_API_TOKEN_HERE",
};
```

### Configuration Options

- `url`: URL to scrape
- `name`: Identifying name for the target
- `scrapeType`: Scraping type (e.g., "TWITTER_PROFILE", "WEBSITE")
- `interval`: Scraping interval in milliseconds
- `enabled`: Whether the target is active

### Supported Scraping Types

- `TWITTER_PROFILE`: Twitter profile scraping
- `WEBSITE`: General website scraping
- Any other types supported by the Sela Network API

## Scripts

- `npm run build`: Compile TypeScript
- `npm run start`: Run compiled application
- `npm run dev`: Run in development mode (using ts-node)
- `npm run watch`: Watch for file changes and auto-compile
- `npm run clean`: Clean build files

## Architecture

### Main Components

1. **Scraper**: Sela Network API call logic

   - Bearer Token authentication
   - HTTP POST requests to API
   - Support for various scraping types

2. **ScrapingScheduler**: Scheduling and target management

   - Independent schedules for each target
   - Concurrent execution control
   - Automatic retry

3. **SelaNetworkScraper**: Main application
   - System initialization and shutdown
   - Status monitoring
   - Signal handling

## Monitoring

The application provides the following information:

- Real-time API call results
- API response times
- Authentication and API error logs
- Next scheduled execution times
- Overall system status
- Scraped data summary

## Shutdown

Use `Ctrl+C` for safe shutdown. The application will complete ongoing tasks and clean up resources before exiting.

## License

MIT
