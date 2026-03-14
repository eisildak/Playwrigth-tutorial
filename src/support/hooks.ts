import { After, AfterStep, Before, Status } from "@cucumber/cucumber";
import { CustomWorld } from "./world";

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

After(async function (this: CustomWorld, { result }) {
  if (result?.status === Status.FAILED && this.page) {
    // Fallback screenshot so report always has an image on failed scenarios.
    const screenshot = await this.page.screenshot({ fullPage: true });
    await this.attach(screenshot, "image/png");
  }

  await this.closeBrowser();
});