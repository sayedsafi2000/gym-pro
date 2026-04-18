const { test, expect } = require('@playwright/test');
const { login, apiLogin, authHeaders, createMember, createExpiredMember } = require('./helpers');

test.describe('4. Add Member', () => {
  let token, packages;

  test.beforeAll(async ({ request }) => {
    token = await apiLogin(request);
    const res = await request.get('/api/packages', { headers: authHeaders(token) });
    packages = (await res.json()).data;
  });

  test('4.1 Add member form loads', async ({ page }) => {
    await login(page);
    await page.goto('/members/add');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Personal Information')).toBeVisible();
    await expect(page.locator('text=Membership Details')).toBeVisible();
    await expect(page.locator('text=Payment Options')).toBeVisible();
  });

  test('4.2 API: Create member with full payment', async ({ request }) => {
    const pkg = packages.find(p => p.name === 'Super Saver');
    const member = await createMember(request, token, {
      name: 'Full Payment Member',
      gender: 'Male',
      packageId: pkg._id,
      paymentType: 'full',
    });
    expect(member.memberId).toMatch(/^GYM-/);
    expect(member.paidAmount).toBe(member.totalAmount);
    expect(member.dueAmount).toBe(0);
  });

  test('4.3 API: Create member with partial payment', async ({ request }) => {
    const pkg = packages.find(p => p.name === 'Super Saver');
    const member = await createMember(request, token, {
      name: 'Partial Payment Member',
      gender: 'Male',
      packageId: pkg._id,
      paymentType: 'partial',
      initialPayment: 1000,
    });
    expect(member.paidAmount).toBe(1000);
    expect(member.dueAmount).toBe(member.totalAmount - 1000);
  });

  test('4.4 API: Create member with due payment', async ({ request }) => {
    const pkg = packages.find(p => p.name === 'Super Saver');
    const member = await createMember(request, token, {
      name: 'Due Payment Member',
      gender: 'Male',
      packageId: pkg._id,
      paymentType: 'due',
    });
    expect(member.paidAmount).toBe(0);
    expect(member.dueAmount).toBe(member.totalAmount);
  });

  test('4.5 API: Lifetime member has no expiry', async ({ request }) => {
    const pkg = packages.find(p => p.isLifetime);
    const member = await createMember(request, token, {
      name: 'Lifetime Member',
      gender: 'Male',
      packageId: pkg._id,
      paymentType: 'full',
    });
    expect(member.expiryDate).toBeNull();
  });

  test('4.6 API: Female gets ladies price', async ({ request }) => {
    const pkg = packages.find(p => p.name === 'Monthly Prepaid');
    const member = await createMember(request, token, {
      name: 'Female Member',
      gender: 'Female',
      packageId: pkg._id,
      paymentType: 'due',
    });
    // Ladies: 1000 + 4000 admission = 5000
    expect(member.totalAmount).toBe(5000);
  });

  test('4.7 API: Male gets gents price', async ({ request }) => {
    const pkg = packages.find(p => p.name === 'Monthly Prepaid');
    const member = await createMember(request, token, {
      name: 'Male Monthly Member',
      gender: 'Male',
      packageId: pkg._id,
      paymentType: 'due',
    });
    // Gents: 800 + 4000 admission = 4800
    expect(member.totalAmount).toBe(4800);
  });

  test('4.8 API: Special offer includes admission (no extra fee)', async ({ request }) => {
    const pkg = packages.find(p => p.name === 'Premium Package');
    const member = await createMember(request, token, {
      name: 'Premium Member',
      gender: 'Male',
      packageId: pkg._id,
      paymentType: 'due',
    });
    // Premium: 12500 (admission included)
    expect(member.totalAmount).toBe(12500);
  });

  test('4.9 API: Subscription created alongside member', async ({ request }) => {
    const pkg = packages.find(p => p.name === 'Super Saver');
    const member = await createMember(request, token, {
      name: 'Sub Check Member',
      gender: 'Male',
      packageId: pkg._id,
      paymentType: 'full',
    });
    const subsRes = await request.get(`/api/subscriptions/member/${member._id}`, {
      headers: authHeaders(token),
    });
    const subs = (await subsRes.json()).data;
    expect(subs.length).toBe(1);
    expect(subs[0].status).toBe('active');
    expect(subs[0].totalAmount).toBe(member.totalAmount);
  });

  test('4.10 API: Monthly installment plan created', async ({ request }) => {
    const pkg = packages.find(p => !p.isLifetime && p.duration >= 30);
    if (!pkg) { test.skip('No suitable package'); return; }
    const member = await createMember(request, token, {
      name: 'Installment Member',
      gender: 'Male',
      packageId: pkg._id,
      paymentType: 'monthly',
      installmentMonths: 3,
    });
    const instRes = await request.get(`/api/installments/member/${member._id}`, {
      headers: authHeaders(token),
    });
    const inst = (await instRes.json()).data;
    expect(inst).toBeTruthy();
    expect(inst.totalInstallments).toBe(3);
    expect(inst.paidInstallments).toBe(1); // first month auto-paid
    expect(inst.schedule.length).toBe(3);
    expect(inst.schedule[0].status).toBe('paid');
  });

  test('4.11 API: Create expired member', async ({ request }) => {
    const expired = await createExpiredMember(request, token);
    expect(expired).toBeTruthy();
    expect(new Date(expired.expiryDate) < new Date()).toBeTruthy();
  });
});
