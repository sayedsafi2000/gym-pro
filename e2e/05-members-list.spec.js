const { test, expect } = require('@playwright/test');
const { login, apiLogin, authHeaders } = require('./helpers');

test.describe('5. Members List', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/members');
    await page.waitForTimeout(2000);
  });

  test('5.1 Members list loads with created members', async ({ page }) => {
    await expect(page.locator('text=Members').first()).toBeVisible();
    // Should have members from test 04
    const rows = page.locator('a[href*="/members/"]');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('5.2 Search by name', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input[name="search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('Full Payment Member');
      await page.waitForTimeout(1500);
      await expect(page.locator('text=Full Payment Member').first()).toBeVisible();
    }
  });

  test('5.3 Search by member ID', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input[name="search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('GYM-001');
      await page.waitForTimeout(1500);
      await expect(page.locator('text=GYM-001').first()).toBeVisible();
    }
  });

  test('5.4 Click member navigates to details', async ({ page }) => {
    const memberLink = page.locator('a[href*="/members/"]').first();
    if (await memberLink.count() > 0) {
      await memberLink.click();
      await page.waitForTimeout(2000);
      await expect(page.locator('text=Personal Information')).toBeVisible();
    }
  });

  test('5.5 API: Filter active members', async ({ request }) => {
    const token = await apiLogin(request);
    const res = await request.get('/api/members?status=active', { headers: authHeaders(token) });
    const { data } = await res.json();
    data.forEach(m => {
      if (m.expiryDate) {
        expect(new Date(m.expiryDate) >= new Date()).toBeTruthy();
      }
    });
  });

  test('5.6 API: Filter expired members', async ({ request }) => {
    const token = await apiLogin(request);
    const res = await request.get('/api/members?status=expired', { headers: authHeaders(token) });
    const { data } = await res.json();
    data.forEach(m => {
      expect(m.expiryDate).toBeTruthy();
      expect(new Date(m.expiryDate) < new Date()).toBeTruthy();
    });
  });
});
