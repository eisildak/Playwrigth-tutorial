import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CustomWorld } from "../support/world";

type FooterWorld = CustomWorld & {
  contactFormSubmitted?: boolean;
  checkedFooterLinkUrl?: string;
  checkedFooterLinkStatus?: number;
  checkedFooterLinkError?: string;
  inspectedRectorUrl?: string;
  inspectedRectorHeading?: string;
  inspectedRectorContent?: string;
};

function normalizeTr(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

Given("I check footer link {string}", async function (this: FooterWorld, linkUrl: string) {
  assert.ok(this.page, "Expected browser page to be initialized in World");

  this.checkedFooterLinkUrl = linkUrl;
  this.checkedFooterLinkStatus = undefined;
  this.checkedFooterLinkError = undefined;

  try {
    const response = await this.page.request.get(linkUrl, {
      failOnStatusCode: false,
      timeout: 15000,
      maxRedirects: 5,
    });
    this.checkedFooterLinkStatus = response.status();
  } catch (error) {
    this.checkedFooterLinkError = (error as Error).message;
  }
});

Given("I open the contact page {string}", async function (this: FooterWorld, contactUrl: string) {
  assert.ok(this.page, "Expected browser page to be initialized in World");
  await this.page.goto(contactUrl, { waitUntil: "domcontentloaded" });

  await this.page.waitForSelector("#contact-form", { timeout: 15000 });
});

When("I submit the contact form with valid data", async function (this: FooterWorld) {
  assert.ok(this.page, "Expected browser page to be initialized in World");

  const uniqueSeed = Date.now();
  await this.page.fill("#name", `Footer Test ${uniqueSeed}`);
  await this.page.fill("#phone", "5551112233");
  await this.page.fill("#email", `footer.test.${uniqueSeed}@example.com`);
  await this.page.fill("#message", "Bu mesaj otomasyon testi tarafindan gonderilmektedir.");

  await this.page.click('#contact-form input[type="submit"]');
  this.contactFormSubmitted = true;
});

Then(
  "I should see a successful contact form submission message",
  async function (this: FooterWorld) {
    assert.ok(this.page, "Expected browser page to be initialized in World");
    assert.equal(this.contactFormSubmitted, true, "Expected contact form to be submitted");

    const successRegex = /(basari|başarı|mesajınız gönderildi|message sent|tesekkur|teşekkür)/i;

    await this.page.waitForTimeout(3000);

    const infoBoxText = (await this.page.locator("#form-messages").innerText().catch(() => "")).trim();
    const pageText = await this.page.locator("body").innerText();
    const hasSuccess = successRegex.test(infoBoxText) || successRegex.test(pageText);

    assert.ok(
      hasSuccess,
      "Contact form success message was not detected. This scenario is expected to fail until the contact form issue is fixed."
    );
  }
);

Then("the footer link should not return 404", function (this: FooterWorld) {
  assert.ok(this.checkedFooterLinkUrl, "Expected footer link url to be checked");
  assert.equal(
    this.checkedFooterLinkError,
    undefined,
    `Footer link request failed for ${this.checkedFooterLinkUrl}: ${this.checkedFooterLinkError}`
  );
  assert.notEqual(
    this.checkedFooterLinkStatus,
    404,
    `Footer link returned 404: ${this.checkedFooterLinkUrl}`
  );
});

Given("I inspect rector message link {string}", async function (this: FooterWorld, linkUrl: string) {
  assert.ok(this.page, "Expected browser page to be initialized in World");

  const response = await this.page.request.get(linkUrl, {
    failOnStatusCode: false,
    timeout: 15000,
    maxRedirects: 5,
  });

  const html = await response.text();
  const headingMatch = html.match(/<h4[^>]*class=["'][^"']*sm-title[^"']*["'][^>]*>([\s\S]*?)<\/h4>/i);
  const contentMatch = html.match(/<div[^>]*class=["'][^"']*blog-desc[^"']*["'][^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<\/div>/i);

  const stripTags = (value: string): string =>
    value
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

  this.inspectedRectorUrl = linkUrl;
  this.inspectedRectorHeading = stripTags(headingMatch?.[1] ?? "");
  this.inspectedRectorContent = stripTags(contentMatch?.[1] ?? "");
});

Then("rector message page should have correct heading and non-empty content", function (this: FooterWorld) {
  assert.ok(this.inspectedRectorUrl, "Expected rector message URL to be inspected");

  const heading = this.inspectedRectorHeading ?? "";
  const content = this.inspectedRectorContent ?? "";
  const normalizedHeading = normalizeTr(heading);
  const normalizedExpectedHeading = normalizeTr("Rektor Mesaji");
  const normalizedContent = normalizeTr(content);

  assert.equal(
    normalizedHeading,
    normalizedExpectedHeading,
    `Rector heading mismatch on ${this.inspectedRectorUrl}. Found: '${heading}', Expected: 'Rektor Mesaji'`
  );

  assert.ok(
    normalizedContent.length > 20 && normalizedContent !== "-",
    `Rector message content is empty or placeholder on ${this.inspectedRectorUrl}. Found content: '${content}'`
  );
});
