import { Given, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CustomWorld } from "../support/world";

type RequestError = {
  requestNo: number;
  statusOrError: string;
  durationMs: number;
};

type LoadCheckResult = {
  targetUrl: string;
  totalRequests: number;
  concurrency: number;
  completedRequests: number;
  failedRequests: number;
  errorRatePercent: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  errors: RequestError[];
};

type LoadWorld = CustomWorld & {
  loadCheckResult?: LoadCheckResult;
};

function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  const index = Math.max(0, Math.min(rank, sorted.length - 1));
  return sorted[index];
}

Given(
  "I run a burst load check on {string} with {int} requests and {int} concurrency",
  async function (this: LoadWorld, targetUrl: string, totalRequests: number, concurrency: number) {
    const page = this.page;
    assert.ok(page, "Expected browser page to be initialized in World");
    assert.ok(totalRequests > 0, "totalRequests must be greater than 0");
    assert.ok(concurrency > 0, "concurrency must be greater than 0");

    const durations: number[] = [];
    const errors: RequestError[] = [];
    let nextRequestNo = 1;

    const workerCount = Math.min(concurrency, totalRequests);
    const workers = Array.from({ length: workerCount }, async () => {
      while (true) {
        const requestNo = nextRequestNo;
        nextRequestNo += 1;

        if (requestNo > totalRequests) {
          break;
        }

        const startedAt = Date.now();
        try {
          const response = await page.request.get(targetUrl, {
            failOnStatusCode: false,
            timeout: 15000,
            maxRedirects: 5,
          });

          const durationMs = Date.now() - startedAt;
          durations.push(durationMs);

          if (response.status() >= 400) {
            errors.push({
              requestNo,
              statusOrError: `HTTP ${response.status()}`,
              durationMs,
            });
          }
        } catch (error) {
          const durationMs = Date.now() - startedAt;
          durations.push(durationMs);

          errors.push({
            requestNo,
            statusOrError: (error as Error).message,
            durationMs,
          });
        }
      }
    });

    await Promise.all(workers);

    const completedRequests = durations.length;
    const failedRequests = errors.length;
    const avgResponseTimeMs =
      completedRequests === 0
        ? 0
        : Math.round(durations.reduce((sum, value) => sum + value, 0) / completedRequests);
    const p95ResponseTimeMs = Math.round(percentile(durations, 95));
    const errorRatePercent =
      completedRequests === 0 ? 100 : Number(((failedRequests / completedRequests) * 100).toFixed(2));

    this.loadCheckResult = {
      targetUrl,
      totalRequests,
      concurrency,
      completedRequests,
      failedRequests,
      errorRatePercent,
      avgResponseTimeMs,
      p95ResponseTimeMs,
      errors: errors.slice(0, 25),
    };

    await this.attach(JSON.stringify(this.loadCheckResult, null, 2), "application/json");
  }
);

Then(
  "I should keep error rate under {int} percent in load check",
  function (this: LoadWorld, maxErrorRatePercent: number) {
    assert.ok(this.loadCheckResult, "Expected load check result to be available");

    const result = this.loadCheckResult;
    assert.ok(
      result.errorRatePercent <= maxErrorRatePercent,
      `Error rate too high. URL: ${result.targetUrl}, Error rate: ${result.errorRatePercent}%, Limit: ${maxErrorRatePercent}%\n` +
        `Completed: ${result.completedRequests}/${result.totalRequests}, Failed: ${result.failedRequests}\n` +
        `Sample errors:\n${result.errors.map((e) => `#${e.requestNo} ${e.statusOrError} (${e.durationMs}ms)`).join("\n")}`
    );
  }
);

Then(
  "I should keep p95 response time under {int} ms in load check",
  function (this: LoadWorld, maxP95Ms: number) {
    assert.ok(this.loadCheckResult, "Expected load check result to be available");

    const result = this.loadCheckResult;
    assert.ok(
      result.p95ResponseTimeMs <= maxP95Ms,
      `P95 response time too high. URL: ${result.targetUrl}, P95: ${result.p95ResponseTimeMs}ms, Limit: ${maxP95Ms}ms`
    );
  }
);

Then(
  "I should keep average response time under {int} ms in load check",
  function (this: LoadWorld, maxAvgMs: number) {
    assert.ok(this.loadCheckResult, "Expected load check result to be available");

    const result = this.loadCheckResult;
    assert.ok(
      result.avgResponseTimeMs <= maxAvgMs,
      `Average response time too high. URL: ${result.targetUrl}, AVG: ${result.avgResponseTimeMs}ms, Limit: ${maxAvgMs}ms`
    );
  }
);
