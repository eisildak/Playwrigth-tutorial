import { Given, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CustomWorld } from "../support/world";

type LinkCheckResult = {
  baseUrl: string;
  visitedPages: string[];
  checkedLinksCount: number;
  notFoundLinks: string[];
  serverErrors: string[];
  networkErrors: string[];
};

type LinkCheckWorld = CustomWorld & {
  linkCheckResult?: LinkCheckResult;
};

const STATIC_FILE_EXTENSIONS = new Set([
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
  const url = new URL(rawUrl);
  url.hash = "";

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}

function isHttpUrl(url: URL): boolean {
  return url.protocol === "http:" || url.protocol === "https:";
}

function isLikelyHtmlPage(urlText: string): boolean {
  const url = new URL(urlText);
  const lowerPath = url.pathname.toLowerCase();

  for (const extension of STATIC_FILE_EXTENSIONS) {
    if (lowerPath.endsWith(extension)) {
      return false;
    }
  }

  return true;
}

function extractLinksFromHtml(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;

  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1]?.trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
      continue;
    }

    try {
      const absolute = new URL(href, baseUrl);
      if (!isHttpUrl(absolute)) {
        continue;
      }
      links.push(normalizeUrl(absolute.toString()));
    } catch {
      // Invalid URL values are ignored.
    }
  }

  return links;
}

function extractClickableComponentLinksFromHtml(html: string, baseUrl: string): string[] {
  const links = new Set<string>();

  const dataHrefRegex = /data-href\s*=\s*["']([^"']+)["']/gi;
  const onclickNavigateRegex = /(location(?:\.href)?|window\.location(?:\.href)?|window\.open)\s*\(\s*["']([^"']+)["']/gi;
  const onclickAssignRegex = /(location(?:\.href)?|window\.location(?:\.href)?)\s*=\s*["']([^"']+)["']/gi;

  for (const href of extractLinksFromHtml(html, baseUrl)) {
    links.add(href);
  }

  let match: RegExpExecArray | null;

  while ((match = dataHrefRegex.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) {
      continue;
    }

    try {
      const absolute = new URL(raw, baseUrl);
      if (isHttpUrl(absolute)) {
        links.add(normalizeUrl(absolute.toString()));
      }
    } catch {
      // Ignore invalid data-href values.
    }
  }

  while ((match = onclickNavigateRegex.exec(html)) !== null) {
    const raw = match[2]?.trim();
    if (!raw || raw.startsWith("javascript:")) {
      continue;
    }

    try {
      const absolute = new URL(raw, baseUrl);
      if (isHttpUrl(absolute)) {
        links.add(normalizeUrl(absolute.toString()));
      }
    } catch {
      // Ignore invalid onclick target values.
    }
  }

  while ((match = onclickAssignRegex.exec(html)) !== null) {
    const raw = match[2]?.trim();
    if (!raw || raw.startsWith("javascript:")) {
      continue;
    }

    try {
      const absolute = new URL(raw, baseUrl);
      if (isHttpUrl(absolute)) {
        links.add(normalizeUrl(absolute.toString()));
      }
    } catch {
      // Ignore invalid onclick assignment target values.
    }
  }

  return [...links];
}

function extractFooterLinksFromHtml(html: string, baseUrl: string): string[] {
  const footerBlocks = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi) ?? [];
  if (footerBlocks.length > 0) {
    const footerHtml = footerBlocks.join("\n");
    return extractClickableComponentLinksFromHtml(footerHtml, baseUrl);
  }

  const lowerHtml = html.toLowerCase();
  const markerCandidates = [
    'class="footer',
    "class='footer",
    'class="bottom-footer',
    "class='bottom-footer",
    'id="footer',
    "id='footer",
  ];

  let startIndex = -1;
  for (const marker of markerCandidates) {
    const index = lowerHtml.indexOf(marker);
    if (index !== -1 && (startIndex === -1 || index < startIndex)) {
      startIndex = index;
    }
  }

  if (startIndex === -1) {
    return [];
  }

  const footerLikeHtml = html.slice(startIndex);
  return extractClickableComponentLinksFromHtml(footerLikeHtml, baseUrl);
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

    const headStatus = headResponse.status();
    if (headStatus === 404 || headStatus < 400) {
      return headStatus;
    }
  } catch {
    // Fallback to GET below.
  }

  const getResponse = await request.get(url, {
    failOnStatusCode: false,
    timeout: 10000,
    maxRedirects: 5,
  });

  return getResponse.status();
}

