import { ScrapingTarget, ScrapingResult } from "./types";
import { Scraper } from "./scraper";

interface ScheduledTarget {
  target: ScrapingTarget;
  nextRun: number;
  isRunning: boolean;
}

export class ScrapingScheduler {
  private scraper: Scraper;
  private scheduledTargets: Map<string, ScheduledTarget> = new Map();
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  constructor(scraper: Scraper) {
    this.scraper = scraper;
  }

  addTarget(target: ScrapingTarget): void {
    if (!target.enabled) {
      console.log(`⏸️  [${target.name}] Target is disabled`);
      return;
    }

    const scheduledTarget: ScheduledTarget = {
      target,
      nextRun: Date.now(),
      isRunning: false,
    };

    this.scheduledTargets.set(target.url, scheduledTarget);
    console.log(
      `➕ [${target.name}] Added to schedule (interval: ${
        target.interval || 60000
      }ms)`
    );
  }

  removeTarget(url: string): void {
    if (this.scheduledTargets.delete(url)) {
      console.log(`➖ Target removed: ${url}`);
    }
  }

  start(): void {
    if (this.isRunning) {
      console.log("⚠️  Scheduler is already running");
      return;
    }

    this.isRunning = true;
    console.log("🚀 Starting scheduler");

    // Check schedule every second
    this.intervalId = setInterval(() => {
      this.checkAndRunTargets();
    }, 1000);
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    console.log("⏹️  Scheduler stopped");
  }

  private async checkAndRunTargets(): Promise<void> {
    const now = Date.now();

    for (const [url, scheduledTarget] of this.scheduledTargets) {
      if (scheduledTarget.isRunning) {
        continue; // Skip targets that are already running
      }

      if (now >= scheduledTarget.nextRun) {
        this.runTarget(scheduledTarget);
      }
    }
  }

  private async runTarget(scheduledTarget: ScheduledTarget): Promise<void> {
    const { target } = scheduledTarget;
    scheduledTarget.isRunning = true;

    try {
      const result: ScrapingResult = await this.scraper.scrapeWithRetry(target);
      this.handleResult(result);
    } catch (error) {
      console.error(`💥 [${target.name}] Unexpected error:`, error);
    } finally {
      // Set next execution time
      const interval = target.interval || 60000;
      scheduledTarget.nextRun = Date.now() + interval;
      scheduledTarget.isRunning = false;
    }
  }

  private handleResult(result: ScrapingResult): void {
    const { target, success, data, error, responseTime } = result;

    // console.log("data", data);

    if (success) {
      console.log(`📊 [${target.name}] Data collection completed:`, {
        timestamp: result.timestamp.toISOString(),
        responseTime: `${responseTime}ms`,
        dataLength:
          typeof data === "string" ? data.length : JSON.stringify(data).length,
      });

      // Data storage logic can be added here
      // e.g., database save, file save, API transmission, etc.
    } else {
      console.error(`❌ [${target.name}] Scraping failed:`, error);
    }
  }

  getStatus(): {
    totalTargets: number;
    runningTargets: number;
    nextRuns: Array<{ name: string; nextRun: Date }>;
  } {
    const runningTargets = Array.from(this.scheduledTargets.values()).filter(
      (st) => st.isRunning
    ).length;
    const nextRuns = Array.from(this.scheduledTargets.values()).map((st) => ({
      name: st.target.name,
      nextRun: new Date(st.nextRun),
    }));

    return {
      totalTargets: this.scheduledTargets.size,
      runningTargets,
      nextRuns,
    };
  }
}
