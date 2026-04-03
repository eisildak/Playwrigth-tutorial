# Playwright Intro + MCP Uygulama Kılavuzu

Bu not, Playwright resmi dokumanlarindaki baslangic sekmelerini (Intro, Writing tests, Codegen, Running tests, Trace Viewer, CI, VS Code, Coding agents, Playwright MCP, API testing, Assertions) bu repo icin uygulanabilir hale getirir.

## 1) Hızlı Baslangic (bu repo icin)

- Bagimliliklar:
  - `npm ci`
- Playwright tarayicilarini kur:
  - `npx playwright install --with-deps`
- BDD testleri calistir:
  - `npm run test:bdd`
- Sadece NNY API feature:
  - `npm run test:bdd -- features/nny_api.feature`

## 2) MCP ile Dogru Kurulum

Bu repodaki VS Code MCP ayari:

```json
{
  "servers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

Notlar:
- `servers` anahtari bu workspace akisi icin dogru sekildir.
- Baska MCP istemcilerinde ayni ayar genelde `mcpServers` altinda kullanilir.
- Headless calisma istersen args sonuna `--headless` eklenebilir.

## 3) MCP Ne Zaman, Playwright Test Ne Zaman?

- MCP kullan:
  - Kesif, manuel dogrulama, hizli smoke check, network/console gozlemi.
  - Ornek: menudeki link gorunurlugu, akis simulasyonu, ekran goruntusu alma.
- Test runner kullan:
  - Surekli regressions, CI, raporlama, tekrar calisan senaryolar.
  - Ornek: `features/*.feature` + `src/steps/*.steps.ts` yapisi.

## 4) Intro Sekmeleri - Ozet ve Aksiyon

### Installation (Intro)
- Baslangic komutu: `npm init playwright@latest`
- Rapor acma: `npx playwright show-report`
- UI mode: `npx playwright test --ui`

Bu repoda zaten kurulu oldugu icin odak noktasi: feature/step ekleyip hedefli calistirma.

### Writing tests
- Locator bazli web-first yaklasim.
- Auto-waiting sayesinde manuel sleep ihtiyaci azalir.
- Assertlerde async matchers tercih edilir.

### Generating tests (Codegen)
- Hizli prototip icin:
  - `npx playwright codegen https://adayogrenciler.nny.edu.tr`
- Uretilen kodu oldugu gibi birakmak yerine step yapisina uyarlamak gerekir.

### Running and debugging
- Hepsi: `npx playwright test`
- Headed: `npx playwright test --headed`
- UI: `npx playwright test --ui`
- Belirli test: `npx playwright test path/to/file.spec.ts`

BDD tarafinda benzeri hedefli calistirma:
- `npm run test:bdd -- features/nny_api.feature`
- `npm run test:bdd -- --name "acik token kontrolu" features/security_kontrol.feature`

### Trace viewer
- Trace acmak: `npx playwright show-report`
- Lokal zorla trace: `npx playwright test --trace on`

Bu repoda trace/network artifact akisi world+hooks katmaninda zaten var.

### CI intro
- GitHub Actions ile `npm ci`, `npx playwright install --with-deps`, test, artifact upload.
- Rapor/traceler hassas veri icerebilir; artefact guvenligi kritik.

### VS Code
- Test Explorer, debug, Show Browser, Trace Viewer entegrasyonu.
- Hata oldugunda editor icinden hizli tekrar calistirma avantajli.

### Coding agents (CLI)
- `playwright-cli` agent odakli, token-verimli bir secenek.
- MCP uzun sureli interaktif akislarda guclu.

### Playwright MCP
- A11y snapshot tabanli calisir (ref odakli etkileşim).
- Navigasyon, click/type/fill, tab, network, console, screenshot, run-code destekler.
- Gelismis ayarlar: `--headless`, `--browser=firefox`, `--config`, `--isolated`.

## 5) API Testing Pratikleri (bu repo ile hizali)

Playwright dokumanina gore iki model vardir:
- `page.request` / `context.request`: browser cookie state paylasir.
- `request.newContext()`: izole API context, bagimsiz cookie storage.

Bu repoda NNY API step'lerinde dogru model kullanildi:
- `request.newContext({ baseURL, timeout })`
- `apiContext.get(endpoint, { failOnStatusCode: false, maxRedirects: 5 })`
- Response body alindiktan sonra `response.dispose()`
- Is bitince `apiContext.dispose()`

## 6) Assertions Pratikleri

- Web kontrollerinde auto-retrying matcher tercih et.
  - Ornek: `await expect(locator).toBeVisible()`
- API kontrollerinde:
  - status, statusText, header, body ve response time birlikte dogrulanmali.
- Flaky endpointlerde:
  - `expect.poll` ile eventual consistency kontrolu.

## 7) Bu Reponun Onerilen Test Stratejisi

- Layer 1: Hızlı smoke
  - Baslik/menu/link gorunurluk + temel network kontrolu.
- Layer 2: BDD senaryo katmani
  - Feature bazli is akislari.
- Layer 3: API smoke + API contract-lite
  - NNY endpointleri icin status/body/header/time.
- Layer 4: Security kontrolleri
  - Acik token, header policy, mixed content.

## 8) Ornek Komut Seti (gunluk kullanim)

- Tum BDD:
  - `npm run test:bdd`
- Tek feature:
  - `npm run test:bdd -- features/nny_api.feature`
- Token kontrolu:
  - `npm run test:bdd -- --name "acik token kontrolu" features/security_kontrol.feature`
- HTML rapor:
  - `npm run cucumber-report`

## 9) Kısa Kontrol Listesi

- MCP baglandi mi?
- Testler hedefli calisiyor mu?
- Fail durumunda screenshot/trace var mi?
- API step'leri izole context kullaniyor mu?
- Raporlar artifacts altinda uretiliyor mu?

## 10) Sonraki Iyilestirmeler

- NNY API feature'a header dogrulamasi ekle (`content-type`, `cache-control`).
- API retry toleransi gereken endpointlerde `maxRetries` ve `expect.poll` uygula.
- Security taramasinda false-positive filtreleri kur (ozellikle public Google key kaliplari).
