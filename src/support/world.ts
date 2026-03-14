import { setDefaultTimeout, setWorldConstructor, World } from "@cucumber/cucumber";
import { Browser, BrowserContext, chromium, Page } from "playwright";

type WorldParams = {
  headless?: boolean;
  slowMo?: number;
};

class CustomWorld extends World<WorldParams> {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;

  async initBrowser(): Promise<void> {
    const headless = this.parameters.headless ?? true;
    const slowMo = this.parameters.slowMo ?? 0;
    this.browser = await chromium.launch({ headless, slowMo });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
  }

  async closeBrowser(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
  }
}

setDefaultTimeout(60 * 1000);
setWorldConstructor(CustomWorld);

export { CustomWorld };
