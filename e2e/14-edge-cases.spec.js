const { test, expect } = require('@playwright/test');
const { apiLogin, authHeaders, createMember, createExpiredMember } = require('./helpers');

test.describe('14. Edge Cases', () => {
  let token, packages;

  test.beforeAll(async ({ request }) => {
    token = await apiLogin(request);
    const res = await request.get('/api/packages', { headers: authHeaders(token) });
    packages = (await res.json()).data;
  });

  test('14.1 Double renewal only one active', async ({ request }) => {
    const expired = await createExpiredMember(request, token);
    if (!expired) { test.skip(); return; }
    await request.post('/api/subscriptions/renew', {
      headers: authHeaders(token),
      data: { memberId: expired._id, packageId: packages[0]._id, paymentType: 'due' },
    });
    await request.post('/api/subscriptions/renew', {
      headers: authHeaders(token),
      data: { memberId: expired._id, packageId: packages[1]._id, paymentType: 'due' },
    });
    const subs = (await request.get(`/api/subscriptions/member/${expired._id}`, {
      headers: authHeaders(token),
    }).then(r => r.json())).data;
    expect(subs.filter(s => s.status === 'active').length).toBe(1);
  });

  test('14.2 Delete all payments resets financials', async ({ request }) => {
    const member = await createMember(request, token, {
      name: 'Delete All Payments',
      packageId: packages[0]._id,
      paymentType: 'full',
    });
    // Get all payments
    const payments = (await request.get(`/api/payments?memberId=${member._id}`, {
      headers: authHeaders(token),
    }).then(r => r.json())).data;
    // Delete all
    if (payments.length > 0) {
      await request.post('/api/payments/bulk-delete', {
        headers: authHeaders(token),
        data: { paymentIds: payments.map(p => p._id) },
      });
    }
    // Check member
    const updated = (await request.get(`/api/members/${member._id}`, {
      headers: authHeaders(token),
    }).then(r => r.json())).data;
    expect(updated.paidAmount).toBe(0);
    expect(updated.dueAmount).toBeGreaterThan(0);
  });

  test('14.3 Lifetime member never expires (no expiryDate)', async ({ request }) => {
    const pkg = packages.find(p => p.isLifetime);
    const member = await createMember(request, token, {
      name: 'Lifetime Edge',
      packageId: pkg._id,
      paymentType: 'due',
    });
    expect(member.expiryDate).toBeNull();
    // Check-in should work
    const res = await request.post('/api/attendance/manual', {
      headers: authHeaders(token),
      data: { memberId: member._id },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('14.4 Female Monthly Prepaid = 5000 (1000 + 4000)', async ({ request }) => {
    const pkg = packages.find(p => p.name === 'Monthly Prepaid');
    const member = await createMember(request, token, {
      name: 'Female Monthly Edge',
      gender: 'Female',
      packageId: pkg._id,
      paymentType: 'due',
    });
    expect(member.totalAmount).toBe(5000);
  });

  test('14.5 Male Monthly Prepaid = 4800 (800 + 4000)', async ({ request }) => {
    const pkg = packages.find(p => p.name === 'Monthly Prepaid');
    const member = await createMember(request, token, {
      name: 'Male Monthly Edge',
      gender: 'Male',
      packageId: pkg._id,
      paymentType: 'due',
    });
    expect(member.totalAmount).toBe(4800);
  });

  test('14.6 Special offer no admission fee added', async ({ request }) => {
    const pkg = packages.find(p => p.name === 'Super Saver');
    const member = await createMember(request, token, {
      name: 'No Admission Edge',
      gender: 'Male',
      packageId: pkg._id,
      paymentType: 'due',
    });
    expect(member.totalAmount).toBe(3000); // no extra admission
  });

  test('14.7 Cannot check in non-existent member', async ({ request }) => {
    const res = await request.post('/api/attendance/manual', {
      headers: authHeaders(token),
      data: { memberId: '000000000000000000000000' },
    });
    expect(res.status()).toBe(404);
  });

  test('14.8 Cannot create payment without required fields', async ({ request }) => {
    const res = await request.post('/api/payments', {
      headers: authHeaders(token),
      data: { memberId: '', packageId: '', originalAmount: 0 },
    });
    expect(res.ok()).toBeFalsy();
  });

  test('14.9 Member ID auto-increments', async ({ request }) => {
    const m1 = await createMember(request, token, { name: 'AutoID 1' });
    const m2 = await createMember(request, token, { name: 'AutoID 2' });
    const num1 = parseInt(m1.memberId.split('-')[1]);
    const num2 = parseInt(m2.memberId.split('-')[1]);
    expect(num2).toBe(num1 + 1);
  });

  test('14.10 Subscription has correct dates', async ({ request }) => {
    const pkg = packages.find(p => !p.isLifetime && p.duration === 30);
    if (!pkg) { test.skip(); return; }
    const member = await createMember(request, token, {
      name: 'Date Check',
      packageId: pkg._id,
      paymentType: 'due',
    });
    const sub = (await request.get(`/api/subscriptions/member/${member._id}/active`, {
      headers: authHeaders(token),
    }).then(r => r.json())).data;

    const start = new Date(sub.startDate);
    const end = new Date(sub.endDate);
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(30);
  });
});
