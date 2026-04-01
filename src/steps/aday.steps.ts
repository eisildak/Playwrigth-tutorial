import { Given, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CustomWorld } from "../support/world";

const PAGE_MAP: Record<string, string> = {
  "ana sayfa": "https://adayogrenciler.nny.edu.tr/",
  "kontenjanlar": "https://adayogrenciler.nny.edu.tr/2025kontenjanlar.php",
  "ucretlertaksit": "https://adayogrenciler.nny.edu.tr/2025ucretlertaksit-pesin.php",
  "barinma": "https://adayogrenciler.nny.edu.tr/barinma.php",
  "kampusteyasam": "https://adayogrenciler.nny.edu.tr/kampusteyasam.php",
  "egitim": "https://adayogrenciler.nny.edu.tr/egitim.php",
  "kariyer": "https://adayogrenciler.nny.edu.tr/kariyer.php",
};

Given("I open the Aday Öğrenciler {string} page", async function (this: CustomWorld, pageKey: string) {
  const page = this.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  const url = PAGE_MAP[pageKey];
  assert.ok(url, `Unsupported page key: ${pageKey}`);

  await page.goto(url);
  await page.waitForLoadState("domcontentloaded");
});

Then("social media icons should be visible and working", async function (this: CustomWorld) {
  const page = this.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  const socialLinks = await page.$$("a[href*='facebook.com'], a[href*='twitter.com'], a[href*='x.com'], a[href*='instagram.com'], a[href*='youtube.com'], a[href*='linkedin.com']");
  assert.ok(socialLinks.length > 0, "No social media icons/links found on the page");

  for (const link of socialLinks) {
    const href = await link.getAttribute("href");
    assert.ok(href && href.length > 0, "A social media link has no href attribute");
  }
});

Then("I should see the main page message", async function (this: CustomWorld) {
  const page = this.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  const bodyText = await page.locator("body").innerText();
  assert.ok(bodyText && bodyText.trim().length > 0, "Main page does not have any text content");
});

Then("all links on the page should work correctly", async function (this: CustomWorld) {
  const page = this.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  // Get all anchor tags with href on the page
  const links = await page.$$eval("a[href]", (elements) => 
    elements.map(el => (el as HTMLAnchorElement).href)
  );

  assert.ok(links.length > 0, "No links found on the page to test");

  const uniqueLinks = [...new Set(links)]
    .filter(href => href.startsWith('http') || href.startsWith('https'));

  const failedLinks: string[] = [];

  for (const href of uniqueLinks) {
    try {
      // Use head request to be faster, fallback to get if head is not allowed or fails.
      let response = await page.request.head(href, { timeout: 10000 });
      
      if (response.status() === 405 || response.status() === 404 || response.status() >= 500) {
          // If HEAD fails, try GET.
          response = await page.request.get(href, { timeout: 10000 });
      }

      const status = response.status();
      // Only consider 404, 500, etc as broken.
      // 403 or 401 might be valid endpoints that just require auth or block bots.
      if (status >= 400 && status !== 401 && status !== 403 && status !== 405) {
        failedLinks.push(`${href} (Status: ${status})`);
      }
    } catch (e) {
      // Ignore navigation errors for things like tel:, mailto:, javascript: which shouldn't be here since we filtered 'http' 
      // but timeout or network errors should be flagged
      const msg = (e as Error).message;
      if (!msg.includes("ERR_ABORTED") && !msg.includes("ERR_CONNECTION_REFUSED")) {
          failedLinks.push(`${href} (Error: ${msg})`);
      } else {
          // Keep refused connections as broken links
          failedLinks.push(`${href} (Conn Refused)`);
      }
    }
  }

  assert.equal(failedLinks.length, 0, `The following links are broken:\n${failedLinks.join('\n')}`);
});
