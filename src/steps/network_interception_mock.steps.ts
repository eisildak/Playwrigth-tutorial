import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { CustomWorld } from "../support/world";

Given("I open a demo page that fetches a post from API", async function (this: CustomWorld) {
  const page = this.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  // Bu demo HTML, butona tiklaninca gercek bir API endpoint'ine fetch atar.
  // Bir sonraki adimda route interception ile bu istegi yakalayip mock response donecegiz.
  await page.setContent(`
    <main>
      <h1>Network Mock Demo</h1>
      <button id="load-post">Post Yukle</button>
      <p id="post-title">Henuz veri yok</p>
    </main>

    <script>
      const button = document.getElementById('load-post');
      const titleEl = document.getElementById('post-title');

      button.addEventListener('click', async () => {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
        const data = await response.json();
        titleEl.textContent = data.title;
      });
    </script>
  `);
});

Given(
  "I mock the post API response title as {string}",
  async function (this: CustomWorld, mockedTitle: string) {
    const page = this.page;
    assert.ok(page, "Expected browser page to be initialized in World");

    // Network Interception: posts/1 istegini yakala.
    // route.fulfill ile gercek sunucuya gitmeden bizim verdigimiz JSON cevabini don.
    await page.route("**/posts/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          // CORS blokajina takilmamak icin acikca izin veriyoruz.
          "access-control-allow-origin": "*",
        },
        body: JSON.stringify({
          userId: 999,
          id: 1,
          title: mockedTitle,
          body: "Bu icerik Playwright route interception ile mocklandi.",
        }),
      });
    });
  }
);

When("I trigger the API request from the page", async function (this: CustomWorld) {
  const page = this.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  // Butona tiklayarak browser tarafinda fetch'i tetikliyoruz.
  await page.getByRole("button", { name: "Post Yukle" }).click();
});

Given("I open the real bpmyo homepage", async function (this: CustomWorld) {
  const page = this.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  // Gercek ortam testi: once hedef domaini aciyoruz.
  await page.goto("https://bpmyo.nny.edu.tr/", { waitUntil: "domcontentloaded" });
});

Given(
  "I set a clear bpmyo API route mock at {string} with title {string}",
  async function (this: CustomWorld, routePath: string, mockedTitle: string) {
    const page = this.page;
    assert.ok(page, "Expected browser page to be initialized in World");

    // Belirgin route tanimi: bpmyo alaninda /api/mock/duyuru gibi acik bir yol.
    // Bu yol gercekte var olmak zorunda degil; route interception sayesinde istek yakalanip mock cevap donecek.
    await page.route(`https://bpmyo.nny.edu.tr${routePath}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          source: "playwright-route-mock",
          title: mockedTitle,
        }),
      });
    });
  }
);

When("I call the mocked bpmyo API route from the page", async function (this: CustomWorld) {
  const page = this.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  // Browser icinden fetch atip donen mock veriyi bu kez dogrudan
  // sayfadaki "Duyurular" bolumune yaziyoruz.
  await page.evaluate(async () => {
    const response = await fetch("https://bpmyo.nny.edu.tr/api/mock/duyuru");
    const data = await response.json();

    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, div, span"));
    const duyurularHeading = headings.find((node) => node.textContent?.trim() === "Duyurular");

    const hostContainer =
      duyurularHeading?.parentElement?.parentElement ??
      document.body;

    const firstAnnouncementLink = document.querySelector('a[href*="?p=announcement&id="]') as HTMLElement | null;

    if (firstAnnouncementLink) {
      // Asil hedef: Duyurular listesindeki ilk kaydi mock icerikle degistir.
      firstAnnouncementLink.textContent = data.title;
      firstAnnouncementLink.setAttribute("data-mock-duyuru", "true");
      firstAnnouncementLink.setAttribute("id", "mocked-bpmyo-title");
      firstAnnouncementLink.style.background = "#fff7d6";
      firstAnnouncementLink.style.border = "2px solid #d18b00";
      firstAnnouncementLink.style.borderRadius = "8px";
      firstAnnouncementLink.style.padding = "10px 12px";
      firstAnnouncementLink.style.display = "block";
      firstAnnouncementLink.style.marginBottom = "8px";
      firstAnnouncementLink.style.color = "#4a2f00";
      firstAnnouncementLink.style.fontWeight = "700";
      return;
    }

    let resultNode = document.getElementById("mocked-bpmyo-title");
    if (!resultNode) {
      resultNode = document.createElement("div");
      resultNode.id = "mocked-bpmyo-title";
      resultNode.style.background = "#fff7d6";
      resultNode.style.border = "2px solid #d18b00";
      resultNode.style.borderRadius = "10px";
      resultNode.style.padding = "10px 12px";
      resultNode.style.margin = "10px 0";
      resultNode.style.fontWeight = "700";
      resultNode.style.color = "#4a2f00";

      // Beklenen liste bulunamazsa fallback olarak Duyurular paneline ekleyelim.
      if (duyurularHeading?.parentElement) {
        duyurularHeading.parentElement.insertAdjacentElement("afterend", resultNode);
      } else {
        hostContainer.prepend(resultNode);
      }
    }

    resultNode.textContent = data.title;
  });
});

Then("I should see bpmyo mocked title {string} on the page", async function (this: CustomWorld, expectedTitle: string) {
  const page = this.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  // Gercek domainde tetiklenen route interception sonucu gelen title dogrulamasi.
  const titleElement = page.locator("#mocked-bpmyo-title, [data-mock-duyuru='true']").first();
  await titleElement.waitFor({ state: "visible", timeout: 5000 });
  await expectText(titleElement, expectedTitle);
});

Then("I should see mocked API title {string} on the page", async function (this: CustomWorld, expectedTitle: string) {
  const page = this.page;
  assert.ok(page, "Expected browser page to be initialized in World");

  // Ekranda gorulen metin mock cevaptaki title ile birebir ayni olmali.
  const titleElement = page.locator("#post-title");
  await titleElement.waitFor({ state: "visible", timeout: 5000 });
  await expectText(titleElement, expectedTitle);
});

async function expectText(locator: ReturnType<NonNullable<CustomWorld["page"]>["locator"]>, expected: string): Promise<void> {
  const actual = (await locator.textContent())?.trim() ?? "";
  assert.equal(actual, expected, `Expected mocked title to be "${expected}", got "${actual}"`);
}
