const { test, expect } = require('@playwright/test');
const { apiLogin, authHeaders, createMember } = require('./helpers');

test.describe('15. Lifetime → Monthly Renewal', () => {
  let token, lifetimePkg, config;

  test.beforeAll(async ({ request }) => {
    token = await apiLogin(request);
    const pkgRes = await request.get('/api/packages', { headers: authHeaders(token) });
    const pkgs = (await pkgRes.json()).data;
    lifetimePkg = pkgs.find((p) => p.isLifetime && (p.freeMonths || 0) >= 1) || pkgs.find((p) => p.isLifetime);
    expect(lifetimePkg, 'need at least one lifetime package seeded').toBeTruthy();

    const cfgRes = await request.get('/api/subscriptions/config', { headers: authHeaders(token) });
    config = (await cfgRes.json()).data;
    expect(config.monthlyFeeGents).toBeGreaterThan(0);
  });

  test('15.1 Monthly renew creates type=monthly sub + extends expiry for lifetime member', async ({ request }) => {
    const member = await createMember(request, token, {
      name: 'Lifetime MonthlyRenew 1',
      packageId: lifetimePkg._id,
      paymentType: 'full',
    });

    const before = (
      await request.get(`/api/members/${member._id}`, { headers: authHeaders(token) }).then((r) => r.json())
    ).data;
    const initialExpiry = before.expiryDate ? new Date(before.expiryDate) : new Date();

    const res = await request.post('/api/subscriptions/monthly-renew', {
      headers: authHeaders(token),
      data: { memberId: member._id, paymentMethod: 'Cash' },
    });
    expect(res.ok(), 'monthly-renew should 2xx').toBeTruthy();
    const { data: sub } = await res.json();

    expect(sub.type).toBe('monthly');
    expect(sub.status).toBe('active');
    expect(sub.isLifetime).toBe(false);
    expect(new Date(sub.endDate).getTime()).toBeGreaterThan(initialExpiry.getTime());

    const expectedFee = member.gender === 'Female' ? config.monthlyFeeLadies : config.monthlyFeeGents;
    expect(sub.totalAmount).toBe(expectedFee);
    expect(sub.paidAmount).toBe(expectedFee);
    expect(sub.dueAmount).toBe(0);

    const after = (
      await request.get(`/api/members/${member._id}`, { headers: authHeaders(token) }).then((r) => r.json())
    ).data;
    expect(new Date(after.expiryDate).getTime()).toBe(new Date(sub.endDate).getTime());
  });

  test('15.2 Monthly renew does NOT cancel the underlying lifetime package subscription', async ({ request }) => {
    const member = await createMember(request, token, {
      name: 'Lifetime MonthlyRenew 2',
      packageId: lifetimePkg._id,
      paymentType: 'full',
    });

    await request.post('/api/subscriptions/monthly-renew', {
      headers: authHeaders(token),
      data: { memberId: member._id, paymentMethod: 'Cash' },
    });

    const subs = (
      await request
        .get(`/api/subscriptions/member/${member._id}`, { headers: authHeaders(token) })
        .then((r) => r.json())
    ).data;

    const packageSub = subs.find((s) => s.packageId?._id === lifetimePkg._id || s.packageId === lifetimePkg._id);
    expect(packageSub, 'original lifetime package subscription should still exist').toBeTruthy();
    expect(packageSub.status).not.toBe('cancelled');

    const monthlySubs = subs.filter((s) => s.type === 'monthly');
    expect(monthlySubs.length).toBe(1);
    expect(monthlySubs[0].status).toBe('active');
  });

  test('15.3 Payment row created with paymentType=monthly_renewal', async ({ request }) => {
    const member = await createMember(request, token, {
      name: 'Lifetime MonthlyRenew 3',
      packageId: lifetimePkg._id,
      paymentType: 'full',
    });

    await request.post('/api/subscriptions/monthly-renew', {
      headers: authHeaders(token),
      data: { memberId: member._id, paymentMethod: 'Cash' },
    });

    const payments = (
      await request
        .get(`/api/payments?memberId=${member._id}`, { headers: authHeaders(token) })
        .then((r) => r.json())
    ).data;

    const monthlyPayment = payments.find((p) => p.paymentType === 'monthly_renewal');
    expect(monthlyPayment, 'monthly_renewal payment row should exist').toBeTruthy();

    const expectedFee = member.gender === 'Female' ? config.monthlyFeeLadies : config.monthlyFeeGents;
    expect(monthlyPayment.finalAmount).toBe(expectedFee);
    expect(monthlyPayment.paymentMethod).toBe('Cash');
  });

  test('15.4 Second monthly renew extends expiry further + expires previous monthly sub', async ({ request }) => {
    const member = await createMember(request, token, {
      name: 'Lifetime MonthlyRenew 4',
      packageId: lifetimePkg._id,
      paymentType: 'full',
    });

    const first = await request.post('/api/subscriptions/monthly-renew', {
      headers: authHeaders(token),
      data: { memberId: member._id, paymentMethod: 'Cash' },
    });
    const firstSub = (await first.json()).data;
    const firstEnd = new Date(firstSub.endDate);

    const second = await request.post('/api/subscriptions/monthly-renew', {
      headers: authHeaders(token),
      data: { memberId: member._id, paymentMethod: 'Cash' },
    });
    const secondSub = (await second.json()).data;
    const secondEnd = new Date(secondSub.endDate);

    expect(secondEnd.getTime()).toBeGreaterThan(firstEnd.getTime());

    const subs = (
      await request
        .get(`/api/subscriptions/member/${member._id}`, { headers: authHeaders(token) })
        .then((r) => r.json())
    ).data;

    const monthlySubs = subs.filter((s) => s.type === 'monthly');
    const active = monthlySubs.filter((s) => s.status === 'active');
    const expired = monthlySubs.filter((s) => s.status === 'expired');

    expect(active.length).toBe(1);
    expect(expired.length).toBe(1);
    expect(active[0]._id).toBe(secondSub._id);
  });

  test('15.5 Member totals untouched by monthly renew (preserves original package sale financials)', async ({ request }) => {
    const member = await createMember(request, token, {
      name: 'Lifetime MonthlyRenew 5',
      packageId: lifetimePkg._id,
      paymentType: 'full',
    });

    const before = (
      await request.get(`/api/members/${member._id}`, { headers: authHeaders(token) }).then((r) => r.json())
    ).data;

    await request.post('/api/subscriptions/monthly-renew', {
      headers: authHeaders(token),
      data: { memberId: member._id, paymentMethod: 'Cash' },
    });

    const after = (
      await request.get(`/api/members/${member._id}`, { headers: authHeaders(token) }).then((r) => r.json())
    ).data;

    expect(after.totalAmount).toBe(before.totalAmount);
    expect(after.paidAmount).toBe(before.paidAmount);
    expect(after.dueAmount).toBe(before.dueAmount);
  });
});
