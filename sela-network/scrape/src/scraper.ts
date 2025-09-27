import axios, { AxiosResponse } from "axios";
import {
  ScrapingTarget,
  ScrapingResult,
  ScrapingConfig,
  ApiRequest,
  ApiResponse,
} from "./types";

export class Scraper {
  private config: ScrapingConfig;

  constructor(config: ScrapingConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log("🚀 Initializing Sela Network API scraper");

    // Check API token
    if (
      !this.config.bearerToken ||
      this.config.bearerToken === "YOUR_API_TOKEN_HERE"
    ) {
      console.warn(
        "⚠️  API token not configured. Please set the SELA_API_TOKEN environment variable."
      );
    } else {
      console.log("✅ API token verified");
    }

    console.log(`📡 API endpoint: ${this.config.apiEndpoint}`);
  }

  async scrapeWithApi(target: ScrapingTarget): Promise<ScrapingResult> {
    const startTime = Date.now();

    try {
      console.log(
        `📡 [${target.name}] Starting API scraping: ${target.url} (type: ${target.scrapeType})`
      );

      const requestBody: ApiRequest = {
        url: target.url,
        scrapeType: target.scrapeType,
        // timeoutMs: 120000,
        // principalId:
        //   "ye632-5bm3v-j3crp-4jbjo-ztrhi-4ymn2-htifv-vqma7-poxtk-u2bqu-aqe",
      };

      if (target.scrapeType === "TWITTER_PROFILE") {
        requestBody.postCount = 100;
      } else if (target.scrapeType === "TWITTER_POST") {
        requestBody.replyCount = 100;
      }

      const response: AxiosResponse<ApiResponse> = await axios.post(
        this.config.apiEndpoint,
        requestBody,
        {
          timeout: this.config.timeout,
          headers: {
            Authorization: `Bearer ${this.config.bearerToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const apiResponse = response.data;

      if (apiResponse.success) {
        const result: ScrapingResult = {
          target,
          timestamp: new Date(),
          success: true,
          data: apiResponse.data,
          responseTime: Date.now() - startTime,
        };

        if (target.scrapeType === "TWITTER_POST") {
          console.log("result: reply count", result.data.result.reply.length);
        } else {
          console.log("result: post count", result.data.result.length);
        }

        console.log(
          `✅ [${target.name}] API scraping successful (${result.responseTime}ms)`
        );
        return result;
      } else {
        const result: ScrapingResult = {
          target,
          timestamp: new Date(),
          success: false,
          error: apiResponse.error || "Unknown error from API",
          responseTime: Date.now() - startTime,
        };

        console.error(
          `❌ [${target.name}] API scraping failed: ${result.error}`
        );
        return result;
      }
    } catch (error) {
      const result: ScrapingResult = {
        target,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        responseTime: Date.now() - startTime,
      };

      console.error(`❌ [${target.name}] API call failed: ${result.error}`);
      return result;
    }
  }

  async scrape(target: ScrapingTarget): Promise<ScrapingResult> {
    return this.scrapeWithApi(target);
  }

  async scrapeWithRetry(target: ScrapingTarget): Promise<ScrapingResult> {
    let lastResult: ScrapingResult | undefined;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      lastResult = await this.scrape(target);

      if (lastResult.success) {
        return lastResult;
      }

      if (attempt < this.config.maxRetries) {
        const delay = attempt * 1000; // Increase retry interval
        console.log(
          `🔄 [${target.name}] Attempt ${attempt} failed, retrying in ${delay}ms...`
        );
        await this.sleep(delay);
      }
    }

    return lastResult!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async close(): Promise<void> {
    console.log("✅ Sela Network API scraper shutdown");
    // No special cleanup needed for API-based scraping
  }
}
