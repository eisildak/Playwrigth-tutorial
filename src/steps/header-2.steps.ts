import { Given, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CustomWorld } from "../support/world";

type QuickLinkCheckResult = {
  url: string;
  status?: number;
  error?: string;
};

type Header2World = CustomWorld & {
  quickLinkCheckResult?: QuickLinkCheckResult;
};

async function getQuickStatus(
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
    if (status < 400) {
      return status;
    }
  } catch {
    // Fallback to GET below.
  }

  const getResponse = await request.get(url, {
    failOnStatusCode: false,
    timeout: 15000,
    maxRedirects: 5,
  });

  return getResponse.status();
}

Given(
  "I run a quick link availability check on {string}",
  async function (this: Header2World, url: string) {
    assert.ok(this.page, "Expected browser page to be initialized in World");

    this.quickLinkCheckResult = { url };

    try {
      const status = await getQuickStatus(this.page.request, url);
      this.quickLinkCheckResult.status = status;
    } catch (error) {
      this.quickLinkCheckResult.error = (error as Error).message;
    }

    await this.attach(JSON.stringify(this.quickLinkCheckResult, null, 2), "application/json");
  }
);

Then("the quick link check should be successful", function (this: Header2World) {
  assert.ok(this.quickLinkCheckResult, "Expected quick link check result to be available");

  const result = this.quickLinkCheckResult;
  assert.equal(
    result.error,
    undefined,
    `Quick link check failed for ${result.url}: ${result.error}`
  );

  assert.ok(
    typeof result.status === "number" && result.status < 400,
    `Quick link check returned non-success status for ${result.url}: ${result.status}`
  );
});
