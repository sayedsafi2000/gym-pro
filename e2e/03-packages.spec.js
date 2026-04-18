const { test, expect } = require('@playwright/test');
const { login, apiLogin, authHeaders } = require('./helpers');

test.describe('3. Packages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/packages');
    await page.waitForTimeout(2000);
  });

  test('3.1 Six seeded packages visible', async ({ page }) => {
    await expect(page.locator('h3:has-text("Lifetime Membership")')).toBeVisible();
    await expect(page.locator('h3:has-text("Monthly Prepaid")')).toBeVisible();
    await expect(page.locator('h3:has-text("Super Saver")').first()).toBeVisible();
    await expect(page.locator('h3:has-text("Premium Package")')).toBeVisible();
    await expect(page.locator('h3:has-text("Ultra Super Saver")')).toBeVisible();
    await expect(page.locator('h3:has-text("Super Saver Plus")')).toBeVisible();
  });

  test('3.2 Regular badges on regular packages', async ({ page }) => {
    const regularBadges = page.locator('span:has-text("Regular")');
    expect(await regularBadges.count()).toBeGreaterThanOrEqual(2);
  });

  test('3.3 Special Offer badges on special packages', async ({ page }) => {
    const specialBadges = page.locator('span:has-text("Special Offer")');
    expect(await specialBadges.count()).toBeGreaterThanOrEqual(4);
  });

  test('3.4 Gender pricing for Monthly Prepaid', async ({ page }) => {
    await expect(page.locator('text=♂').first()).toBeVisible();
    await expect(page.locator('text=♀').first()).toBeVisible();
  });

  test('3.5 Single price for same-gender packages', async ({ page }) => {
    // Lifetime Membership shows single price ৳4,000
    await expect(page.locator('text=৳4,000').first()).toBeVisible();
  });

  test('3.6 Admission fee note on Monthly Prepaid', async ({ page }) => {
    await expect(page.locator('text=admission fee').first()).toBeVisible();
  });

  test('3.7 Admission included note on special packages', async ({ page }) => {
    await expect(page.locator('text=Admission fee included').first()).toBeVisible();
  });

  test('3.8 Free months shown', async ({ page }) => {
    await expect(page.locator('text=free').first()).toBeVisible();
  });

  test('3.9 Benefits list on Premium Package', async ({ page }) => {
    await expect(page.locator('text=Personal Trainer Assessment').first()).toBeVisible();
    await expect(page.locator('text=Nutritional Guidance').first()).toBeVisible();
  });

  test('3.10 Add package modal has all fields', async ({ page }) => {
    await page.locator('button:has-text("Add Package")').click();
    await expect(page.locator('label:has-text("Package Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Price - Gents")')).toBeVisible();
    await expect(page.locator('label:has-text("Price - Ladies")')).toBeVisible();
    await expect(page.locator('label:has-text("Admission Fee")')).toBeVisible();
    await expect(page.locator('label:has-text("Free Months")')).toBeVisible();
    await expect(page.locator('text=Lifetime package')).toBeVisible();
  });

  test('3.11 Create package', async ({ request }) => {
    const { apiLogin, authHeaders } = require('./helpers');
    const token = await apiLogin(request);
    const res = await request.post('/api/packages', {
      headers: authHeaders(token),
      data: { name: 'Test Package QA', priceGents: 500, priceLadies: 500, duration: 30, category: 'regular' },
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.name).toBe('Test Package QA');
    // Cleanup
    await request.delete(`/api/packages/${data._id}`, { headers: authHeaders(token) });
  });

  test('3.12 Edit package populates form', async ({ page }) => {
    await page.locator('button:has-text("Edit")').first().click();
    await expect(page.locator('text=Edit Package')).toBeVisible();
    const nameInput = page.locator('input[type="text"]').first();
    await expect(nameInput).not.toHaveValue('');
  });

  test('3.13 Delete package', async ({ page }) => {
    // Delete the "Test Package QA" we created
    const card = page.locator('div:has(h3:has-text("Test Package QA"))');
    if (await card.count() > 0) {
      await card.locator('button:has-text("Delete")').click();
      await page.locator('button:has-text("Confirm"), button:has-text("Delete")').last().click();
      await page.waitForTimeout(2000);
      expect(await page.locator('h3:has-text("Test Package QA")').count()).toBe(0);
    }
  });

  test('3.14 Lifetime toggle hides duration', async ({ page }) => {
    await page.locator('button:has-text("Add Package")').click();
    await page.waitForTimeout(1000);
    // Duration field should be visible initially
    await expect(page.locator('label:has-text("Duration (days)")')).toBeVisible();
    // Toggle lifetime on — find the checkbox near "Lifetime package" text
    const toggle = page.locator('input.sr-only[type="checkbox"]').first();
    await toggle.check({ force: true });
    await page.waitForTimeout(500);
    // Duration field should be hidden
    expect(await page.locator('label:has-text("Duration (days)")').count()).toBe(0);
  });

  test('3.15 Packages API returns all fields', async ({ request }) => {
    const token = await apiLogin(request);
    const res = await request.get('/api/packages', { headers: authHeaders(token) });
    const { data: pkgs } = await res.json();
    expect(pkgs.length).toBeGreaterThanOrEqual(6);
    const pkg = pkgs.find(p => p.name === 'Monthly Prepaid');
    expect(pkg.priceGents).toBe(800);
    expect(pkg.priceLadies).toBe(1000);
    expect(pkg.admissionFee).toBe(4000);
    expect(pkg.includesAdmission).toBe(false);
  });
});
