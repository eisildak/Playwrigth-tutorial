import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { request } from "playwright";
import { CustomWorld } from "../support/world";

type ApiWorld = CustomWorld & {
  apiBaseUrl?: string;
  apiResponseUrl?: string;
  apiResponseOk?: boolean;
  apiResponseStatus?: number;
  apiResponseStatusText?: string;
  apiResponseHeaders?: Record<string, string>;
  apiResponseBody?: string;
  apiResponseDurationMs?: number;
};

Given("I set NNY API base url to {string}", function (this: ApiWorld, baseUrl: string) {
  this.apiBaseUrl = baseUrl;
});

When("I send a GET request to {string}", async function (this: ApiWorld, endpoint: string) {
  assert.ok(this.apiBaseUrl, "Expected API base url to be set before request");
  const targetUrl = new URL(endpoint, this.apiBaseUrl).toString();
  const startedAt = Date.now();

  const apiContext = await request.newContext({
    baseURL: this.apiBaseUrl,
    timeout: 30000,
    ignoreHTTPSErrors: false
  });

  try {
    const response = await apiContext.get(endpoint, {
      failOnStatusCode: false,
      maxRedirects: 5
    });

    this.apiResponseUrl = response.url();
    this.apiResponseOk = response.ok();
    this.apiResponseStatus = response.status();
    this.apiResponseStatusText = response.statusText();
    this.apiResponseHeaders = response.headers();
    this.apiResponseBody = await response.text();
    this.apiResponseDurationMs = Date.now() - startedAt;
    await response.dispose();

    await this.attach(
      JSON.stringify(
        {
          requestedUrl: targetUrl,
          responseUrl: this.apiResponseUrl,
          ok: this.apiResponseOk,
          status: this.apiResponseStatus,
          statusText: this.apiResponseStatusText,
          headers: this.apiResponseHeaders,
          durationMs: this.apiResponseDurationMs
        },
        null,
        2
      ),
      "application/json"
    );
  } finally {
    await apiContext.dispose();
  }
});

Then("API response status should be {int}", function (this: ApiWorld, expectedStatus: number) {
  assert.ok(typeof this.apiResponseStatus === "number", "Expected API response status to be available");
  assert.equal(this.apiResponseStatus, expectedStatus);
});

Then("API response body should contain {string}", function (this: ApiWorld, expectedText: string) {
  assert.ok(this.apiResponseBody, "Expected API response body to be available");
  assert.ok(
    this.apiResponseBody.toLowerCase().includes(expectedText.toLowerCase()),
    `Expected response body to include \"${expectedText}\"`
  );
});

Then(
  "API response time should be less than {int} milliseconds",
  function (this: ApiWorld, maxDurationMs: number) {
    assert.ok(typeof this.apiResponseDurationMs === "number", "Expected API response duration to be available");
    assert.ok(
      this.apiResponseDurationMs < maxDurationMs,
      `Expected response time ${this.apiResponseDurationMs}ms to be less than ${maxDurationMs}ms`
    );
  }
);

Then("API response should be successful", function (this: ApiWorld) {
  assert.ok(typeof this.apiResponseOk === "boolean", "Expected API response success state to be available");
  assert.equal(this.apiResponseOk, true, "Expected API response to be successful (2xx)");
});

Then("API response status text should be {string}", function (this: ApiWorld, expectedStatusText: string) {
  assert.ok(this.apiResponseStatusText, "Expected API response status text to be available");
  assert.equal(this.apiResponseStatusText.toLowerCase(), expectedStatusText.toLowerCase());
});

Then(
  "API response header {string} should contain {string}",
  function (this: ApiWorld, headerName: string, expectedPart: string) {
    assert.ok(this.apiResponseHeaders, "Expected API response headers to be available");
    const headerValue = this.apiResponseHeaders[headerName.toLowerCase()];
    assert.ok(headerValue, `Expected response header \"${headerName}\" to exist`);
    assert.ok(
      headerValue.toLowerCase().includes(expectedPart.toLowerCase()),
      `Expected response header \"${headerName}\" to contain \"${expectedPart}\", got \"${headerValue}\"`
    );
  }
);
