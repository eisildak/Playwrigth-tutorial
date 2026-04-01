import { Given, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CustomWorld } from "../support/world";

type NavigationError = {
  fromUrl: string;
  targetUrl: string;
  reason: string;
};

type ContinuousNavResult = {
  startUrl: string;
  maxPages: number;
  processedPages: number;
  clickedLinks: number;
  limitReached: boolean;
  pendingQueueCount: number;
  navigationErrors: NavigationError[];
};

type HeaderNavWorld = CustomWorld & {
  continuousNavResult?: ContinuousNavResult;
};

const NON_HTML_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".ico",
  ".css",
  ".js",
  ".map",
  ".pdf",
  ".zip",
  ".rar",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".mp4",
  ".mp3",
  ".wav",
]);

function normalizeUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  parsed.hash = "";

  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  return parsed.toString();
}

function isNavigableHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (!(parsed.protocol === "http:" || parsed.protocol === "https:")) {
      return false;
    }

    const path = parsed.pathname.toLowerCase();
    for (const ext of NON_HTML_EXTENSIONS) {
      if (path.endsWith(ext)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

async function extractLinks(page: NonNullable<CustomWorld["page"]>, selector: string): Promise<string[]> {
  return page.evaluate((containerSelector) => {
    const roots = Array.from(document.querySelectorAll(containerSelector));
    const fallbackRoots = roots.length > 0 ? roots : [document.body];

    const links = new Set<string>();
    for (const root of fallbackRoots) {
      const anchors = root.querySelectorAll("a[href]");
      for (const anchor of Array.from(anchors)) {
        const href = anchor.getAttribute("href")?.trim();
        if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) {
          continue;
        }

        try {
          const absolute = new URL(href, window.location.href);
          links.add(absolute.toString());
        } catch {
          // Ignore invalid URLs.
        }
      }
    }

    return [...links];
  }, selector);
}

Given(
  "I run continuous header navigation crawl on {string} with max {int} pages",
  { timeout: 10 * 60 * 1000 },
  async function (this: HeaderNavWorld, startUrl: string, maxPages: number) {
    const page = this.page;
    assert.ok(page, "Expected browser page to be initialized in World");
    assert.ok(maxPages > 0, "maxPages must be greater than 0");

    const normalizedStartUrl = normalizeUrl(startUrl);
    const startOrigin = new URL(normalizedStartUrl).origin;

    await page.goto(normalizedStartUrl, { waitUntil: "domcontentloaded", timeout: 20000 });

    const headerLinks = await extractLinks(page, "header, .main-header, nav, .menu");
    const queue: string[] = [];
    const queued = new Set<string>();
    const visited = new Set<string>();
    const navigationErrors: NavigationError[] = [];
    let clickedLinks = 0;

    const queueIfEligible = (urlText: string): void => {
      if (!isNavigableHttpUrl(urlText)) {
        return;
      }

      const normalized = normalizeUrl(urlText);
      let parsed: URL;
      try {
        parsed = new URL(normalized);
      } catch {
        return;
      }

      if (parsed.origin !== startOrigin) {
        return;
      }

      if (!queued.has(normalized) && !visited.has(normalized)) {
        queued.add(normalized);
        queue.push(normalized);
      }
    };

    queueIfEligible(normalizedStartUrl);
    for (const link of headerLinks) {
      queueIfEligible(link);
    }

    while (queue.length > 0 && visited.size < maxPages) {
      const sourceUrl = queue.shift();
      if (!sourceUrl) {
        continue;
      }

      if (visited.has(sourceUrl)) {
        continue;
      }

      try {
        await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
      } catch (error) {
        navigationErrors.push({
          fromUrl: sourceUrl,
          targetUrl: sourceUrl,
          reason: `Source navigation failed: ${(error as Error).message}`,
        });
        visited.add(sourceUrl);
        continue;
      }

      visited.add(sourceUrl);

      const contentLinks = await extractLinks(page, "main, .main, .main-content, .blog-content, body");
      for (const rawTarget of contentLinks) {
        if (!isNavigableHttpUrl(rawTarget)) {
          continue;
        }

        const targetUrl = normalizeUrl(rawTarget);
        let targetParsed: URL;
        try {
          targetParsed = new URL(targetUrl);
        } catch {
          continue;
        }

        if (targetParsed.origin !== startOrigin) {
          continue;
        }

        clickedLinks += 1;

        try {
          const response = await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
          const status = response?.status() ?? 0;
          if (status >= 400) {
            navigationErrors.push({
              fromUrl: sourceUrl,
              targetUrl,
              reason: `HTTP ${status}`,
            });
          }

          const discovered = await extractLinks(page, "main, .main, .main-content, .blog-content, body");
          for (const discoveredUrl of discovered) {
            queueIfEligible(discoveredUrl);
          }

          const backResponse = await page.goBack({ waitUntil: "domcontentloaded", timeout: 20000 });
          if (!backResponse) {
            navigationErrors.push({
              fromUrl: sourceUrl,
              targetUrl,
              reason: "Could not go back in browser history",
            });
            await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
          }
        } catch (error) {
          navigationErrors.push({
            fromUrl: sourceUrl,
            targetUrl,
            reason: (error as Error).message,
          });

          try {
            await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
          } catch {
            // Ignore recovery failures; next loop iteration will continue.
          }
        }
      }
    }

    const pendingQueueCount = queue.filter((urlText) => !visited.has(urlText)).length;
    const limitReached = pendingQueueCount > 0 && visited.size >= maxPages;

    this.continuousNavResult = {
      startUrl: normalizedStartUrl,
      maxPages,
      processedPages: visited.size,
      clickedLinks,
      limitReached,
      pendingQueueCount,
      navigationErrors: navigationErrors.slice(0, 100),
    };

    await this.attach(JSON.stringify(this.continuousNavResult, null, 2), "application/json");
  }
);

Then("I should not hit crawl limit in continuous header navigation", function (this: HeaderNavWorld) {
  assert.ok(this.continuousNavResult, "Expected continuous navigation result to be available");

  const result = this.continuousNavResult;
  assert.equal(
    result.limitReached,
    false,
    `Crawl limit reached. Start: ${result.startUrl}, Max pages: ${result.maxPages}, Processed: ${result.processedPages}, Pending queue: ${result.pendingQueueCount}`
  );
});

Then("I should not see navigation errors in continuous header navigation", function (this: HeaderNavWorld) {
  assert.ok(this.continuousNavResult, "Expected continuous navigation result to be available");

  const result = this.continuousNavResult;
  const errorText = result.navigationErrors
    .map((err) => `FROM ${err.fromUrl} -> TO ${err.targetUrl} (${err.reason})`)
    .join("\n");

  assert.equal(
    result.navigationErrors.length,
    0,
    `Navigation errors found: ${result.navigationErrors.length}\n${errorText}`
  );
});
