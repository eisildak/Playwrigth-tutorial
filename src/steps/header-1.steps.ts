import { DataTable, Given, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CustomWorld } from "../support/world";

type BrokenLink = {
  text: string;
  url: string;
  error: string;
};

type ContentMismatch = {
  text: string;
  url: string;
  reason: string;
};

type HeaderDropdownCheckResult = {
  targetUrl: string;
  dropdownComponentCount: number;
  dropdownNames: string[];
  checkedLinksCount: number;
  nonClickableComponents: string[];
  brokenLinks: BrokenLink[];
  contentMismatches: ContentMismatch[];
};

type HeaderDropdownWorld = CustomWorld & {
  headerDropdownCheckResult?: HeaderDropdownCheckResult;
  qualityCommissionUrl?: string;
  qualityCommissionHeading?: string;
  qualityCommissionNameCount?: number;
};

const MAX_HEADER_LINKS_TO_VALIDATE = 12;

function normalizeUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  parsed.hash = "";
  return parsed.toString();
}

function extractMeaningfulTokens(text: string): string[] {
  const stopWords = new Set([
    "ana",
    "sayfa",
    "ve",
    "ile",
    "icin",
    "için",
    "the",
    "and",
    "or",
    "bir",
    "program",
    "bolum",
    "bölüm",
  ]);

  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9çğıöşü\s]/gi, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

function normalizeLabel(text: string): string {
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

async function getLinkStatus(
  request: NonNullable<CustomWorld["page"]>["request"],
  url: string
): Promise<number> {
  try {
    const headResponse = await request.head(url, {
      failOnStatusCode: false,
      timeout: 10000,
      maxRedirects: 5,
    });

    const status = headResponse.status();
    if (status === 404 || status < 400) {
      return status;
    }
  } catch {
    // Fallback to GET.
  }

  const getResponse = await request.get(url, {
    failOnStatusCode: false,
    timeout: 10000,
    maxRedirects: 5,
  });

  return getResponse.status();
}

Given(
  "I run a header dropdown link check on {string}",
  async function (this: HeaderDropdownWorld, url: string) {
    const page = this.page;
    assert.ok(page, "Expected browser page to be initialized in World");

    await page.goto(url, { waitUntil: "domcontentloaded" });

    const rawScan = await page.evaluate(() => {
      const navRoot =
        document.querySelector("header") ??
        document.querySelector("nav") ??
        document.querySelector(".menu") ??
        document.body;

      const dropdownItems = Array.from(navRoot.querySelectorAll("li")).filter((li) => {
        return (
          li.querySelector(":scope > ul") !== null ||
          li.querySelector(":scope > .sub-menu") !== null ||
          li.querySelector(":scope > .dropdown-menu") !== null
        );
      });

      const links: Array<{ text: string; href: string }> = [];
      const dropdownNames: string[] = [];
      const nonClickableComponents: string[] = [];

      for (const item of dropdownItems) {
        const trigger = item.querySelector(":scope > a") as HTMLAnchorElement | null;
        if (trigger) {
          const triggerText = (trigger.textContent ?? "").trim() || "(no-text)";
          const triggerHref = trigger.getAttribute("href") ?? "";

          links.push({ text: triggerText, href: triggerHref });
          dropdownNames.push(triggerText);

          const style = window.getComputedStyle(trigger);
          const rect = trigger.getBoundingClientRect();
          const clickable =
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0 &&
            style.pointerEvents !== "none";

          if (!clickable) {
            nonClickableComponents.push(triggerText);
          }
        }

        const submenuLinks = item.querySelectorAll("ul a, .sub-menu a, .dropdown-menu a");
        for (const subLink of Array.from(submenuLinks)) {
          const text = (subLink.textContent ?? "").trim() || "(no-text)";
          const href = subLink.getAttribute("href") ?? "";
          links.push({ text, href });
        }
      }

      return {
        dropdownComponentCount: dropdownItems.length,
        dropdownNames,
        nonClickableComponents,
        links,
      };
    });

    const brokenLinks: BrokenLink[] = [];
    const contentMismatches: ContentMismatch[] = [];
    const checked = new Set<string>();

    for (const entry of rawScan.links) {
      const href = entry.href.trim();
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
        continue;
      }

      let absoluteUrl: URL;
      try {
        absoluteUrl = new URL(href, url);
      } catch {
        continue;
      }

      if (!(absoluteUrl.protocol === "http:" || absoluteUrl.protocol === "https:")) {
        continue;
      }

      const normalized = normalizeUrl(absoluteUrl.toString());
      if (checked.has(normalized)) {
        continue;
      }

      if (checked.size >= MAX_HEADER_LINKS_TO_VALIDATE) {
        break;
      }

      checked.add(normalized);

      try {
        const status = await getLinkStatus(page.request, normalized);
        if (status === 404 || status >= 500) {
          brokenLinks.push({
            text: entry.text,
            url: normalized,
            error: `HTTP ${status}`,
          });
        }
      } catch (error) {
        brokenLinks.push({
          text: entry.text,
          url: normalized,
          error: (error as Error).message,
        });
        continue;
      }

      try {
        const pageResponse = await page.request.get(normalized, {
          failOnStatusCode: false,
          timeout: 10000,
          maxRedirects: 5,
        });

        const contentType = pageResponse.headers()["content-type"] ?? "";
        const responseText = contentType.toLowerCase().includes("text/html")
          ? await pageResponse.text()
          : "";
        const titleMatch = responseText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const h1Match = responseText.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const searchableText = `${titleMatch?.[1] ?? ""}\n${h1Match?.[1] ?? ""}\n${responseText}`
          .replace(/<[^>]+>/g, " ")
          .toLocaleLowerCase("tr-TR");
        const tokens = extractMeaningfulTokens(entry.text);

        if (tokens.length === 0) {
          continue;
        }

        const hasRelatedContent = tokens.some((token) => searchableText.includes(token));
        if (!hasRelatedContent) {
          contentMismatches.push({
            text: entry.text,
            url: normalized,
            reason: `No related content found for tokens: ${tokens.join(", ")}`,
          });
        }
      } catch (error) {
        contentMismatches.push({
          text: entry.text,
          url: normalized,
          reason: `Navigation failed: ${(error as Error).message}`,
        });
      }
    }

    this.headerDropdownCheckResult = {
      targetUrl: url,
      dropdownComponentCount: rawScan.dropdownComponentCount,
      dropdownNames: rawScan.dropdownNames,
      checkedLinksCount: checked.size,
      nonClickableComponents: rawScan.nonClickableComponents,
      brokenLinks,
      contentMismatches,
    };

    await this.attach(JSON.stringify(this.headerDropdownCheckResult, null, 2), "application/json");
  }
);

