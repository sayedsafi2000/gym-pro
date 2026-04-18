/**
 * Shared test helpers for GymPro E2E tests.
 * Handles login (UI + API), data creation, and common assertions.
 */

const ADMIN_EMAIL = 'admin@gym.com';
const ADMIN_PASSWORD = 'Password123';

// UI login — fills form and waits for dashboard
async function login(page) {
  await page.goto('/');
  await page.waitForTimeout(1500);
  const hasEmail = await page.locator('input[name="email"]').count() > 0;
  if (hasEmail) {
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }
  await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 15000 });
}

// API login — returns token
async function apiLogin(request) {
  const res = await request.post('/api/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const body = await res.json();
  if (!body.data?.token) throw new Error('Login failed: ' + JSON.stringify(body));
  return body.data.token;
}

// Get auth headers
function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

// Create a test member via API, returns member data
async function createMember(request, token, overrides = {}) {
  const defaults = {
    name: 'Test Member ' + Date.now(),
    phone: '017' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
    gender: 'Male',
    joinDate: new Date().toISOString().split('T')[0],
    paymentType: 'due',
    ...overrides,
  };

  // Get first package if not specified
  if (!defaults.packageId) {
    const pkgRes = await request.get('/api/packages', { headers: authHeaders(token) });
    const pkgs = (await pkgRes.json()).data;
    defaults.packageId = pkgs[0]._id;
  }

  const res = await request.post('/api/members', {
    headers: authHeaders(token),
    data: defaults,
  });
  const body = await res.json();
  return body.data;
}

// Create an expired member (join date far in past with short-duration package)
async function createExpiredMember(request, token) {
  const pkgRes = await request.get('/api/packages', { headers: authHeaders(token) });
  const pkgs = (await pkgRes.json()).data;
  // Find Monthly Prepaid (30 days) or any non-lifetime package
  const shortPkg = pkgs.find(p => !p.isLifetime && p.duration <= 30) || pkgs.find(p => !p.isLifetime);
  if (!shortPkg) return null;

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - (shortPkg.duration + 5));

  return createMember(request, token, {
    name: 'Expired Member ' + Date.now(),
    packageId: shortPkg._id,
    joinDate: pastDate.toISOString().split('T')[0],
    paymentType: 'full',
  });
}

module.exports = { login, apiLogin, authHeaders, createMember, createExpiredMember, ADMIN_EMAIL, ADMIN_PASSWORD };
