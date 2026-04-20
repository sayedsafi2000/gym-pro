# GymPro — Open Bugs

Captured from full-app QA on 2026-04-17. Full report + screenshots: `.gstack/qa-reports/qa-report-full-app-2026-04-17.md`.

Legend: **HIGH** = data loss / blocks ship · **MED** = broken flow or clear UX gap · **LOW** = polish.

---

## HIGH

### EDITMEMBER-1 — Edit member resets expiry, flips to Expired
- **File:** `gym-server/controllers/memberController.js:301-323`
- **Repro:** Open active lifetime member → change Emergency Phone only → Update Member. Status becomes Expired, expiry = joinDate.
- **Cause:** `if (packageId || joinDate)` branch always triggers (form always posts both). Overwrites `expiryDate = joinDate + pkg.duration*day`. Ignores `pkg.freeMonths`, `pkg.isLifetime`, and any monthly-renewal extension.
- **Fix:**
  1. Only recalc when `packageId` changed OR `joinDate` changed vs stored member values.
  2. For lifetime pkg: use `join + freeMonths*30*day` (match create-member logic at line 86).
  3. Never shorten existing `expiryDate`.
- **Blast radius:** every admin edit on lifetime members silently revokes paid monthly access.

---

## MEDIUM

### ADDMEMBER-1 — Join Date no default, blocks submission
- **File:** `gym-admin-panel/src/pages/AddMember.jsx:20`
- **Fix:** `joinDate: new Date().toISOString().slice(0, 10)` in initial state.

### PAYMENTS-1 — Payment Date no default
- **File:** `gym-admin-panel/src/pages/Payments.jsx` (Add Payment form)
- **Fix:** `date: new Date().toISOString().slice(0, 10)`.

### PACKAGES-1 — "Lifetime package" toggle defaults OFF
- **File:** `gym-admin-panel/src/pages/Packages.jsx` (Add Package modal)
- **Context:** Business model = every package is lifetime (CLAUDE.md). Toggle should start ON.
- **Fix:** `isLifetime: true` in modal initial state.

### STORE-1 — Duplicate "Test Protein Shake" products
- **File:** `gym-server/models/Product.js` (no uniqueness constraint)
- **Fix:** Add compound unique index `{ name, category }`. Clean existing dupes via one-off script.

### STORE-2 — Category casing creates phantom filter (supplements vs Supplements)
- **File:** `gym-admin-panel/src/pages/Store.jsx` (category filter render) + DB records
- **Fix:** Store canonical lowercase; render title-case. Migrate: `db.products.updateMany({}, [{ $set: { category: { $toLower: '$category' } } }])`.

---

## LOW

### ADDMEMBER-2 — Default payment type is "Due" (pay later)
- **File:** `gym-admin-panel/src/pages/AddMember.jsx:22`
- **Fix:** `paymentType: 'full'`.

### PAYMENTS-2 — Default payment type "Partial"
- **File:** `gym-admin-panel/src/pages/Payments.jsx`
- **Fix:** Default "Full Payment".

### PAYMENTS-3 — No live Final Amount preview after discount
- **File:** `gym-admin-panel/src/pages/Payments.jsx`
- **Fix:** Derived `finalAmount = discountType==='percentage' ? orig*(1-disc/100) : orig-disc`. Render below fields.

### PACKAGES-2 — Duration (Days) shown when Lifetime=ON
- **File:** `gym-admin-panel/src/pages/Packages.jsx`
- **Fix:** `{!isLifetime && <DurationInput />}`.

### PACKAGES-3 — Package cards don't show gender-split pricing
- **File:** `gym-admin-panel/src/pages/Packages.jsx` (card render)
- **Fix:** `{priceGents === priceLadies ? `৳${priceGents}` : `৳${priceGents} / ৳${priceLadies}`}`.

### STORE-3 — "Del" label inconsistent with "Delete" elsewhere
- **File:** `gym-admin-panel/src/pages/Store.jsx`
- **Fix:** Use "Delete" everywhere or move Edit/Delete into kebab menu.

### MEMBERS-1 — Action column truncated at 1440px
- **File:** `gym-admin-panel/src/pages/MembersList.jsx`
- **Fix:** `min-width: 140px` on ACTIONS column; allow horizontal scroll on container.

### ADMINS-1 — Password field has no strength meter / show-password toggle / confirm
- **File:** `gym-admin-panel/src/pages/Admins.jsx` (Add Admin modal)
- **Fix:** Add show/hide toggle, min-length validation, confirm field.

### ADMINS-2 — Permissions checkboxes visible even when Role=Super Admin
- **File:** `gym-admin-panel/src/pages/Admins.jsx`
- **Fix:** Hide permissions when Super Admin selected, or auto-check all + disable.

---

## Test suite drift (not product bugs, still to fix)

13 pre-existing Playwright failures after package-module rewrite. Tests reference removed `Monthly Prepaid` package / non-lifetime packages.

Files to update:
- `e2e/03-packages.spec.js` (tests 3.1, 3.2, 3.4, 3.15)
- `e2e/04-add-member.spec.js` (tests 4.5, 4.6, 4.7, 4.11)
- `e2e/06-member-details.spec.js` (test 6.6)
- `e2e/10-subscriptions.spec.js` (test 10.7 — `packages.find(p => !p.isLifetime)` returns undefined; all packages now lifetime)
- `e2e/14-edge-cases.spec.js` (tests 14.3, 14.4, 14.5)

Align assertions with current "every package = lifetime + X free months" model.

---

## Not tested this pass (for next QA)

- Secondary admin role-gating (create non-super admin + log in as them → verify Devices/Admins hidden, Delete Members hidden).
- Real ZKTeco device add + user link flow.
- Store Sell / Restock full modals (only listed view captured).
- Bulk delete payment checkboxes.
- Manual check-in blocks expired member (already covered in prior lifetime-expiry QA — re-verify after EDITMEMBER-1 fix).
