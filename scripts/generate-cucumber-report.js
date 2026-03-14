const fs = require("fs");
const path = require("path");
const reporter = require("multiple-cucumber-html-reporter");

function generateCucumberReport() {
  const reportsDir = path.resolve(process.cwd(), "reports");
  const cucumberJsonDir = path.join(reportsDir, "cucumber");

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  if (!fs.existsSync(cucumberJsonDir)) {
    fs.mkdirSync(cucumberJsonDir, { recursive: true });
  }

  reporter.generate({
    jsonDir: cucumberJsonDir,
    reportPath: path.join(reportsDir, "html"),
    pageTitle: "BDD Test Report",
    reportName: "Playwright + Cucumber Report",
    displayDuration: true,
    metadata: {
      browser: {
        name: "chromium",
        version: "latest"
      },
      device: "Local test machine",
      platform: {
        name: process.platform,
        version: process.version
      }
    },
    customData: {
      title: "Run info",
      data: [
        { label: "Project", value: "playwright_test" },
        { label: "Executed", value: new Date().toISOString() }
      ]
    }
  });
}

if (require.main === module) {
  generateCucumberReport();
}

module.exports = { generateCucumberReport };
