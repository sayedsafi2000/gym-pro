const { test, expect } = require('@playwright/test');
const { apiLogin, authHeaders, createMember } = require('./helpers');

test.describe('11. Edit Member', () => {
  let token, packages, testMember;

  test.beforeAll(async ({ request }) => {
    token = await apiLogin(request);
    const pkgRes = await request.get('/api/packages', { headers: authHeaders(token) });
    packages = (await pkgRes.json()).data;
    testMember = await createMember(request, token, {
      name: 'Edit Test Member',
      phone: '01700000001',
      gender: 'Male',
      packageId: packages[0]._id,
      paymentType: 'due',
    });
  });

  test('11.1 API: Update personal info', async ({ request }) => {
    const res = await request.put(`/api/members/${testMember._id}`, {
      headers: authHeaders(token),
      data: { name: 'Updated Name', phone: '01799999999' },
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.name).toBe('Updated Name');
    expect(data.phone).toBe('01799999999');
  });

  test('11.2 API: Change package recalculates expiry', async ({ request }) => {
    const newPkg = packages.find(p => !p.isLifetime && p._id !== testMember.packageId.toString());
    if (!newPkg) { test.skip('No alternate package'); return; }
    const res = await request.put(`/api/members/${testMember._id}`, {
      headers: authHeaders(token),
      data: { packageId: newPkg._id },
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.expiryDate).toBeTruthy();
  });

  test('11.3 API: Additional payment reduces due', async ({ request }) => {
    const before = (await request.get(`/api/members/${testMember._id}`, {
      headers: authHeaders(token),
    }).then(r => r.json())).data;

    if (before.dueAmount <= 0) { test.skip('No due amount'); return; }

    const payAmount = Math.min(100, before.dueAmount);
    const res = await request.put(`/api/members/${testMember._id}`, {
      headers: authHeaders(token),
      data: {
        paymentType: 'partial',
        additionalPayment: payAmount,
        paymentMethod: 'Cash',
      },
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.paidAmount).toBe(before.paidAmount + payAmount);
  });

  test('11.4 API: Payment exceeding due rejected', async ({ request }) => {
    const member = (await request.get(`/api/members/${testMember._id}`, {
      headers: authHeaders(token),
    }).then(r => r.json())).data;

    const res = await request.put(`/api/members/${testMember._id}`, {
      headers: authHeaders(token),
      data: {
        paymentType: 'partial',
        additionalPayment: member.dueAmount + 10000,
        paymentMethod: 'Cash',
      },
    });
    expect(res.status()).toBe(400);
  });
});
