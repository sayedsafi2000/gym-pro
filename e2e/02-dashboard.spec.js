const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test.describe('2. Dashboard', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('2.1 Stats show on dashboard', async ({ page }) => {
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('text=Total Members')).toBeVisible();
  });

  test('2.2 No alerts or member status sections', async ({ page }) => {
    const alertsHeading = page.locator('h2:has-text("Alerts")');
    const memberStatusHeading = page.locator('h2:has-text("Member Status")');
    expect(await alertsHeading.count()).toBe(0);
    expect(await memberStatusHeading.count()).toBe(0);
  });

  test('2.3 Attendance cards visible', async ({ page }) => {
    await expect(page.locator('text=Check-ins Today')).toBeVisible();
    await expect(page.locator('text=Present Now')).toBeVisible();
  });

  test('2.4 Store analytics visible', async ({ page }) => {
    await expect(page.locator('text=Store Analytics')).toBeVisible();
    await expect(page.locator('text=Total Products')).toBeVisible();
  });

  test('2.5 Stat cards are clickable links', async ({ page }) => {
    const totalMembersCard = page.locator('a[href="/members"]:has-text("Total Members")');
    await expect(totalMembersCard).toBeVisible();
  });
});
