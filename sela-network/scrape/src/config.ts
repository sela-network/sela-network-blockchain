import { ScrapingConfig } from "./types";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const config: ScrapingConfig = {
  targets: [
    // {
    //   url: "https://www.google.com",
    //   name: "Google Search",
    //   scrapeType: "HTML",
    //   interval: 60000,
    //   enabled: true,
    // },
    // {
    //   url: "https://brunch.co.kr/brunchbook/triangle-1",
    //   name: "Brunch",
    //   scrapeType: "HTML",
    //   interval: 60000,
    //   enabled: true,
    // },
    {
      url: "https://twitter.com/elonmusk",
      name: "Elon Musk Twitter",
      scrapeType: "TWITTER_PROFILE",
      interval: 30000,
      enabled: true,
    },
    // {
    //   url: "https://twitter.com/OpenAI",
    //   name: "OpenAI Twitter",
    //   scrapeType: "HTML",
    //   interval: 60000, // 1 minute
    //   enabled: true,
    // },
    // {
    //   url: "https://gmgn.ai/trend/Gn1Ri7JD?chain=bsc&tab=new_pair",
    //   name: "GMGN",
    //   scrapeType: "HTML",
    //   interval: 60000,
    //   enabled: true,
    // },
  ],
  defaultInterval: parseInt(process.env.DEFAULT_INTERVAL || "60000"),
  maxRetries: parseInt(process.env.MAX_RETRIES || "3"),
  timeout: parseInt(process.env.TIMEOUT || "30000"),
  apiEndpoint:
    process.env.API_ENDPOINT ||
    "http://dev-api.selanetwork.io:8083/api/rpc/scrapeUrl",
  bearerToken: process.env.SELA_API_TOKEN || "YOUR_API_TOKEN_HERE",
};
