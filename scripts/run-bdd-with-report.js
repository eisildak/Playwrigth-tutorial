const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { generateCucumberReport } = require("./generate-cucumber-report");

const reportsDir = path.resolve(process.cwd(), "reports");
const cucumberJsonDir = path.join(reportsDir, "cucumber");
const jsonReportPath = path.join(cucumberJsonDir, "cucumber-report.json");
const historyFilePath = path.join(reportsDir, "test-history.log");

function ensureReportsDir() {
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  if (!fs.existsSync(cucumberJsonDir)) {
    fs.mkdirSync(cucumberJsonDir, { recursive: true });
  }
}

function readJsonReport() {
  if (!fs.existsSync(jsonReportPath)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(jsonReportPath, "utf8"));
  } catch {
    return [];
  }
}

function summarizeRun(reportJson) {
  const summary = {
    scenarios: { total: 0, passed: 0, failed: 0, skipped: 0, other: 0 },
    steps: { total: 0, passed: 0, failed: 0, skipped: 0, other: 0 },
    durationNs: 0
  };

  for (const feature of reportJson) {
    for (const scenario of feature.elements || []) {
      summary.scenarios.total += 1;

      let scenarioFailed = false;
      let scenarioPassed = false;
      let scenarioSkipped = true;

      for (const step of scenario.steps || []) {
        const status = step?.result?.status || "other";
        summary.steps.total += 1;

        if (status === "passed") summary.steps.passed += 1;
        else if (status === "failed") summary.steps.failed += 1;
        else if (status === "skipped" || status === "pending" || status === "undefined") summary.steps.skipped += 1;
        else summary.steps.other += 1;

        summary.durationNs += Number(step?.result?.duration || 0);

        if (status === "failed") scenarioFailed = true;
        if (status === "passed") scenarioPassed = true;
        if (status !== "skipped" && status !== "pending" && status !== "undefined") {
          scenarioSkipped = false;
        }
      }

      if (scenarioFailed) summary.scenarios.failed += 1;
      else if (scenarioPassed) summary.scenarios.passed += 1;
      else if (scenarioSkipped) summary.scenarios.skipped += 1;
      else summary.scenarios.other += 1;
    }
  }

  return summary;
}

function appendHistory(summary, exitCode) {
  const durationSeconds = (summary.durationNs / 1e9).toFixed(3);
  const runStatus = exitCode === 0 ? "PASSED" : "FAILED";
  const line = [
    `[${new Date().toISOString()}]`,
    `status=${runStatus}`,
    `scenarios=${summary.scenarios.total}`,
    `passed=${summary.scenarios.passed}`,
    `failed=${summary.scenarios.failed}`,
    `skipped=${summary.scenarios.skipped}`,
    `steps=${summary.steps.total}`,
    `stepFailed=${summary.steps.failed}`,
    `durationSec=${durationSeconds}`
  ].join(" ");

  fs.appendFileSync(historyFilePath, `${line}\n`, "utf8");
}

function run() {
  ensureReportsDir();

  const cucumberArgs = [
    ...process.argv.slice(2),
    "--format",
    "progress",
    "--format",
    `json:${jsonReportPath}`
  ];

  const cucumberBin = path.resolve(process.cwd(), "node_modules", ".bin", "cucumber-js");
  const result = spawnSync(cucumberBin, cucumberArgs, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  const exitCode = typeof result.status === "number" ? result.status : 1;
  const reportJson = readJsonReport();
  const summary = summarizeRun(reportJson);

  generateCucumberReport();
  appendHistory(summary, exitCode);

  process.exit(exitCode);
}

run();
