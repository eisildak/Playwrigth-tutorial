const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = process.cwd();
const allureResultsDir = path.resolve(rootDir, "reports", "allure-results");
const allureReportDir = path.resolve(rootDir, "reports", "allure-html");

function runCommand(binPath, args) {
  return spawnSync(binPath, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });
}

function cleanAllureResults() {
  if (fs.existsSync(allureResultsDir)) {
    fs.rmSync(allureResultsDir, { recursive: true, force: true });
  }
}

function run() {
  cleanAllureResults();

  const bddRunner = path.resolve(rootDir, "scripts", "run-bdd-with-report.js");
  const nodeBin = process.execPath;
  const bddArgs = [bddRunner, ...process.argv.slice(2)];

  const testResult = runCommand(nodeBin, bddArgs);
  const testExitCode = typeof testResult.status === "number" ? testResult.status : 1;

  const converterScript = path.resolve(rootDir, "scripts", "convert-cucumber-json-to-allure-results.js");
  const convertResult = runCommand(nodeBin, [converterScript]);
  const convertExitCode = typeof convertResult.status === "number" ? convertResult.status : 1;

  if (convertExitCode !== 0) {
    process.exit(convertExitCode);
  }

  const allureBin = path.resolve(rootDir, "node_modules", ".bin", "allure");
  const generateResult = runCommand(allureBin, [
    "generate",
    allureResultsDir,
    "--clean",
    "-o",
    allureReportDir
  ]);

  const generateExitCode = typeof generateResult.status === "number" ? generateResult.status : 1;

  if (generateExitCode !== 0) {
    process.exit(generateExitCode);
  }

  process.exit(testExitCode);
}

run();
