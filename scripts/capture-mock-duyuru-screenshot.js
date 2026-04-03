const { chromium } = require("playwright");

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto("https://bpmyo.nny.edu.tr/", { waitUntil: "domcontentloaded" });

  await page.route("https://bpmyo.nny.edu.tr/api/mock/duyuru", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        source: "playwright-route-mock",
        title: "BPMYO Mock Duyuru - Yeni Etkinlik",
      }),
    });
  });

  await page.evaluate(async () => {
    const response = await fetch("https://bpmyo.nny.edu.tr/api/mock/duyuru");
    const data = await response.json();

    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, div, span"));
    const duyurularHeading = headings.find((node) => node.textContent?.trim() === "Duyurular");

    const hostContainer =
      duyurularHeading?.parentElement?.parentElement ??
      document.body;

    const firstAnnouncementLink = document.querySelector('a[href*="?p=announcement&id="]');

    if (firstAnnouncementLink) {
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

    let node = document.getElementById("mocked-bpmyo-title");
    if (!node) {
      node = document.createElement("div");
      node.id = "mocked-bpmyo-title";
      node.style.background = "#fff7d6";
      node.style.border = "2px solid #d18b00";
      node.style.borderRadius = "10px";
      node.style.padding = "10px 12px";
      node.style.margin = "10px 0";
      node.style.maxWidth = "100%";
      node.style.fontFamily = "Arial, sans-serif";
      node.style.fontSize = "18px";
      node.style.fontWeight = "700";
      node.style.color = "#4a2f00";
      node.style.boxShadow = "0 8px 20px rgba(0,0,0,0.18)";

      if (duyurularHeading?.parentElement) {
        duyurularHeading.parentElement.insertAdjacentElement("afterend", node);
      } else {
        hostContainer.prepend(node);
      }
    }

    node.textContent = data.title;
  });

  await page.waitForTimeout(600);
  const duyurularHeading = page.getByText("Duyurular", { exact: true }).first();
  await duyurularHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "reports/screenshots/mock-duyuru-full.png", fullPage: true });
  await page.locator("#mocked-bpmyo-title").screenshot({ path: "reports/screenshots/mock-duyuru-bolumu.png" });

  await browser.close();
  console.log("Saved: reports/screenshots/mock-duyuru-full.png");
  console.log("Saved: reports/screenshots/mock-duyuru-bolumu.png");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
