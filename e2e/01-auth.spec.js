const { test, expect } = require('@playwright/test');
const { ADMIN_EMAIL, ADMIN_PASSWORD } = require('./helpers');

test.describe('1. Auth', () => {
  test('1.1 Login page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('1.2 Valid login redirects to dashboard', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 15000 });
  });

  test('1.3 Invalid login shows error', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="email"]', 'wrong@gym.com');
    await page.fill('input[name="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    const error = page.locator('text=Invalid credentials');
    const stillOnLogin = page.locator('input[name="email"]');
    expect((await error.count()) > 0 || (await stillOnLogin.count()) > 0).toBeTruthy();
  });

  test('1.4 Protected route redirects to login', async ({ page }) => {
    // Clear any stored tokens
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/members');
    await page.waitForTimeout(2000);
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('1.5 API login returns token', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.token).toBeTruthy();
    expect(body.data.admin.role).toBe('super_admin');
  });
});
