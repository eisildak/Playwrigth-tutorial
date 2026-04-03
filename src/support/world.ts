import { setDefaultTimeout, setWorldConstructor, World } from "@cucumber/cucumber";
import fs from "node:fs";
import path from "node:path";
import { Browser, BrowserContext, chromium, Page } from "playwright";

type WorldParams = {
  headless?: boolean;
  slowMo?: number;
  trace?: boolean;
  traceScreenshots?: boolean;
  traceSnapshots?: boolean;
  traceSources?: boolean;
  traceDir?: string;
  analyzeNetwork?: boolean;
  maxFailedRequests?: number;
  maxClientErrors?: number;
  maxServerErrors?: number;
};

type NetworkEntry = {
  method: string;
  url: string;
  status: number;
  resourceType: string;
  host: string;
};

class CustomWorld extends World<WorldParams> {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  networkEntries: NetworkEntry[] = [];

  private getTraceEnabled(): boolean {
    return this.parameters.trace ?? false;
  }

  private getNetworkAnalysisEnabled(): boolean {
    return this.parameters.analyzeNetwork ?? false;
  }

  private static sanitizeFileName(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "")
      .replace(/-+/g, "-")
      .slice(0, 80);
  }

  private setupNetworkCapture(): void {
    if (!this.context) {
      return;
    }

    this.context.on("response", (response) => {
      const request = response.request();
      const url = response.url();
      let host = "unknown";

      try {
        host = new URL(url).host;
      } catch {
        host = "unknown";
      }

      this.networkEntries.push({
        method: request.method(),
        url,
        status: response.status(),
        resourceType: request.resourceType(),
        host
      });
    });
  }

  async initBrowser(): Promise<void> {
    const headless = this.parameters.headless ?? true;
    const slowMo = this.parameters.slowMo ?? 0;
    this.browser = await chromium.launch({ headless, slowMo });
    this.context = await this.browser.newContext();

    if (this.getTraceEnabled()) {
      await this.context.tracing.start({
        screenshots: this.parameters.traceScreenshots ?? true,
        snapshots: this.parameters.traceSnapshots ?? true,
        sources: this.parameters.traceSources ?? true
      });
    }

    if (this.getNetworkAnalysisEnabled()) {
      this.setupNetworkCapture();
    }

    this.page = await this.context.newPage();
  }

  async finalizeScenarioArtifacts(scenarioName: string, status: string): Promise<{ tracePath?: string; networkReportPath?: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeScenarioName = CustomWorld.sanitizeFileName(scenarioName) || "scenario";
    const safeStatus = CustomWorld.sanitizeFileName(status) || "unknown";
    const suffix = `${timestamp}-${safeScenarioName}-${safeStatus}`;
    const result: { tracePath?: string; networkReportPath?: string } = {};

    if (this.getTraceEnabled() && this.context) {
      const traceDir = this.parameters.traceDir
        ? path.resolve(process.cwd(), this.parameters.traceDir)
        : path.resolve(process.cwd(), "reports", "traces");

      fs.mkdirSync(traceDir, { recursive: true });
      const tracePath = path.join(traceDir, `${suffix}.zip`);
      await this.context.tracing.stop({ path: tracePath });
      result.tracePath = tracePath;
    }

    if (this.getNetworkAnalysisEnabled()) {
      const networkDir = path.resolve(process.cwd(), "reports", "network");
      fs.mkdirSync(networkDir, { recursive: true });

      const statusClassSummary = this.networkEntries.reduce<Record<string, number>>((acc, entry) => {
        const key = `${Math.floor(entry.status / 100)}xx`;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});

      const hostSummary = this.networkEntries.reduce<Record<string, number>>((acc, entry) => {
        acc[entry.host] = (acc[entry.host] ?? 0) + 1;
        return acc;
      }, {});

      const networkReport = {
        scenario: scenarioName,
        status,
        totalRequests: this.networkEntries.length,
        statusClassSummary,
        hostSummary,
        failedRequests: this.networkEntries.filter((entry) => entry.status >= 400),
        entries: this.networkEntries
      };

      const networkReportPath = path.join(networkDir, `${suffix}.json`);
      fs.writeFileSync(networkReportPath, JSON.stringify(networkReport, null, 2), "utf8");
      result.networkReportPath = networkReportPath;
    }

    return result;
  }

  getNetworkThresholdViolations(): string[] {
    if (!this.getNetworkAnalysisEnabled()) {
      return [];
    }

    const clientErrors = this.networkEntries.filter((entry) => entry.status >= 400 && entry.status < 500).length;
    const serverErrors = this.networkEntries.filter((entry) => entry.status >= 500).length;
    const failedRequests = this.networkEntries.filter((entry) => entry.status >= 400).length;
    const violations: string[] = [];

    if (
      typeof this.parameters.maxFailedRequests === "number" &&
      failedRequests > this.parameters.maxFailedRequests
    ) {
      violations.push(
        `failedRequests=${failedRequests} is greater than maxFailedRequests=${this.parameters.maxFailedRequests}`
      );
    }

    if (
      typeof this.parameters.maxClientErrors === "number" &&
      clientErrors > this.parameters.maxClientErrors
    ) {
      violations.push(
        `clientErrors=${clientErrors} is greater than maxClientErrors=${this.parameters.maxClientErrors}`
      );
    }

    if (
      typeof this.parameters.maxServerErrors === "number" &&
      serverErrors > this.parameters.maxServerErrors
    ) {
      violations.push(
        `serverErrors=${serverErrors} is greater than maxServerErrors=${this.parameters.maxServerErrors}`
      );
    }

    return violations;
  }

  async closeBrowser(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
  }
}

setDefaultTimeout(120 * 1000);
setWorldConstructor(CustomWorld);

export { CustomWorld };
