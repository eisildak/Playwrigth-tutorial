import { Given, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CustomWorld } from "../support/world";

type SecurityScanResult = {
  targetUrl: string;
  scannedResources: string[];
  findings: string[];
};

type SecurityWorld = CustomWorld & {
  securityScanResult?: SecurityScanResult;
  securityHeadersResult?: {
    targetUrl: string;
    missingHeaders: string[];
    presentHeaders: string[];
  };
  mixedContentResult?: {
    targetUrl: string;
    insecureReferences: string[];
  };
};

type SecretPattern = {
  name: string;
  regex: RegExp;
};

const SECRET_PATTERNS: SecretPattern[] = [
  { name: "jwt", regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { name: "aws-access-key", regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "github-token", regex: /\bgh[pousr]_[A-Za-z0-9]{20,255}\b/g },
  { name: "google-api-key", regex: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: "slack-token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: "bearer-token", regex: /\bBearer\s+[A-Za-z0-9._-]{20,}\b/gi },
  {
    name: "secret-assignment",
    regex: /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)\b\s*[:=]\s*["'][^"']{16,}["']/gi,
  },
  { name: "private-key-header", regex: /-----BEGIN (?:RSA|EC|OPENSSH|DSA|PGP|PRIVATE) KEY-----/g },
];

function normalizeUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  parsed.hash = "";
  return parsed.toString();
}

function extractScriptSrcList(html: string, baseUrl: string): string[] {
  const srcRegex = /<script[^>]*\ssrc=["']([^"']+)["'][^>]*>/gi;
  const found = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = srcRegex.exec(html)) !== null) {
    const src = match[1]?.trim();
    if (!src) {
      continue;
    }

    try {
      const absoluteUrl = new URL(src, baseUrl);
      if (absoluteUrl.protocol === "http:" || absoluteUrl.protocol === "https:") {
        found.add(absoluteUrl.toString());
      }
    } catch {
      // Ignore invalid script URLs.
    }
  }

  return [...found];
}

function extractHrefList(html: string, baseUrl: string): string[] {
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  const found = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1]?.trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
      continue;
    }

    try {
      const absoluteUrl = new URL(href, baseUrl);
      if (absoluteUrl.protocol === "http:" || absoluteUrl.protocol === "https:") {
        absoluteUrl.hash = "";
        found.add(absoluteUrl.toString());
      }
    } catch {
      // Ignore invalid href values.
    }
  }

  return [...found];
}

function isTextLikeContentType(contentType: string): boolean {
  const lower = contentType.toLowerCase();
  return (
    lower.includes("text/") ||
    lower.includes("javascript") ||
    lower.includes("json") ||
    lower.includes("xml")
  );
}

function collectMatches(content: string, sourceLabel: string): string[] {
  const findings: string[] = [];

  for (const pattern of SECRET_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const raw = match[0];
      const preview = raw.length > 100 ? `${raw.slice(0, 97)}...` : raw;
      findings.push(`[${pattern.name}] ${sourceLabel} => ${preview}`);

      if (findings.length >= 50) {
        return findings;
      }
    }
  }

  return findings;
}

Given(
  "I run a client-side secret scan on {string}",
  async function (this: SecurityWorld, targetUrl: string) {
    const page = this.page;
    assert.ok(page, "Expected browser page to be initialized in World");

    const normalizedTargetUrl = normalizeUrl(targetUrl);
    const scannedResources: string[] = [];
    const findings: string[] = [];

    const mainResponse = await page.request.get(normalizedTargetUrl, {
      failOnStatusCode: false,
      timeout: 15000,
      maxRedirects: 5,
    });

    const mainHtml = await mainResponse.text();
    scannedResources.push(normalizedTargetUrl);
    findings.push(...collectMatches(mainHtml, normalizedTargetUrl));

    const scriptUrls = extractScriptSrcList(mainHtml, normalizedTargetUrl).slice(0, 20);
    for (const scriptUrl of scriptUrls) {
      scannedResources.push(scriptUrl);

      try {
        const scriptResponse = await page.request.get(scriptUrl, {
          failOnStatusCode: false,
          timeout: 10000,
          maxRedirects: 5,
        });

        if (scriptResponse.status() >= 400) {
          continue;
        }

        const scriptText = await scriptResponse.text();
        findings.push(...collectMatches(scriptText, scriptUrl));
      } catch {
        // Network errors on scripts are ignored for this security content scan.
      }

      if (findings.length >= 50) {
        break;
      }
    }

    this.securityScanResult = {
      targetUrl: normalizedTargetUrl,
      scannedResources,
      findings,
    };

    await this.attach(JSON.stringify(this.securityScanResult, null, 2), "application/json");
  }
);

