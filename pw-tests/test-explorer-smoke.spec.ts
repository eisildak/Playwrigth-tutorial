import { expect, test } from 'playwright/test';

test('Aday ana sayfa acilmali', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/adayogrenciler\.nny\.edu\.tr/);
  await expect(page.getByRole('link', { name: /Anasayfa/i }).first()).toBeVisible();
});
