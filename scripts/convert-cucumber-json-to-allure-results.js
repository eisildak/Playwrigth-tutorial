const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");

const cucumberJsonPath = path.resolve(process.cwd(), "reports", "cucumber", "cucumber-report.json");
const allureResultsDir = path.resolve(process.cwd(), "reports", "allure-results");

function toAllureStatus(cucumberStatus) {
  if (cucumberStatus === "passed") return "passed";
  if (cucumberStatus === "failed") return "failed";
  if (cucumberStatus === "skipped" || cucumberStatus === "pending" || cucumberStatus === "undefined") return "skipped";
  return "broken";
}

function scenarioStatus(steps) {
  const statuses = (steps || []).map((step) => step?.result?.status || "unknown");
  if (statuses.includes("failed")) return "failed";
  if (statuses.every((s) => s === "skipped" || s === "pending" || s === "undefined")) return "skipped";
  if (statuses.every((s) => s === "passed")) return "passed";
  return "broken";
}

function scenarioDurationNs(steps) {
  return (steps || []).reduce((total, step) => total + Number(step?.result?.duration || 0), 0);
}

function ensureResultsDir() {
  if (fs.existsSync(allureResultsDir)) {
    fs.rmSync(allureResultsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(allureResultsDir, { recursive: true });
}

function md5(value) {
  return crypto.createHash("md5").update(value).digest("hex");
}

function writeResultFile(testResult) {
  const filename = `${testResult.uuid}-result.json`;
  const filePath = path.join(allureResultsDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(testResult, null, 2), "utf8");
}

function fileExtensionFromMimeType(mimeType) {
  if (!mimeType) return "bin";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "text/plain") return "txt";
  return "bin";
}

function writeAllureAttachment(base64Data, mimeType) {
  const ext = fileExtensionFromMimeType(mimeType);
  const source = `${crypto.randomUUID()}-attachment.${ext}`;
  const attachmentPath = path.join(allureResultsDir, source);
  const buffer = Buffer.from(base64Data || "", "base64");
  fs.writeFileSync(attachmentPath, buffer);
  return source;
}

function mapEmbeddingsToAttachments(step) {
  const embeddings = step?.embeddings || [];

  return embeddings.map((embedding, index) => {
    const mimeType = embedding?.mime_type || "application/octet-stream";
    const source = writeAllureAttachment(embedding?.data || "", mimeType);
    return {
      name: `${step?.name || "step"} attachment ${index + 1}`,
      source,
      type: mimeType
    };
  });
}

function buildAllureSteps(cucumberSteps, baseStartMs) {
  let cursor = baseStartMs;

  return (cucumberSteps || []).map((step) => {
    const status = toAllureStatus(step?.result?.status || "unknown");
    const durationMs = Math.max(1, Math.round(Number(step?.result?.duration || 0) / 1e6));
    const start = cursor;
    const stop = start + durationMs;
    cursor = stop;

    const allureStep = {
      name: step?.name || "Unnamed step",
      status,
      stage: "finished",
      steps: [],
      attachments: mapEmbeddingsToAttachments(step),
      parameters: [],
      start,
      stop
    };

    if (step?.result?.error_message) {
      allureStep.statusDetails = {
        message: step.result.error_message
      };
    }

    return allureStep;
  });
}

function run() {
  if (!fs.existsSync(cucumberJsonPath)) {
    throw new Error(`Cucumber JSON report not found at ${cucumberJsonPath}`);
  }

  const parsed = JSON.parse(fs.readFileSync(cucumberJsonPath, "utf8"));
  ensureResultsDir();

  let timeCursor = Date.now();

  for (const feature of parsed) {
    const featureName = feature?.name || "Unnamed feature";
    const featureUri = feature?.uri || "unknown.feature";

    for (const scenario of feature?.elements || []) {
      const scenarioName = scenario?.name || "Unnamed scenario";
      const fullName = `${featureName}: ${scenarioName}`;
      const uuid = crypto.randomUUID();
      const durationMs = Math.max(1, Math.round(scenarioDurationNs(scenario?.steps) / 1e6));
      const start = timeCursor;
      const stop = start + durationMs;
      timeCursor = stop + 1;

      const status = toAllureStatus(scenarioStatus(scenario?.steps));
      const steps = buildAllureSteps(scenario?.steps, start);

      const testResult = {
        uuid,
        historyId: md5(`${featureUri}:${scenarioName}`),
        testCaseId: md5(`${featureName}:${scenarioName}`),
        fullName,
        name: scenarioName,
        status,
        stage: "finished",
        steps,
        attachments: [],
        parameters: [],
        links: [],
        labels: [
          { name: "suite", value: featureName },
          { name: "feature", value: featureName },
          { name: "language", value: "typescript" },
          { name: "framework", value: "cucumber-js" },
          { name: "host", value: os.hostname() },
          { name: "thread", value: "main" }
        ],
        start,
        stop
      };

      if (status === "failed") {
        const failedStep = (scenario?.steps || []).find((s) => s?.result?.status === "failed");
        testResult.statusDetails = {
          message: failedStep?.result?.error_message || "Scenario failed"
        };
      }

      writeResultFile(testResult);
    }
  }
}

run();
