# GymPro — Testing Guide

## Running Automated Tests

```bash
# Install (one-time)
npm install -D @playwright/test
npx playwright install chromium

# Run all tests
npx playwright test

# Run specific test file
npx playwright test e2e/07-renewal.spec.js

# Run with browser visible
npx playwright test --headed

# Run specific test by name
npx playwright test -g "manual check-in blocked"
```

**Prerequisites:** App must be running at http://localhost (via `docker compose up --build`).

---

## Manual Testing Checklist

### Setup
- [ ] Fresh database (or known state)
- [ ] Super admin: `admin@gym.com` / `Password123`
- [ ] 6 seeded packages exist
- [ ] App running at http://localhost

---

### 1. AUTH

| # | Scenario | Steps | Expected | Pass? |
|---|----------|-------|----------|-------|
| 1.1 | Login page loads | Navigate to http://localhost | Email + password form visible | [ ] |
| 1.2 | Valid login | Enter admin@gym.com / Password123 → Submit | Dashboard loads | [ ] |
| 1.3 | Invalid login | Enter wrong credentials → Submit | Error message shown | [ ] |
| 1.4 | Logout | Click logout in nav | Back to login page | [ ] |
| 1.5 | Protected routes | Clear localStorage → visit /members | Redirected to login | [ ] |

---

### 2. DASHBOARD

| # | Scenario | Steps | Expected | Pass? |
|---|----------|-------|----------|-------|
| 2.1 | Stats cards | Login → view dashboard | Total Members, Active, Expiring, Expired cards | [ ] |
| 2.2 | No alerts section | Scroll down | No "Alerts" heading, no "Member Status" heading | [ ] |
| 2.3 | Attendance cards | Check top area | Check-ins Today + Present Now cards | [ ] |
| 2.4 | Store analytics | Scroll to Store Analytics | Total Products, Low Stock, Out of Stock, Revenue | [ ] |
| 2.5 | Clickable cards | Click "Total Members" | Navigates to /members | [ ] |

---

### 3. PACKAGES

| # | Scenario | Steps | Expected | Pass? |
|---|----------|-------|----------|-------|
| 3.1 | Seeded packages | Navigate to /packages | 6 packages in grid | [ ] |
| 3.2 | Regular badges | Check Lifetime + Monthly | "Regular" slate badge | [ ] |
| 3.3 | Special badges | Check Super Saver, Plus, Ultra, Premium | "Special Offer" orange badge | [ ] |
| 3.4 | Gender pricing | Monthly Prepaid card | ♂ ৳800 \| ♀ ৳1,000 | [ ] |
| 3.5 | Same-price display | Lifetime Membership card | Single price ৳4,000 | [ ] |
| 3.6 | Admission fee note | Monthly Prepaid | "+ ৳4,000 admission fee" | [ ] |
| 3.7 | Admission included | Super Saver card | "Admission fee included" | [ ] |
| 3.8 | Free months | Super Saver card | "2 months free" | [ ] |
| 3.9 | Benefits list | Premium Package | 6 benefits with checkmarks | [ ] |
| 3.10 | Add modal fields | Click + Add Package | Name, category, gents/ladies price, duration, admission, free months, benefits | [ ] |
| 3.11 | Create package | Fill form → save | New card appears | [ ] |
| 3.12 | Edit package | Click Edit → modify → save | Changes reflected | [ ] |
| 3.13 | Delete package | Click Delete → confirm | Card removed | [ ] |
| 3.14 | Lifetime toggle | Toggle in add form | Duration field hides when ON | [ ] |
| 3.15 | Category toggle | Click Regular / Special Offer | Category switches | [ ] |

---

### 4. ADD MEMBER

| # | Scenario | Steps | Expected | Pass? |
|---|----------|-------|----------|-------|
| 4.1 | Form loads | Navigate to /members/add | Personal info + Membership + Payment sections | [ ] |
| 4.2 | Female pricing | Select Female → Monthly Prepaid | Price shows ৳5,000 (1000+4000) | [ ] |
| 4.3 | Male pricing | Select Male → Monthly Prepaid | Price shows ৳4,800 (800+4000) | [ ] |
| 4.4 | Package preview | Select any package | Preview card with name, price, benefits | [ ] |
| 4.5 | Full payment | Select Full Payment → create | paidAmount = totalAmount, dueAmount = 0 | [ ] |
| 4.6 | Partial payment | Select Partial, enter 1000 → create | paidAmount = 1000, due = total-1000 | [ ] |
| 4.7 | Due payment | Select Due → create | paidAmount = 0, dueAmount = total | [ ] |
| 4.8 | Monthly installment | Select Monthly, 3 months → create | Installment plan created, month 1 paid | [ ] |
| 4.9 | Lifetime package | Select Lifetime Membership → create | No expiry date, status Active | [ ] |
| 4.10 | Special offer pricing | Select Premium Package | Total = ৳12,500 (admission included) | [ ] |
| 4.11 | Subscription created | Create member → check DB | Subscription record with correct data | [ ] |