async function runLinkCrawl(
  world: LinkCheckWorld,
  startUrl: string,
  maxPages: number,
  includeClickableComponents: boolean
): Promise<void> {
  const page = world.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  const normalizedStartUrl = normalizeUrl(startUrl);
  const startOrigin = new URL(normalizedStartUrl).origin;

  const toVisitQueue: string[] = [normalizedStartUrl];
  const queued = new Set<string>(toVisitQueue);
  const visited = new Set<string>();
  const checkedLinks = new Set<string>();

  const notFoundLinks: string[] = [];
  const serverErrors: string[] = [];
  const networkErrors: string[] = [];

  while (toVisitQueue.length > 0 && visited.size < maxPages) {
    const currentPageUrl = toVisitQueue.shift();
    if (!currentPageUrl || visited.has(currentPageUrl)) {
      continue;
    }

    visited.add(currentPageUrl);
    checkedLinks.add(currentPageUrl);

    let pageResponse;
    try {
      pageResponse = await page.request.get(currentPageUrl, {
        failOnStatusCode: false,
        timeout: 15000,
        maxRedirects: 5,
      });
    } catch (error) {
      networkErrors.push(`${currentPageUrl} (Error: ${(error as Error).message})`);
      continue;
    }

    if (pageResponse.status() === 404) {
      notFoundLinks.push(`${currentPageUrl} (Status: 404)`);
      continue;
    }

    if (pageResponse.status() >= 500) {
      serverErrors.push(`${currentPageUrl} (Status: ${pageResponse.status()})`);
      continue;
    }

    const contentType = pageResponse.headers()["content-type"] ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      continue;
    }

    const html = await pageResponse.text();
    const foundLinks = includeClickableComponents
      ? extractClickableComponentLinksFromHtml(html, currentPageUrl)
      : extractLinksFromHtml(html, currentPageUrl);

    const uniqueFoundLinks = [...new Set(foundLinks)];

    for (const link of uniqueFoundLinks) {
      if (!checkedLinks.has(link)) {
        checkedLinks.add(link);

        try {
          const status = await getLinkStatus(page.request, link);
          if (status === 404) {
            notFoundLinks.push(`${link} (Status: 404)`);
          } else if (status >= 500) {
            serverErrors.push(`${link} (Status: ${status})`);
          }
        } catch (error) {
          networkErrors.push(`${link} (Error: ${(error as Error).message})`);
        }
      }

      const linkUrl = new URL(link);
      const isInternal = linkUrl.origin === startOrigin;

      if (!isInternal || !isLikelyHtmlPage(link)) {
        continue;
      }

      if (!visited.has(link) && !queued.has(link) && visited.size + queued.size < maxPages) {
        toVisitQueue.push(link);
        queued.add(link);
      }
    }
  }

  world.linkCheckResult = {
    baseUrl: normalizedStartUrl,
    visitedPages: [...visited],
    checkedLinksCount: checkedLinks.size,
    notFoundLinks,
    serverErrors,
    networkErrors,
  };

  await world.attach(
    JSON.stringify(world.linkCheckResult, null, 2),
    "application/json"
  );
}

