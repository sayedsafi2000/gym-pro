const { test, expect } = require('@playwright/test');
const { login, apiLogin, authHeaders } = require('./helpers');

test.describe('6. Member Details', () => {
  let token, members;

  test.beforeAll(async ({ request }) => {
    token = await apiLogin(request);
    const res = await request.get('/api/members', { headers: authHeaders(token) });
    members = (await res.json()).data;
  });

  test('6.1 Header shows name, ID, status', async ({ page }) => {
    await login(page);
    const m = members[0];
    await page.goto(`/members/${m._id}`);
    await page.waitForTimeout(3000);
    await expect(page.locator(`text=${m.name}`).first()).toBeVisible();
    await expect(page.locator(`text=${m.memberId}`).first()).toBeVisible();
  });

  test('6.2 Personal information section', async ({ page }) => {
    await login(page);
    await page.goto(`/members/${members[0]._id}`);
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Personal Information')).toBeVisible();
    await expect(page.locator('text=Phone').first()).toBeVisible();
    await expect(page.locator('text=Gender').first()).toBeVisible();
    await expect(page.locator('text=Join Date').first()).toBeVisible();
  });

  test('6.3 Financial summary', async ({ page }) => {
    await login(page);
    await page.goto(`/members/${members[0]._id}`);
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Financial')).toBeVisible();
    await expect(page.locator('text=Total').first()).toBeVisible();
    await expect(page.locator('text=Paid').first()).toBeVisible();
    await expect(page.locator('text=Due').first()).toBeVisible();
  });

  test('6.4 Subscription history table', async ({ page }) => {
    await login(page);
    await page.goto(`/members/${members[0]._id}`);
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Subscription History')).toBeVisible({ timeout: 5000 });
  });

  test('6.5 Active member shows check-in button', async ({ page }) => {
    await login(page);
    const active = members.find(m => !m.expiryDate || new Date(m.expiryDate) >= new Date());
    if (!active) { test.skip('No active member'); return; }
    await page.goto(`/members/${active._id}`);
    await page.waitForTimeout(3000);
    const btn = page.locator('button:has-text("Check In"), button:has-text("Check Out")');
    await expect(btn).toBeVisible({ timeout: 5000 });
  });

  test('6.6 Expired member shows renew button', async ({ page }) => {
    await login(page);
    const expired = members.find(m => m.expiryDate && new Date(m.expiryDate) < new Date());
    if (!expired) { test.skip('No expired member'); return; }
    await page.goto(`/members/${expired._id}`);
    await page.waitForTimeout(3000);
    await expect(page.locator('button:has-text("Renew Membership")')).toBeVisible({ timeout: 5000 });
  });

  test('6.7 Lifetime member shows no progress bar', async ({ page }) => {
    await login(page);
    const lifetime = members.find(m => !m.expiryDate);
    if (!lifetime) { test.skip('No lifetime member'); return; }
    await page.goto(`/members/${lifetime._id}`);
    await page.waitForTimeout(3000);
    // Progress bar has text "days left" or "Expired" — lifetime should not have it
    expect(await page.locator('text=days left').count()).toBe(0);
  });

  test('6.8 Payment history table visible', async ({ page }) => {
    await login(page);
    await page.goto(`/members/${members[0]._id}`);
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Payment History')).toBeVisible();
  });

  test('6.9 Edit member link works', async ({ page }) => {
    await login(page);
    await page.goto(`/members/${members[0]._id}`);
    await page.waitForTimeout(3000);
    await page.locator('a:has-text("Edit Member")').click();
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Personal Information')).toBeVisible();
  });

  test('6.10 API: Member details include package data', async ({ request }) => {
    const res = await request.get(`/api/members/${members[0]._id}`, { headers: authHeaders(token) });
    const { data } = await res.json();
    expect(data.packageId).toBeTruthy();
    expect(data.packageId.name).toBeTruthy();
    expect(data.packageId.priceGents).toBeDefined();
  });
});