Then("all header dropdown components should be clickable", function (this: HeaderDropdownWorld) {
  assert.ok(this.headerDropdownCheckResult, "Expected header dropdown check result to be available");

  const result = this.headerDropdownCheckResult;
  assert.ok(result.dropdownComponentCount > 0, `No header dropdown component found on ${result.targetUrl}`);

  assert.equal(
    result.nonClickableComponents.length,
    0,
    `Non-clickable header dropdown components found:\n${result.nonClickableComponents.join("\n")}`
  );
});

Then("header dropdown names should include below values", function (this: HeaderDropdownWorld, table: DataTable) {
  assert.ok(this.headerDropdownCheckResult, "Expected header dropdown check result to be available");

  const result = this.headerDropdownCheckResult;
  const expectedNames = table.hashes().map((row) => row.name).filter((name) => Boolean(name));
  const normalizedActual = new Set(result.dropdownNames.map((name) => normalizeLabel(name)));

  const missing = expectedNames.filter((expected) => !normalizedActual.has(normalizeLabel(expected)));

  assert.equal(
    missing.length,
    0,
    `Missing expected header dropdown names: ${missing.join(", ")}\nDetected names: ${result.dropdownNames.join(", ")}`
  );
});

Then("clicked header links should open related content", function (this: HeaderDropdownWorld) {
  assert.ok(this.headerDropdownCheckResult, "Expected header dropdown check result to be available");

  const result = this.headerDropdownCheckResult;
  const summary = [
    `Target URL: ${result.targetUrl}`,
    `Dropdown components: ${result.dropdownComponentCount}`,
    `Checked links: ${result.checkedLinksCount}`,
    `Broken links: ${result.brokenLinks.length}`,
    `Content mismatches: ${result.contentMismatches.length}`,
  ].join("\n");

  const brokenDetails = result.brokenLinks
    .map((item) => `${item.text} -> ${item.url} (${item.error})`)
    .join("\n");
  const mismatchDetails = result.contentMismatches
    .map((item) => `${item.text} -> ${item.url} (${item.reason})`)
    .join("\n");

  assert.equal(
    result.brokenLinks.length + result.contentMismatches.length,
    0,
    `${summary}\n\nBroken links:\n${brokenDetails}\n\nContent mismatches:\n${mismatchDetails}`
  );
});

Given("I open quality commission page {string}", function (this: HeaderDropdownWorld, url: string) {
  this.qualityCommissionUrl = url;
});

Then(
  "I should see non-empty member names under {string} heading",
  async function (this: HeaderDropdownWorld, headingText: string) {
    assert.ok(this.page, "Expected browser page to be initialized in World");
    assert.ok(this.qualityCommissionUrl, "Expected quality commission URL to be set");

    const response = await this.page.request.get(this.qualityCommissionUrl, {
      failOnStatusCode: false,
      timeout: 15000,
      maxRedirects: 5,
    });

    const html = await response.text();
    const normalizedHeading = normalizeLabel(headingText);
    const normalizedHtmlText = normalizeLabel(html.replace(/<[^>]+>/g, " "));
    assert.ok(
      normalizedHtmlText.includes(normalizedHeading),
      `Heading not found: ${headingText}`
    );

    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/&nbsp;/gi, " ");

    const mainBlockMatch = cleaned.match(
      /<div class="col-md-9">[\s\S]*?<div class="blog-content">([\s\S]*?)<div class="col-md-3">/i
    );
    const mainBlockHtml = mainBlockMatch?.[1] ?? "";
    const areaText = mainBlockHtml
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const personLikeMatches = areaText.match(/\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}\b/g) ?? [];

    const filteredNames = personLikeMatches.filter((name) => {
      const normalized = normalizeLabel(name);
      return !normalized.includes("komisyon uyeleri") && !normalized.includes("anasayfa");
    });

    this.qualityCommissionHeading = headingText;
    this.qualityCommissionNameCount = filteredNames.length;

    assert.ok(
      filteredNames.length > 0,
      `No member names detected under '${headingText}' on ${this.qualityCommissionUrl}. This should fail when names are empty.`
    );
  }
);
