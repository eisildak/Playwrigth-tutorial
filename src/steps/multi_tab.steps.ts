import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { Page } from "playwright";
import { CustomWorld } from "../support/world";

type MultiTabWorld = CustomWorld & {
  openedTab?: Page;
};

Given("I open the bpmyo homepage for multi tab check", async function (this: MultiTabWorld) {
  const page = this.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  await page.goto("https://bpmyo.nny.edu.tr/", { waitUntil: "domcontentloaded" });
});

When("I click Formlar and open it in a new tab", async function (this: MultiTabWorld) {
  const page = this.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  const link = page.getByRole("link", { name: /Formlar/i }).first();
  await link.waitFor({ state: "visible", timeout: 10000 });

  const href = await link.getAttribute("href");
  assert.ok(href, "Expected Formlar link to have href");

  const context = page.context();
  let newTab: Page | undefined;

  // Ilk deneme: Mac ortaminda Cmd+Click ile yeni sekme acmayi dener.
  try {
    const tabPromise = context.waitForEvent("page", { timeout: 7000 });
    await page.keyboard.down("Meta");
    await link.click();
    await page.keyboard.up("Meta");
    newTab = await tabPromise;
  } catch {
    // Fallback: Site ayni sekmede acarsa da multi-tab testini
    // yine yapmak icin URL'i yeni sekmede aciyoruz.
    const tabPromise = context.waitForEvent("page", { timeout: 7000 });
    await page.evaluate((url) => window.open(url, "_blank"), href);
    newTab = await tabPromise;
  }

  assert.ok(newTab, "Expected a new tab to be opened for Formlar page");
  await newTab.waitForLoadState("domcontentloaded");
  this.openedTab = newTab;
});

Then("the newly opened tab url should be {string}", async function (this: MultiTabWorld, expectedUrl: string) {
  const tab = this.openedTab;
  assert.ok(tab, "Expected newly opened tab to be available in World");

  await tab.waitForURL(/oidb\.nny\.edu\.tr\/\?p=content&id=302/, { timeout: 15000 });
  const actual = tab.url();
  assert.equal(actual, expectedUrl, `Expected new tab url to be \"${expectedUrl}\", got \"${actual}\"`);
});

Then("I should see the {string} heading in the new tab", async function (this: MultiTabWorld, headingText: string) {
  const tab = this.openedTab;
  assert.ok(tab, "Expected newly opened tab to be available in World");

  const heading = tab.getByRole("heading", { name: new RegExp(headingText, "i") }).first();
  await heading.waitFor({ state: "visible", timeout: 15000 });
  assert.equal(await heading.isVisible(), true, `Expected heading \"${headingText}\" to be visible`);
});

Then("I should see key form elements in the new tab", async function (this: MultiTabWorld) {
  const tab = this.openedTab;
  assert.ok(tab, "Expected newly opened tab to be available in World");

  // Bu metinler Formlar sayfasinda bulunan ana icerigi dogrular.
  const contentMenu = tab.getByText("İçerik Menüsü", { exact: false }).first();
  const formItemOne = tab.getByText("Ders Alma Talep Formu", { exact: false }).first();
  const formItemTwo = tab.getByText("İlişik Kesme Formu", { exact: false }).first();

  await contentMenu.waitFor({ state: "visible", timeout: 15000 });
  await formItemOne.waitFor({ state: "visible", timeout: 15000 });
  await formItemTwo.waitFor({ state: "visible", timeout: 15000 });

  assert.equal(await contentMenu.isVisible(), true, "Expected 'İçerik Menüsü' to be visible");
  assert.equal(await formItemOne.isVisible(), true, "Expected 'Ders Alma Talep Formu' to be visible");
  assert.equal(await formItemTwo.isVisible(), true, "Expected 'İlişik Kesme Formu' to be visible");
});
