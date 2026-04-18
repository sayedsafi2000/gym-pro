const { test, expect } = require('@playwright/test');
const { apiLogin, authHeaders } = require('./helpers');

test.describe('13. Admin Management', () => {
  let token, createdAdminId;

  test.beforeAll(async ({ request }) => {
    token = await apiLogin(request);
  });

  test('13.1 API: Create admin', async ({ request }) => {
    const res = await request.post('/api/auth/admins', {
      headers: authHeaders(token),
      data: {
        email: 'testadmin@gym.com',
        password: 'TestAdmin123',
        name: 'Test Admin',
        role: 'admin',
        permissions: { canViewIncome: true, canManagePackages: false },
      },
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    createdAdminId = data._id;
    expect(data.role).toBe('admin');
  });

  test('13.2 API: List admins', async ({ request }) => {
    const res = await request.get('/api/auth/admins', { headers: authHeaders(token) });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(2); // super_admin + test admin
  });

  test('13.3 API: Update admin permissions', async ({ request }) => {
    if (!createdAdminId) { test.skip(); return; }
    const res = await request.put(`/api/auth/admins/${createdAdminId}`, {
      headers: authHeaders(token),
      data: { permissions: { canViewIncome: true, canManagePackages: true } },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('13.4 API: Regular admin creates pending member', async ({ request }) => {
    // Login as regular admin
    const loginRes = await request.post('/api/auth/login', {
      data: { email: 'testadmin@gym.com', password: 'TestAdmin123' },
    });
    const adminToken = (await loginRes.json()).data.token;

    const pkgs = (await request.get('/api/packages', { headers: authHeaders(adminToken) }).then(r => r.json())).data;

    const res = await request.post('/api/members', {
      headers: authHeaders(adminToken),
      data: {
        name: 'Pending Member',
        phone: '01711111111',
        gender: 'Male',
        joinDate: new Date().toISOString().split('T')[0],
        packageId: pkgs[0]._id,
        paymentType: 'due',
      },
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.status).toBe('pending');
  });

  test('13.5 API: Super admin approves pending member', async ({ request }) => {
    const pendingRes = await request.get('/api/members/pending', { headers: authHeaders(token) });
    const pending = (await pendingRes.json()).data;
    if (pending.length === 0) { test.skip('No pending members'); return; }

    const res = await request.put(`/api/members/${pending[0]._id}/approve`, {
      headers: authHeaders(token),
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.status).toBe('approved');
  });

  test('13.6 API: Delete admin', async ({ request }) => {
    if (!createdAdminId) { test.skip(); return; }
    const res = await request.delete(`/api/auth/admins/${createdAdminId}`, {
      headers: authHeaders(token),
    });
    expect(res.ok()).toBeTruthy();
  });

  test('13.7 API: Get current admin profile', async ({ request }) => {
    const res = await request.get('/api/auth/me', { headers: authHeaders(token) });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.role).toBe('super_admin');
  });
});