---

### 5. MEMBERS LIST

| # | Scenario | Steps | Expected | Pass? |
|---|----------|-------|----------|-------|
| 5.1 | List loads | Navigate to /members | All members shown | [ ] |
| 5.2 | Search by name | Type member name | Results filter | [ ] |
| 5.3 | Search by phone | Type phone number | Results filter | [ ] |
| 5.4 | Search by ID | Type GYM-001 | Results filter | [ ] |
| 5.5 | Filter active | Apply active filter | Only active members | [ ] |
| 5.6 | Filter expired | Apply expired filter | Only expired members | [ ] |

---

### 6. MEMBER DETAILS

| # | Scenario | Steps | Expected | Pass? |
|---|----------|-------|----------|-------|
| 6.1 | Header | Open member details | Name, ID badge, status badge | [ ] |
| 6.2 | Personal info | Check info section | Phone, gender, address, dates, package, fingerprint | [ ] |
| 6.3 | Financial summary | Check right panel | Total, Paid, Due with correct amounts | [ ] |
| 6.4 | Progress bar (active) | Active member with expiry | Green/yellow bar, days remaining | [ ] |
| 6.5 | Progress bar (expired) | Expired member | Red bar, "Expired" | [ ] |
| 6.6 | No progress (lifetime) | Lifetime member | No progress bar shown | [ ] |
| 6.7 | Check-in button | Active member | Green "Check In" visible | [ ] |
| 6.8 | Renew button | Expired member | Blue "Renew Membership" visible | [ ] |
| 6.9 | Manual check-in | Click Check In | Success toast, button → Check Out | [ ] |
| 6.10 | Manual check-out | Click Check Out | Success toast, button → Check In | [ ] |
| 6.11 | Subscription history | Scroll down | Table with all subscriptions | [ ] |
| 6.12 | Payment history | Check payment table | All payments with date, amount, method | [ ] |
| 6.13 | Receipt button | Click Receipt on payment | Receipt modal opens | [ ] |
| 6.14 | Installment schedule | Member with installments | Schedule table visible | [ ] |
| 6.15 | Attendance stats | Check stat cards | Visits, streak, attendance rate | [ ] |
| 6.16 | Calendar | Check calendar | Monthly view with markers | [ ] |

---

### 7. RENEWAL FLOW

| # | Scenario | Steps | Expected | Pass? |
|---|----------|-------|----------|-------|
| 7.1 | Modal opens | Expired member → Renew Membership | Modal with package, payment type, method | [ ] |
| 7.2 | Package selector | Open modal | All packages with gender-aware prices | [ ] |
| 7.3 | Full payment | Select package → Full → Cash → Renew | Status Active, subscription created, payment recorded | [ ] |
| 7.4 | Partial payment | Partial → enter amount → Renew | Active with due amount | [ ] |
| 7.5 | Due payment | Due → Renew | Active, full due, no payment | [ ] |
| 7.6 | Different package | Renew with different package | New subscription references new package | [ ] |
| 7.7 | Old sub cancelled | After renewal | Previous subscription shows "Cancelled" | [ ] |
| 7.8 | Check-in after renewal | Renew → check in | Check-in works | [ ] |

---

### 8. PAYMENTS

| # | Scenario | Steps | Expected | Pass? |
|---|----------|-------|----------|-------|
| 8.1 | Page loads | Navigate to /payments | Form + history table | [ ] |
| 8.2 | Select member | Pick from dropdown | Package auto-filled, amount suggested | [ ] |
| 8.3 | Quick fill: Full Due | Click "Pay Full Due" | Amount = dueAmount | [ ] |
| 8.4 | Quick fill: 50% | Click "Pay 50%" | Amount = 50% of due | [ ] |
| 8.5 | Fixed discount | Enter 100, type fixed | Final = original - 100 | [ ] |
| 8.6 | Percentage discount | Enter 10, type percentage | Final = original - 10% | [ ] |
| 8.7 | Create payment | Submit form | Payment in table, financials updated | [ ] |
| 8.8 | Exceeds due rejected | Enter amount > due | Error message | [ ] |
| 8.9 | Delete payment | Click delete | Removed, financials recalculated | [ ] |
| 8.10 | Bulk delete | Select multiple → delete | All removed, all members recalculated | [ ] |
| 8.11 | Receipt | Click Receipt | Receipt modal with correct data | [ ] |

---

### 9. ATTENDANCE

