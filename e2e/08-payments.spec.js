const { test, expect } = require('@playwright/test');
const { login, apiLogin, authHeaders, createMember } = require('./helpers');

test.describe('8. Payments', () => {
  let token, packages, testMember;

  test.beforeAll(async ({ request }) => {
    token = await apiLogin(request);
    const pkgRes = await request.get('/api/packages', { headers: authHeaders(token) });
    packages = (await pkgRes.json()).data;
    testMember = await createMember(request, token, {
      name: 'Payment Test Member',
      gender: 'Male',
      packageId: packages.find(p => p.name === 'Super Saver')._id,
      paymentType: 'due',
    });
  });

  test('8.1 Payments page loads', async ({ page }) => {
    await login(page);
    await page.goto('/payments');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Payments').first()).toBeVisible();
  });

  test('8.2 API: Create payment', async ({ request }) => {
    const res = await request.post('/api/payments', {
      headers: authHeaders(token),
      data: {
        memberId: testMember._id,
        packageId: testMember.packageId,
        originalAmount: 1000,
        paymentMethod: 'Cash',
        paymentType: 'partial',
      },
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.finalAmount).toBe(1000);
    expect(data.paymentMethod).toBe('Cash');
  });

  test('8.3 API: Payment with fixed discount', async ({ request }) => {
    const res = await request.post('/api/payments', {
      headers: authHeaders(token),
      data: {
        memberId: testMember._id,
        packageId: testMember.packageId,
        originalAmount: 500,
        discountAmount: 100,
        discountType: 'fixed',
        paymentMethod: 'bKash',
        paymentType: 'partial',
      },
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.finalAmount).toBe(400); // 500 - 100
  });

  test('8.4 API: Payment with percentage discount', async ({ request }) => {
    const res = await request.post('/api/payments', {
      headers: authHeaders(token),
      data: {
        memberId: testMember._id,
        packageId: testMember.packageId,
        originalAmount: 500,
        discountAmount: 10,
        discountType: 'percentage',
        paymentMethod: 'Nagad',
        paymentType: 'partial',
      },
    });
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.finalAmount).toBe(450); // 500 - 10%
  });

  test('8.5 API: Payment exceeding due amount rejected', async ({ request }) => {
    const res = await request.post('/api/payments', {
      headers: authHeaders(token),
      data: {
        memberId: testMember._id,
        packageId: testMember.packageId,
        originalAmount: 999999,
        paymentMethod: 'Cash',
        paymentType: 'full',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('exceeds');
  });

  test('8.6 API: Delete payment recalculates financials', async ({ request }) => {
    // Get current payments
    const paymentsRes = await request.get(`/api/payments?memberId=${testMember._id}`, {
      headers: authHeaders(token),
    });
    const payments = (await paymentsRes.json()).data;
    if (payments.length === 0) { test.skip('No payments'); return; }

    const memberBefore = (await request.get(`/api/members/${testMember._id}`, {
      headers: authHeaders(token),
    }).then(r => r.json())).data;

    // Delete first payment
    const delRes = await request.delete(`/api/payments/${payments[0]._id}`, {
      headers: authHeaders(token),
    });
    expect(delRes.ok()).toBeTruthy();

    const memberAfter = (await request.get(`/api/members/${testMember._id}`, {
      headers: authHeaders(token),
    }).then(r => r.json())).data;

    expect(memberAfter.paidAmount).toBeLessThan(memberBefore.paidAmount);
  });

  test('8.7 API: Bulk delete payments', async ({ request }) => {
    // Create 2 payments to delete
    for (let i = 0; i < 2; i++) {
      await request.post('/api/payments', {
        headers: authHeaders(token),
        data: {
          memberId: testMember._id,
          packageId: testMember.packageId,
          originalAmount: 50,
          paymentMethod: 'Cash',
          paymentType: 'partial',
        },
      });
    }

    const paymentsRes = await request.get(`/api/payments?memberId=${testMember._id}`, {
      headers: authHeaders(token),
    });
    const payments = (await paymentsRes.json()).data;
    const ids = payments.slice(0, 2).map(p => p._id);

    const res = await request.post('/api/payments/bulk-delete', {
      headers: authHeaders(token),
      data: { paymentIds: ids },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('8.8 API: Payment links to active subscription', async ({ request }) => {
    const payRes = await request.post('/api/payments', {
      headers: authHeaders(token),
      data: {
        memberId: testMember._id,
        packageId: testMember.packageId,
        originalAmount: 100,
        paymentMethod: 'Cash',
        paymentType: 'partial',
      },
    });
    const payment = (await payRes.json()).data;
    expect(payment.subscriptionId).toBeTruthy();
  });

  test('8.9 API: Receipt generation', async ({ request }) => {
    const paymentsRes = await request.get(`/api/payments?memberId=${testMember._id}`, {
      headers: authHeaders(token),
    });
    const payments = (await paymentsRes.json()).data;
    if (payments.length === 0) { test.skip('No payments'); return; }

    const res = await request.get(`/api/payments/${payments[0]._id}/receipt`, {
      headers: authHeaders(token),
    });
    expect(res.ok()).toBeTruthy();
    const { data: receipt } = await res.json();
    expect(receipt.receiptId).toMatch(/^RCP-/);
    expect(receipt.member.name).toBeTruthy();
    expect(receipt.package.name).toBeTruthy();
    expect(receipt.payment.finalAmount).toBeDefined();
  });
});