Given(
  "I run a deep client-side secret scan on all links in {string}",
  async function (this: SecurityWorld, targetUrl: string) {
    const page = this.page;
    assert.ok(page, "Expected browser page to be initialized in World");

    const normalizedTargetUrl = normalizeUrl(targetUrl);
    const scannedResources: string[] = [];
    const findings: string[] = [];
    const queued = new Set<string>();
    const toScanQueue: string[] = [];

    const queueIfNew = (rawUrl: string): void => {
      const normalized = normalizeUrl(rawUrl);
      if (!queued.has(normalized)) {
        queued.add(normalized);
        toScanQueue.push(normalized);
      }
    };

    queueIfNew(normalizedTargetUrl);

    while (toScanQueue.length > 0 && findings.length < 50) {
      const currentUrl = toScanQueue.shift();
      if (!currentUrl) {
        continue;
      }

      scannedResources.push(currentUrl);

      try {
        const response = await page.request.get(currentUrl, {
          failOnStatusCode: false,
          timeout: 15000,
          maxRedirects: 5,
        });

        if (response.status() >= 400) {
          continue;
        }

        const contentType = response.headers()["content-type"] ?? "";
        if (!isTextLikeContentType(contentType)) {
          continue;
        }

        const content = await response.text();
        findings.push(...collectMatches(content, currentUrl));

        if (!contentType.toLowerCase().includes("text/html")) {
          continue;
        }

        for (const discoveredUrl of extractHrefList(content, currentUrl)) {
          queueIfNew(discoveredUrl);
        }

        for (const scriptUrl of extractScriptSrcList(content, currentUrl)) {
          queueIfNew(scriptUrl);
        }
      } catch {
        // Network/read errors are ignored for broad link scanning.
      }
    }

    this.securityScanResult = {
      targetUrl: normalizedTargetUrl,
      scannedResources,
      findings,
    };

    await this.attach(JSON.stringify(this.securityScanResult, null, 2), "application/json");
  }
);

Then("I should not see any exposed tokens in scan results", function (this: SecurityWorld) {
  assert.ok(this.securityScanResult, "Expected security scan result to be available");

  const result = this.securityScanResult;
  const summary = [
    `Target URL: ${result.targetUrl}`,
    `Scanned resources: ${result.scannedResources.length}`,
    `Findings: ${result.findings.length}`,
  ].join("\n");

  assert.equal(
    result.findings.length,
    0,
    `${summary}\n\nPotential exposures:\n${result.findings.join("\n")}`
  );
});

Given(
  "I run a security headers check on {string}",
  async function (this: SecurityWorld, targetUrl: string) {
    const page = this.page;
    assert.ok(page, "Expected browser page to be initialized in World");

    const normalizedTargetUrl = normalizeUrl(targetUrl);
    const response = await page.request.get(normalizedTargetUrl, {
      failOnStatusCode: false,
      timeout: 15000,
      maxRedirects: 5,
    });

    const headers = response.headers();
    const requiredHeaders = [
      "content-security-policy",
      "x-content-type-options",
      "x-frame-options",
      "referrer-policy",
    ];

    const missingHeaders = requiredHeaders.filter((headerName) => !headers[headerName]);
    const presentHeaders = requiredHeaders.filter((headerName) => Boolean(headers[headerName]));

    this.securityHeadersResult = {
      targetUrl: normalizedTargetUrl,
      missingHeaders,
      presentHeaders,
    };

    await this.attach(JSON.stringify(this.securityHeadersResult, null, 2), "application/json");
  }
);

Then("I should see required security headers in response", function (this: SecurityWorld) {
  assert.ok(this.securityHeadersResult, "Expected security headers result to be available");

  const result = this.securityHeadersResult;
  assert.equal(
    result.missingHeaders.length,
    0,
    `Missing security headers for ${result.targetUrl}: ${result.missingHeaders.join(", ")}. Present: ${result.presentHeaders.join(", ")}`
  );
});

Given(
  "I run a mixed content check on {string}",
  async function (this: SecurityWorld, targetUrl: string) {
    const page = this.page;
    assert.ok(page, "Expected browser page to be initialized in World");

    const normalizedTargetUrl = normalizeUrl(targetUrl);
    const insecureReferences: string[] = [];

    const response = await page.request.get(normalizedTargetUrl, {
      failOnStatusCode: false,
      timeout: 15000,
      maxRedirects: 5,
    });

    const contentType = response.headers()["content-type"] ?? "";
    const body = contentType.toLowerCase().includes("text/html") ? await response.text() : "";

    if (normalizedTargetUrl.startsWith("https://") && body) {
      const attrRegex = /(?:src|href|action|data-href)\s*=\s*["'](http:\/\/[^"']+)["']/gi;
      const cssRegex = /url\((?:["'])?(http:\/\/[^)"']+)(?:["'])?\)/gi;

      let match: RegExpExecArray | null;
      while ((match = attrRegex.exec(body)) !== null) {
        insecureReferences.push(match[1]);
        if (insecureReferences.length >= 50) {
          break;
        }
      }

      while (insecureReferences.length < 50 && (match = cssRegex.exec(body)) !== null) {
        insecureReferences.push(match[1]);
      }
    }

    this.mixedContentResult = {
      targetUrl: normalizedTargetUrl,
      insecureReferences: [...new Set(insecureReferences)],
    };

    await this.attach(JSON.stringify(this.mixedContentResult, null, 2), "application/json");
  }
);

Then("I should not see any insecure http resource links", function (this: SecurityWorld) {
  assert.ok(this.mixedContentResult, "Expected mixed content result to be available");

  const result = this.mixedContentResult;
  assert.equal(
    result.insecureReferences.length,
    0,
    `Mixed content detected for ${result.targetUrl}:\n${result.insecureReferences.join("\n")}`
  );
});
