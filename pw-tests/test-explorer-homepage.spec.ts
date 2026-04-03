import { expect, test } from 'playwright/test';

test('Ust menu linkleri gorunmeli', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: /Anasayfa/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Ucretler|Ücretler/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Egitim|Eğitim/i }).first()).toBeVisible();
});

test('Hero formunda temel alanlar gorunmeli', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('input[placeholder*="E-mail"]').first()).toBeVisible();
  await expect(page.locator('input[placeholder*="Telefon"]').first()).toBeVisible();
  await expect(page.locator('textarea[placeholder*="Mesaj"]').first()).toBeVisible();
  await expect(page.getByRole('combobox').first()).toBeVisible();
});

test('Header telefon numarasi gorunmeli', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText(/0352\s*324\s*00\s*00/).first()).toBeVisible();
});
