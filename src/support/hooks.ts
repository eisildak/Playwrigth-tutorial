import { After, AfterAll, AfterStep, Before, Status } from "@cucumber/cucumber";
import { spawn } from "node:child_process";
import path from "node:path";
import { CustomWorld } from "./world";

let latestTracePath: string | undefined;

Before(async function (this: CustomWorld) {
  await this.initBrowser();
});

AfterStep(async function (this: CustomWorld, { result }) {
  if (result?.status === Status.FAILED && this.page) {
    // Capture screenshot at the exact failing step.
    const screenshot = await this.page.screenshot({ fullPage: true });
    await this.attach(screenshot, "image/png");
  }
});

After(async function (this: CustomWorld, { pickle, result }) {
  if (result?.status === Status.FAILED && this.page) {
    // Fallback screenshot so report always has an image on failed scenarios.
    const screenshot = await this.page.screenshot({ fullPage: true });
    await this.attach(screenshot, "image/png");
  }

  const artifacts = await this.finalizeScenarioArtifacts(pickle.name, result?.status ?? "UNKNOWN");

  if (artifacts.tracePath) {
    latestTracePath = artifacts.tracePath;
    await this.attach(`Trace file: ${artifacts.tracePath}`, "text/plain");
  }

  if (artifacts.networkReportPath) {
    await this.attach(`Network report: ${artifacts.networkReportPath}`, "text/plain");
  }

  const violations = this.getNetworkThresholdViolations();
  if (violations.length > 0) {
    await this.attach(`Network threshold violations:\n- ${violations.join("\n- ")}`, "text/plain");
    throw new Error(`Network threshold validation failed:\n- ${violations.join("\n- ")}`);
  }

  await this.closeBrowser();
});

AfterAll(async function () {
  if (process.env.OPEN_TRACE_VIEWER !== "1" || !latestTracePath) {
    return;
  }

  try {
    const playwrightBin = path.resolve(
      process.cwd(),
      "node_modules",
      ".bin",
      process.platform === "win32" ? "playwright.cmd" : "playwright"
    );

    const child = spawn(playwrightBin, ["show-trace", latestTracePath], {
      detached: true,
      stdio: "ignore",
      shell: process.platform === "win32"
    });
    child.unref();
  } catch (error) {
    console.error("Could not open Trace Viewer automatically:", error);
  }
});