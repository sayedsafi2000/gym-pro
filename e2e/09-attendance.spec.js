const { test, expect } = require('@playwright/test');
const { apiLogin, authHeaders, createMember, createExpiredMember } = require('./helpers');

test.describe('9. Attendance & Check-in Blocking', () => {
  let token, packages;

  test.beforeAll(async ({ request }) => {
    token = await apiLogin(request);
    const res = await request.get('/api/packages', { headers: authHeaders(token) });
    packages = (await res.json()).data;
  });

  test('9.1 Manual check-in works for active member', async ({ request }) => {
    const member = await createMember(request, token, {
      name: 'Active Checkin',
      packageId: packages.find(p => p.isLifetime)._id,
      paymentType: 'due',
    });
    const res = await request.post('/api/attendance/manual', {
      headers: authHeaders(token),
      data: { memberId: member._id, type: 'check-in' },
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.type).toBe('check-in');
    expect(data.source).toBe('manual');
  });

  test('9.2 Manual check-in blocked for expired member', async ({ request }) => {
    const expired = await createExpiredMember(request, token);
    if (!expired) { test.skip(); return; }
    const res = await request.post('/api/attendance/manual', {
      headers: authHeaders(token),
      data: { memberId: expired._id, type: 'check-in' },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.message).toContain('expired');
  });

  test('9.3 Lifetime member always allowed', async ({ request }) => {
    const pkg = packages.find(p => p.isLifetime);
    const member = await createMember(request, token, {
      name: 'Lifetime Checkin',
      packageId: pkg._id,
      paymentType: 'due',
    });
    const res = await request.post('/api/attendance/manual', {
      headers: authHeaders(token),
      data: { memberId: member._id },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('9.4 Auto type toggle (check-in → check-out)', async ({ request }) => {
    const member = await createMember(request, token, {
      name: 'Toggle Checkin',
      packageId: packages.find(p => p.isLifetime)._id,
      paymentType: 'due',
    });
    // First: check-in
    const res1 = await request.post('/api/attendance/manual', {
      headers: authHeaders(token),
      data: { memberId: member._id },
    });
    const d1 = (await res1.json()).data;
    expect(d1.type).toBe('check-in');

    // Second: should auto-toggle to check-out
    const res2 = await request.post('/api/attendance/manual', {
      headers: authHeaders(token),
      data: { memberId: member._id },
    });
    const d2 = (await res2.json()).data;
    expect(d2.type).toBe('check-out');
  });

  test('9.5 Check-in status endpoint', async ({ request }) => {
    const members = (await request.get('/api/members', { headers: authHeaders(token) }).then(r => r.json())).data;
    const m = members[0];
    const res = await request.get(`/api/attendance/member/${m._id}/status`, {
      headers: authHeaders(token),
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(typeof data.checkedIn).toBe('boolean');
  });

  test('9.6 Attendance stats endpoint', async ({ request }) => {
    const members = (await request.get('/api/members', { headers: authHeaders(token) }).then(r => r.json())).data;
    const m = members[0];
    const res = await request.get(`/api/attendance/member/${m._id}/stats`, {
      headers: authHeaders(token),
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.totalVisits).toBeDefined();
    expect(data.thisMonthVisits).toBeDefined();
  });

  test('9.7 Today attendance summary', async ({ request }) => {
    const res = await request.get('/api/attendance/today', { headers: authHeaders(token) });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.totalCheckIns).toBeDefined();
    expect(data.currentlyPresent).toBeDefined();
  });
});