| # | Scenario | Steps | Expected | Pass? |
|---|----------|-------|----------|-------|
| 9.1 | Active check-in | Manual check-in for active member | 201 success | [ ] |
| 9.2 | Expired blocked | Manual check-in for expired member | 403 "expired" error | [ ] |
| 9.3 | Lifetime allowed | Manual check-in for lifetime member | Always succeeds | [ ] |
| 9.4 | Auto toggle | Check-in → next auto = check-out | Types alternate | [ ] |
| 9.5 | Today summary | Check /attendance page | Today's check-ins/check-outs | [ ] |

---

### 10. SUBSCRIPTIONS

| # | Scenario | Steps | Expected | Pass? |
|---|----------|-------|----------|-------|
| 10.1 | Created on member add | Create member → check subscriptions | 1 active subscription | [ ] |
| 10.2 | Active endpoint | GET active subscription | Returns active or null | [ ] |
| 10.3 | Renewal creates new | Renew → check history | New active, old cancelled | [ ] |
| 10.4 | One active only | Multiple renewals | Only 1 active ever | [ ] |
| 10.5 | Admin expire | Force expire via API | Status → expired | [ ] |
| 10.6 | Admin activate | Reactivate via API | Status → active | [ ] |
| 10.7 | Fields synced | After any change | Member fields match subscription | [ ] |
| 10.8 | History accumulates | Renew 3 times | 4+ subscription records | [ ] |

---

### 11. EDIT MEMBER

| # | Scenario | Steps | Expected | Pass? |
|---|----------|-------|----------|-------|
| 11.1 | Form populated | Open edit page | All fields filled | [ ] |
| 11.2 | Update info | Change name → save | Name updated | [ ] |
| 11.3 | Change package | Select new package → save | Expiry recalculated | [ ] |
| 11.4 | Additional payment | Enter payment → save | Paid increases, due decreases | [ ] |

---

### 12. STORE

| # | Scenario | Steps | Expected | Pass? |
|---|----------|-------|----------|-------|
| 12.1 | Page loads | Navigate to /store | Products grid + inventory | [ ] |
| 12.2 | Create product | Add new product | Appears in grid | [ ] |
| 12.3 | Sell product | Sell 1 unit | Stock decreases, sale recorded | [ ] |
| 12.4 | Restock | Restock 5 units | Stock increases | [ ] |
| 12.5 | Sale receipt | Click receipt on sale | Receipt modal opens | [ ] |

---

### 13. ADMIN MANAGEMENT

| # | Scenario | Steps | Expected | Pass? |
|---|----------|-------|----------|-------|
| 13.1 | Create admin | POST /auth/admins | Admin created | [ ] |
| 13.2 | List admins | GET /auth/admins | All admins listed | [ ] |
| 13.3 | Update permissions | PUT /auth/admins/:id | Permissions changed | [ ] |
| 13.4 | Pending member | Regular admin creates member | Status = pending | [ ] |
| 13.5 | Approve member | Super admin approves | Status = approved | [ ] |
| 13.6 | Delete admin | DELETE /auth/admins/:id | Admin removed | [ ] |

---

### 14. EDGE CASES

| # | Scenario | Steps | Expected | Pass? |
|---|----------|-------|----------|-------|
| 14.1 | Double renewal | Renew twice rapidly | Only 1 active subscription | [ ] |
| 14.2 | Delete all payments | Delete every payment | paidAmount=0, dueAmount=total | [ ] |
| 14.3 | Lifetime never expires | Create lifetime member | expiryDate=null, always active | [ ] |
| 14.4 | Female Monthly = 5000 | Female + Monthly Prepaid | Total = 1000+4000 | [ ] |
| 14.5 | Male Monthly = 4800 | Male + Monthly Prepaid | Total = 800+4000 | [ ] |
| 14.6 | Special no admission | Super Saver member | Total = 3000 (no extra) | [ ] |
| 14.7 | Non-existent member | Check-in with bad ID | 404 error | [ ] |
| 14.8 | Missing required fields | Create payment with empty fields | 400 error | [ ] |
| 14.9 | Auto-increment IDs | Create 2 members | GYM-XXX increments | [ ] |
| 14.10 | Correct subscription dates | 30-day package | endDate = startDate + 30 days | [ ] |

---

## Test Coverage Summary

| Category | Automated | Manual | Total |
|----------|-----------|--------|-------|
| Auth | 5 | 5 | 5 |
| Dashboard | 5 | 5 | 5 |
| Packages | 15 | 15 | 15 |
| Add Member | 11 | 11 | 11 |
| Members List | 6 | 6 | 6 |
| Member Details | 10 | 16 | 16 |
| Renewal | 8 | 8 | 8 |
| Payments | 9 | 11 | 11 |
| Attendance | 7 | 5 | 7 |
| Subscriptions | 8 | 8 | 8 |
| Edit Member | 4 | 4 | 4 |
| Store | 7 | 5 | 7 |
| Admin | 7 | 6 | 7 |
| Edge Cases | 10 | 10 | 10 |
| **Total** | **112** | **115** | **120** |
