const { test, expect } = require('@playwright/test');
const { apiLogin, authHeaders, createMember, createExpiredMember } = require('./helpers');

test.describe('10. Subscriptions API', () => {
  let token, packages;

  test.beforeAll(async ({ request }) => {
    token = await apiLogin(request);
    const res = await request.get('/api/packages', { headers: authHeaders(token) });
    packages = (await res.json()).data;
  });

  test('10.1 Subscription created on member add', async ({ request }) => {
    const member = await createMember(request, token, { name: 'Sub Test 1' });
    const res = await request.get(`/api/subscriptions/member/${member._id}`, {
      headers: authHeaders(token),
    });
    const subs = (await res.json()).data;
    expect(subs.length).toBe(1);
    expect(subs[0].status).toBe('active');
  });

  test('10.2 Active subscription endpoint', async ({ request }) => {
    const member = await createMember(request, token, { name: 'Sub Test 2' });
    const res = await request.get(`/api/subscriptions/member/${member._id}/active`, {
      headers: authHeaders(token),
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data).toBeTruthy();
    expect(data.status).toBe('active');
  });

  test('10.3 Renewal creates new, cancels old', async ({ request }) => {
    const expired = await createExpiredMember(request, token);
    if (!expired) { test.skip(); return; }

    await request.post('/api/subscriptions/renew', {
      headers: authHeaders(token),
      data: { memberId: expired._id, packageId: packages[0]._id, paymentType: 'due' },
    });

    const subs = (await request.get(`/api/subscriptions/member/${expired._id}`, {
      headers: authHeaders(token),
    }).then(r => r.json())).data;

    const active = subs.filter(s => s.status === 'active');
    const cancelled = subs.filter(s => s.status === 'cancelled');
    expect(active.length).toBe(1);
    expect(cancelled.length).toBeGreaterThanOrEqual(1);
  });

  test('10.4 One active subscription enforced', async ({ request }) => {
    const member = await createMember(request, token, { name: 'One Active Test' });
    // Renew (even though not expired — simulates upgrade)
    await request.post('/api/subscriptions/renew', {
      headers: authHeaders(token),
      data: { memberId: member._id, packageId: packages[1]._id, paymentType: 'due' },
    });
    const subs = (await request.get(`/api/subscriptions/member/${member._id}`, {
      headers: authHeaders(token),
    }).then(r => r.json())).data;
    const activeSubs = subs.filter(s => s.status === 'active');
    expect(activeSubs.length).toBe(1);
  });

  test('10.5 Expire endpoint (super_admin)', async ({ request }) => {
    const member = await createMember(request, token, { name: 'Expire Test' });
    const activeSub = (await request.get(`/api/subscriptions/member/${member._id}/active`, {
      headers: authHeaders(token),
    }).then(r => r.json())).data;

    const res = await request.post(`/api/subscriptions/${activeSub._id}/expire`, {
      headers: authHeaders(token),
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.status).toBe('expired');
  });

  test('10.6 Activate endpoint (super_admin)', async ({ request }) => {
    const member = await createMember(request, token, { name: 'Activate Test' });
    const activeSub = (await request.get(`/api/subscriptions/member/${member._id}/active`, {
      headers: authHeaders(token),
    }).then(r => r.json())).data;

    // Expire first
    await request.post(`/api/subscriptions/${activeSub._id}/expire`, {
      headers: authHeaders(token),
    });
    // Activate
    const res = await request.post(`/api/subscriptions/${activeSub._id}/activate`, {
      headers: authHeaders(token),
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.status).toBe('active');
  });

  test('10.7 Member fields synced with subscription', async ({ request }) => {
    const member = await createMember(request, token, {
      name: 'Sync Test',
      packageId: packages.find(p => !p.isLifetime)._id,
      paymentType: 'full',
    });
    const sub = (await request.get(`/api/subscriptions/member/${member._id}/active`, {
      headers: authHeaders(token),
    }).then(r => r.json())).data;

    const memberData = (await request.get(`/api/members/${member._id}`, {
      headers: authHeaders(token),
    }).then(r => r.json())).data;

    expect(memberData.totalAmount).toBe(sub.totalAmount);
    expect(memberData.paidAmount).toBe(sub.paidAmount);
  });

  test('10.8 Subscription history accumulates', async ({ request }) => {
    const expired = await createExpiredMember(request, token);
    if (!expired) { test.skip(); return; }
    // Renew 3 times
    for (let i = 0; i < 3; i++) {
      await request.post('/api/subscriptions/renew', {
        headers: authHeaders(token),
        data: { memberId: expired._id, packageId: packages[i % packages.length]._id, paymentType: 'due' },
      });
    }
    const subs = (await request.get(`/api/subscriptions/member/${expired._id}`, {
      headers: authHeaders(token),
    }).then(r => r.json())).data;
    // Original + 3 renewals = 4 total
    expect(subs.length).toBeGreaterThanOrEqual(4);
  });
});
