import { Scraper } from "./scraper";
import { ScrapingScheduler } from "./scheduler";
import { config } from "./config";

class SelaNetworkScraper {
  private scraper: Scraper;
  private scheduler: ScrapingScheduler;

  constructor() {
    this.scraper = new Scraper(config);
    this.scheduler = new ScrapingScheduler(this.scraper);
  }

  async start(): Promise<void> {
    console.log("🌟 Starting Sela Network Scraper");
    console.log("📋 Configuration:", {
      targets: config.targets.length,
      defaultInterval: `${config.defaultInterval}ms`,
      maxRetries: config.maxRetries,
      timeout: `${config.timeout}ms`,
      apiEndpoint: config.apiEndpoint,
    });

    try {
      // Initialize scraper
      await this.scraper.initialize();

      // Add targets
      config.targets.forEach((target) => {
        this.scheduler.addTarget(target);
      });

      // Start scheduler
      this.scheduler.start();

      // Start status monitoring
      this.startStatusMonitoring();

      console.log("✅ All systems started successfully");
      console.log("💡 Press Ctrl+C to exit");
    } catch (error) {
      console.error("💥 Error during startup:", error);
      await this.shutdown();
      process.exit(1);
    }
  }

  private startStatusMonitoring(): void {
    // Print status every 5 minutes
    setInterval(() => {
      const status = this.scheduler.getStatus();
      console.log("📊 Current status:", {
        time: new Date().toLocaleString("en-US"),
        totalTargets: status.totalTargets,
        running: status.runningTargets,
        nextRuns: status.nextRuns
          .map((nr) => `${nr.name}: ${nr.nextRun.toLocaleTimeString("en-US")}`)
          .join(", "),
      });
    }, 5 * 60 * 1000); // 5 minutes
  }

  async shutdown(): Promise<void> {
    console.log("🔄 Shutting down system...");

    this.scheduler.stop();
    await this.scraper.close();

    console.log("✅ System shutdown completed safely");
  }
}

// Main execution function
async function main(): Promise<void> {
  const app = new SelaNetworkScraper();

  // Handle shutdown signals
  process.on("SIGINT", async () => {
    console.log("\n🛑 Received shutdown signal...");
    await app.shutdown();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\n🛑 Received shutdown signal...");
    await app.shutdown();
    process.exit(0);
  });

  // Handle unhandled exceptions
  process.on("unhandledRejection", (reason, promise) => {
    console.error("💥 Unhandled Promise rejection:", reason);
  });

  process.on("uncaughtException", async (error) => {
    console.error("💥 Uncaught exception:", error);
    await app.shutdown();
    process.exit(1);
  });

  // Start application
  await app.start();
}

// Call main function only when script is executed directly
if (require.main === module) {
  main().catch(async (error) => {
    console.error("💥 Error during main function execution:", error);
    process.exit(1);
  });
}

export { SelaNetworkScraper };