async function runFooterComponentsCheck(
  world: LinkCheckWorld,
  startUrl: string
): Promise<void> {
  const page = world.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  const normalizedStartUrl = normalizeUrl(startUrl);
  const notFoundLinks: string[] = [];
  const serverErrors: string[] = [];
  const networkErrors: string[] = [];

  let pageResponse;
  try {
    pageResponse = await page.request.get(normalizedStartUrl, {
      failOnStatusCode: false,
      timeout: 15000,
      maxRedirects: 5,
    });
  } catch (error) {
    networkErrors.push(`${normalizedStartUrl} (Error: ${(error as Error).message})`);
    world.linkCheckResult = {
      baseUrl: normalizedStartUrl,
      visitedPages: [normalizedStartUrl],
      checkedLinksCount: 0,
      notFoundLinks,
      serverErrors,
      networkErrors,
    };
    await world.attach(JSON.stringify(world.linkCheckResult, null, 2), "application/json");
    return;
  }

  if (pageResponse.status() === 404) {
    notFoundLinks.push(`${normalizedStartUrl} (Status: 404)`);
  } else if (pageResponse.status() >= 500) {
    serverErrors.push(`${normalizedStartUrl} (Status: ${pageResponse.status()})`);
  }

  const contentType = pageResponse.headers()["content-type"] ?? "";
  const footerLinks =
    contentType.toLowerCase().includes("text/html")
      ? [...new Set(extractFooterLinksFromHtml(await pageResponse.text(), normalizedStartUrl))]
      : [];

  for (const link of footerLinks) {
    try {
      const status = await getLinkStatus(page.request, link);
      if (status === 404) {
        notFoundLinks.push(`${link} (Status: 404)`);
      } else if (status >= 500) {
        serverErrors.push(`${link} (Status: ${status})`);
      }
    } catch (error) {
      networkErrors.push(`${link} (Error: ${(error as Error).message})`);
    }
  }

  world.linkCheckResult = {
    baseUrl: normalizedStartUrl,
    visitedPages: [normalizedStartUrl],
    checkedLinksCount: footerLinks.length,
    notFoundLinks,
    serverErrors,
    networkErrors,
  };

  await world.attach(JSON.stringify(world.linkCheckResult, null, 2), "application/json");
}

Given(
  "I run a link crawl on {string} with max {int} pages",
  async function (this: LinkCheckWorld, startUrl: string, maxPages: number) {
    await runLinkCrawl(this, startUrl, maxPages, false);
  }
);

Given(
  "I run a clickable components crawl on {string} with max {int} pages",
  async function (this: LinkCheckWorld, startUrl: string, maxPages: number) {
    await runLinkCrawl(this, startUrl, maxPages, true);
  }
);

Given(
  "I run a footer components check on {string}",
  async function (this: LinkCheckWorld, startUrl: string) {
    await runFooterComponentsCheck(this, startUrl);
  }
);

Then("I should not see any 404 links in crawl results", function (this: LinkCheckWorld) {
  assert.ok(this.linkCheckResult, "Expected link crawl result to be available");

  const result = this.linkCheckResult;
  const summary = [
    `Base URL: ${result.baseUrl}`,
    `Visited pages: ${result.visitedPages.length}`,
    `Checked links: ${result.checkedLinksCount}`,
    `404 links: ${result.notFoundLinks.length}`,
    `5xx links: ${result.serverErrors.length}`,
    `Network errors: ${result.networkErrors.length}`,
  ].join("\n");

  assert.equal(
    result.notFoundLinks.length,
    0,
    `${summary}\n\n404 links:\n${result.notFoundLinks.join("\n")}`
  );
});

Then("I should not see any broken links in strict crawl results", function (this: LinkCheckWorld) {
  assert.ok(this.linkCheckResult, "Expected link crawl result to be available");

  const result = this.linkCheckResult;
  const summary = [
    `Base URL: ${result.baseUrl}`,
    `Visited pages: ${result.visitedPages.length}`,
    `Checked links: ${result.checkedLinksCount}`,
    `404 links: ${result.notFoundLinks.length}`,
    `5xx links: ${result.serverErrors.length}`,
    `Network errors: ${result.networkErrors.length}`,
  ].join("\n");

  const failures = [
    ...result.notFoundLinks,
    ...result.serverErrors,
    ...result.networkErrors,
  ];

  assert.equal(
    failures.length,
    0,
    `${summary}\n\nBroken links:\n${failures.join("\n")}`
  );
});

Then("I should not see any broken links in footer components", function (this: LinkCheckWorld) {
  assert.ok(this.linkCheckResult, "Expected footer check result to be available");

  const result = this.linkCheckResult;
  const summary = [
    `Base URL: ${result.baseUrl}`,
    `Checked footer links: ${result.checkedLinksCount}`,
    `404 links: ${result.notFoundLinks.length}`,
    `5xx links: ${result.serverErrors.length}`,
    `Network errors: ${result.networkErrors.length}`,
  ].join("\n");

  assert.ok(
    result.checkedLinksCount > 0,
    `${summary}\n\nNo footer links were detected.`
  );

  const failures = [
    ...result.notFoundLinks,
    ...result.serverErrors,
    ...result.networkErrors,
  ];

  assert.equal(
    failures.length,
    0,
    `${summary}\n\nBroken footer links:\n${failures.join("\n")}`
  );
});
