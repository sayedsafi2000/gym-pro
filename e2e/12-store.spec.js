const { test, expect } = require('@playwright/test');
const { login, apiLogin, authHeaders } = require('./helpers');

test.describe('12. Store / Products', () => {
  let token;

  test.beforeAll(async ({ request }) => {
    token = await apiLogin(request);
  });

  test('12.1 Store page loads', async ({ page }) => {
    await login(page);
    await page.goto('/store');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Store').first()).toBeVisible();
  });

  test('12.2 API: List products', async ({ request }) => {
    const res = await request.get('/api/products', { headers: authHeaders(token) });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('12.3 API: Store stats', async ({ request }) => {
    const res = await request.get('/api/products/stats', { headers: authHeaders(token) });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.totalProducts).toBeDefined();
  });

  test('12.4 API: Create product', async ({ request }) => {
    const res = await request.post('/api/products', {
      headers: authHeaders(token),
      data: { name: 'Test Protein Shake', price: 250, stock: 20, category: 'supplements' },
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.name).toBe('Test Protein Shake');
    expect(data.stock).toBe(20);
  });

  test('12.5 API: Sell product', async ({ request }) => {
    const products = (await request.get('/api/products', { headers: authHeaders(token) }).then(r => r.json())).data;
    const product = products.find(p => p.stock > 0);
    if (!product) { test.skip('No products with stock'); return; }

    const res = await request.post(`/api/products/${product._id}/sell`, {
      headers: authHeaders(token),
      data: { quantity: 1 },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('12.6 API: Restock product', async ({ request }) => {
    const products = (await request.get('/api/products', { headers: authHeaders(token) }).then(r => r.json())).data;
    if (products.length === 0) { test.skip('No products'); return; }

    const res = await request.post(`/api/products/${products[0]._id}/restock`, {
      headers: authHeaders(token),
      data: { quantity: 5 },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('12.7 API: Sale receipt', async ({ request }) => {
    const salesRes = await request.get('/api/products/sales', { headers: authHeaders(token) });
    const sales = (await salesRes.json()).data;
    if (!sales || sales.length === 0) { test.skip('No sales'); return; }

    const res = await request.get(`/api/products/sales/${sales[0]._id}/receipt`, {
      headers: authHeaders(token),
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.receiptId).toMatch(/^SL-/);
  });
});
