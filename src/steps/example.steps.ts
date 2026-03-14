import { Given, Then, When } from "@cucumber/cucumber";
import yaml from "js-yaml";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CustomWorld } from "../support/world";

type StepConstants = Record<string, string[]>;

const constantsPath = path.resolve(__dirname, "constant.yaml");
const stepConstants = yaml.load(fs.readFileSync(constantsPath, "utf8")) as StepConstants;

async function clickIletisimLink(page: NonNullable<CustomWorld["page"]>): Promise<void> {
  const linkText = stepConstants["iletişim link"]?.[0] ?? "İletişim";
  const targetHref = stepConstants["iletişim href"]?.[0] ?? "?p=contact";
  const links = page.getByRole("link", { name: linkText });
  const count = await links.count();

  for (let i = 0; i < count; i += 1) {
    const candidate = links.nth(i);
    const href = (await candidate.getAttribute("href")) ?? "";
    if (href.includes(targetHref) || href.includes("?p=contact")) {
      await candidate.click();
      return;
    }
  }

  assert.fail("No suitable 'İletişim' link found matching configured contact href.");
}

Given("I open the homepage", async function () {
  const world = this as CustomWorld;
  await world.page?.goto("https://www.nny.edu.tr/");
});

Given("I open the {string}", async function (this: CustomWorld, pageKey: string) {
  const world = this;
  const page = world.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  if (pageKey === "homepage") {
    await page.goto("https://www.nny.edu.tr/");
    return;
  }

  assert.fail(`Unsupported page key: ${pageKey}`);
});

Then("page title should contain {string}", async function (titlePart: string) {
  const world = this as CustomWorld;
  const title = await world.page?.title();
  assert.ok(title?.includes(titlePart), `Expected title to include \"${titlePart}\", got \"${title}\"`);
});

Then('I open the MYU homepage', async function () {
  const world = this as CustomWorld;
  const page = world.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  await page.goto("https://myo.nny.edu.tr/");
  await page.waitForLoadState('domcontentloaded');
});

When('I scroll to the bottom of the page', async function (this: CustomWorld) {
  const world = this;
  const page = world.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  });
  await page.waitForTimeout(500);
});

When('I wait for {int} seconds', async function (this: CustomWorld, seconds: number) {
  const world = this;
  const page = world.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  await page.waitForTimeout(seconds * 1000);
});

When('I click on the iletişim link', async function (this: CustomWorld) {
  const world = this;
  const page = world.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  await clickIletisimLink(page);
});

When('I click on the {string}', async function (this: CustomWorld, linkKey: string) {
  const world = this;
  const page = world.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  if (linkKey === "iletişim link") {
    await clickIletisimLink(page);
    return;
  }

  assert.fail(`Unsupported link key: ${linkKey}`);
});

When('I should see the {string}', async function (this: CustomWorld, headingKey: string) {
  const world = this;
  const page = world.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  const expectedText = stepConstants[headingKey]?.[0];
  assert.ok(expectedText, `Expected '${headingKey}' text in constant.yaml`);

  const heading = page.getByRole("heading", { name: expectedText });
  const textNode = page.getByText(expectedText).first();

  try {
    await heading.waitFor({ state: "visible", timeout: 5000 });
    assert.equal(await heading.isVisible(), true, `Expected ${headingKey} heading to be visible`);
  } catch {
    await textNode.waitFor({ state: "visible", timeout: 10000 });
    assert.equal(await textNode.isVisible(), true, `Expected ${headingKey} text to be visible`);
  }
});

When('I submit the contact form', async function (this: CustomWorld) {
  const world = this;
  const page = world.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  await page.getByRole('button', { name: 'Gönder' }).click();
});

When('I fill the contact form with valid data', async function (this: CustomWorld) {
  const world = this;
  const page = world.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  const adiniz = page.getByRole("textbox", { name: /ad\s*[ıi]n[ıi]z/i });
  const email = page.getByRole("textbox", { name: /e\s*posta\s*adresiniz/i });
  const telefon = page.getByRole("textbox", { name: /telefonunuz/i });
  const mesaj = page.getByRole("textbox", { name: /mesaj[ıi]n[ıi]z/i });

  await adiniz.waitFor({ state: "visible", timeout: 10000 });
  await adiniz.fill("bu bir testtir");
  await email.fill("bubirtesttir@gmail.com");
  await telefon.fill("05554443322");
  await mesaj.fill("beni dikkate al bu bir testtir");
});

