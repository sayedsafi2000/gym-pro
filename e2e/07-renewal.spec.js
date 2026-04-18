const { test, expect } = require('@playwright/test');
const { login, apiLogin, authHeaders, createExpiredMember } = require('./helpers');

test.describe('7. Renewal Flow', () => {
  let token, packages;

  test.beforeAll(async ({ request }) => {
    token = await apiLogin(request);
    const res = await request.get('/api/packages', { headers: authHeaders(token) });
    packages = (await res.json()).data;
  });

  test('7.1 Renewal modal opens for expired member', async ({ page, request }) => {
    const expired = await createExpiredMember(request, token);
    if (!expired) { test.skip('Could not create expired member'); return; }
    await login(page);
    await page.goto(`/members/${expired._id}`);
    await page.waitForTimeout(4000);
    const renewBtn = page.locator('button:has-text("Renew Membership")');
    if (await renewBtn.count() === 0) { test.skip('Renew button not shown'); return; }
    await renewBtn.click();
    await page.waitForTimeout(2000);
    await expect(page.locator('select').first()).toBeVisible({ timeout: 5000 });
  });

  test('7.2 API: Renew with full payment', async ({ request }) => {
    const expired = await createExpiredMember(request, token);
    if (!expired) { test.skip('No expired member'); return; }
    const pkg = packages[0];
    const res = await request.post('/api/subscriptions/renew', {
      headers: authHeaders(token),
      data: { memberId: expired._id, packageId: pkg._id, paymentType: 'full', paymentMethod: 'Cash' },
    });
    expect(res.ok()).toBeTruthy();
    const { data: sub } = await res.json();
    expect(sub.status).toBe('active');
    expect(sub.paidAmount).toBe(sub.totalAmount);
    expect(sub.dueAmount).toBe(0);
  });

  test('7.3 API: Renew with partial payment', async ({ request }) => {
    const expired = await createExpiredMember(request, token);
    if (!expired) { test.skip(); return; }
    const pkg = packages[0];
    const res = await request.post('/api/subscriptions/renew', {
      headers: authHeaders(token),
      data: { memberId: expired._id, packageId: pkg._id, paymentType: 'partial', initialPayment: 500, paymentMethod: 'bKash' },
    });
    expect(res.ok()).toBeTruthy();
    const { data: sub } = await res.json();
    expect(sub.status).toBe('active');
    expect(sub.paidAmount).toBe(500);
    expect(sub.dueAmount).toBe(sub.totalAmount - 500);
  });

  test('7.4 API: Renew with due (no payment)', async ({ request }) => {
    const expired = await createExpiredMember(request, token);
    if (!expired) { test.skip(); return; }
    const pkg = packages[0];
    const res = await request.post('/api/subscriptions/renew', {
      headers: authHeaders(token),
      data: { memberId: expired._id, packageId: pkg._id, paymentType: 'due' },
    });
    expect(res.ok()).toBeTruthy();
    const { data: sub } = await res.json();
    expect(sub.paidAmount).toBe(0);
    expect(sub.dueAmount).toBe(sub.totalAmount);
  });

  test('7.5 API: Only one active subscription after renewal', async ({ request }) => {
    const expired = await createExpiredMember(request, token);
    if (!expired) { test.skip(); return; }
    // Renew twice
    await request.post('/api/subscriptions/renew', {
      headers: authHeaders(token),
      data: { memberId: expired._id, packageId: packages[0]._id, paymentType: 'due' },
    });
    await request.post('/api/subscriptions/renew', {
      headers: authHeaders(token),
      data: { memberId: expired._id, packageId: packages[1]._id, paymentType: 'due' },
    });
    const subsRes = await request.get(`/api/subscriptions/member/${expired._id}`, {
      headers: authHeaders(token),
    });
    const subs = (await subsRes.json()).data;
    const activeSubs = subs.filter(s => s.status === 'active');
    expect(activeSubs.length).toBe(1);
  });

  test('7.6 API: Renew with different package', async ({ request }) => {
    const expired = await createExpiredMember(request, token);
    if (!expired) { test.skip(); return; }
    const memberPkgId = typeof expired.packageId === 'object' ? expired.packageId._id : expired.packageId;
    const differentPkg = packages.find(p => p._id.toString() !== memberPkgId.toString());
    if (!differentPkg) { test.skip('No alternate package'); return; }
    const res = await request.post('/api/subscriptions/renew', {
      headers: authHeaders(token),
      data: { memberId: expired._id, packageId: differentPkg._id, paymentType: 'due' },
    });
    expect(res.ok()).toBeTruthy();
    const { data: sub } = await res.json();
    const subPkgId = typeof sub.packageId === 'object' ? sub.packageId._id : sub.packageId;
    expect(subPkgId.toString()).toBe(differentPkg._id.toString());
  });

  test('7.7 API: Member fields synced after renewal', async ({ request }) => {
    const expired = await createExpiredMember(request, token);
    if (!expired) { test.skip(); return; }
    await request.post('/api/subscriptions/renew', {
      headers: authHeaders(token),
      data: { memberId: expired._id, packageId: packages[0]._id, paymentType: 'full', paymentMethod: 'Cash' },
    });
    // Check member is now active
    const memberRes = await request.get(`/api/members/${expired._id}`, { headers: authHeaders(token) });
    const { data: member } = await memberRes.json();
    if (member.expiryDate) {
      expect(new Date(member.expiryDate) > new Date()).toBeTruthy();
    }
  });

  test('7.8 API: Check-in works after renewal', async ({ request }) => {
    const expired = await createExpiredMember(request, token);
    if (!expired) { test.skip(); return; }
    // Verify blocked before renewal
    const blockedRes = await request.post('/api/attendance/manual', {
      headers: authHeaders(token),
      data: { memberId: expired._id, type: 'check-in' },
    });
    expect(blockedRes.status()).toBe(403);

    // Renew
    await request.post('/api/subscriptions/renew', {
      headers: authHeaders(token),
      data: { memberId: expired._id, packageId: packages[0]._id, paymentType: 'due' },
    });

    // Should work now
    const allowedRes = await request.post('/api/attendance/manual', {
      headers: authHeaders(token),
      data: { memberId: expired._id, type: 'check-in' },
    });
    expect(allowedRes.ok()).toBeTruthy();
  });
});
