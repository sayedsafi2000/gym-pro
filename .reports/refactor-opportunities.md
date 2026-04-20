# Refactor Opportunities — 2026-04-20

Scope: whole app. Evidence-based survey of gym-server + gym-admin-panel.

---

## SERVER (gym-server)

### HIGH

**S1. Extract PricingService (duplication)**
- `memberController.js:99,115,285` — gender pricing inline 3+ times
- Pkg model already has `getPriceForGender()`, `getTotalForGender()` — callers bypass
- Fix: one helper, delete inline math

**S2. Consolidate SubscriptionService (financials)**
- `subscriptionController.js:114-127,222-228` — total/paid/due calc repeated
- `paymentController.js:7-13,131-136,207-216` — `calculateDiscountValue` inline + recalc duplicated
- Fix: `services/subscriptionService.js` with `calculateFinancials`, `recordPayment`, `extendMonthly`

**S3. Split fat controllers**
- `memberController.js:77-230` createMember = 150 LOC (validate + expiry + sub + payment + installment)
- `subscriptionController.js:228-299` monthlyRenew mixes GymConfig lookup + datemath + member sync
- `paymentController.js:96-189` createPayment — validate + recalc + sub sync
- Fix: delegate to services; controllers = HTTP only

**S4. CORS wildcard**
- `server.js:15` — `cors()` no options
- Fix: `cors({ origin: env.ALLOWED_ORIGINS.split(',') })`

**S5. Hardcoded default admin creds**
- `authController.js:189-206` — seedAdmin email/password literal
- Fix: `.env.example` + force change on first login

**S6. Mass assignment risk**
- `memberController.js:272` — `req.body` spread into update
- Fix: whitelist fields before `findByIdAndUpdate`

**S7. Model denormalization drift**
- Member stores `totalAmount/paidAmount/dueAmount` — Subscription also stores. Diverge bugs likely.
- `Member.expiryDate` + `hasLifetimeMembership` + `freeMonthsEndDate` = 3 fields, 1 concept
- Fix: Subscription canonical; Member fields = derived cache rebuilt on write

**S8. ExpiryCalculator state machine**
- `memberController.js:309-352` — "never shorten" rule embedded in updateMember
- Fix: `services/expiry.js` — `recalculate(oldExpiry, pkg, joinDate, renewals)`

### MEDIUM

**S9. No global error middleware** — `server.js` returns raw `error.message` 500s. Add `app.use((err,req,res,next))` + AppError class.

**S10. No request validation lib** — all endpoints handwritten checks. Add Joi/Zod middleware on POST/PATCH routes.

**S11. Auth middleware bug** — `authMiddleware.js:4-25` missing `return` pattern; unreachable code after early return. Audit.

**S12. Rate limiting** — no `express-rate-limit` on `/api/auth`. Brute-force exposed.

**S13. Populate strings duplicated** — `PACKAGE_SELECT = '...'` constant across memberController / subscriptionController / paymentController (5+ sites each).

**S14. Config scattered** — `process.env.*` inline across 4 files. Add `config/index.js`.

**S15. Logging scattered** — `console.log/error` in 15+ places. Add logger + request ID middleware.

**S16. Sequential awaits** — `memberController.js:216-222` `await member.save(); await subscription.save()` → `Promise.all`.

### LOW

**S17. Commented-out pre-save hook** `Member.js:99-109` — delete.
**S18. Route ordering** — `paymentRoutes.js:17` `/bulk-delete` before `/:id` (non-REST).
**S19. Migration scripts** — `migrate-*.js` in root. Move to `/migrations`.
**S20. No Mongo URI validation** — `config/db.js:5` no guard.

---

## ADMIN PANEL (gym-admin-panel)

### HIGH

**A1. Giant pages — extract children**
- `pages/MemberDetails.jsx` — 921 LOC (receipt + renewal + checkin + calendar + stats)
- `pages/Store.jsx` — 727 LOC (14 useState, dual forms, pagination, filter)
- `pages/Payments.jsx` — 702 LOC (form + table + modals + bulk)
- Fix: extract `ReceiptSection`, `RenewalForm`, `ManualCheckIn`, `ProductForm`, `PaymentForm`, `PaymentTable`

**A2. `useForm` hook**
- `AddMember.jsx:44`, `EditMember.jsx:99`, +4 more — same `handleChange` spread pattern
- Fix: `hooks/useForm.js` returning `{ formData, handleChange, reset, setField }`

**A3. No 401 response interceptor**
- `services/api.js:9-15` — request interceptor only. Expired token → silent fail.
- Fix: `api.interceptors.response.use(null, err => { if (err.status===401) { clearAuth(); navigate('/login') } })`

**A4. Error parsing duplicated**
- `error.response?.data?.message` pattern in 10+ pages with inconsistent fallbacks
- Fix: `services/errorHandler.js` → `getErrorMessage(err)`

**A5. Delete `src/App.css`** — orphan, not imported.

### MEDIUM

**A6. AuthContext** — every page re-reads `getAdminData()` from localStorage. Create `AuthContext` + `useAuth()`.

**A7. Double toast bug** — `Store.jsx:90`, `Payments.jsx:155` — local error state + `showError()` both fire. Use one.

**A8. Lazy load heavy routes** — `App.jsx:19-42` all static imports. Wrap `MemberDetails`, `Store`, `Payments` in `React.lazy` + `<Suspense>`.

**A9. Modal accessibility** — `ConfirmModal.jsx` no ESC handler, no `role="dialog"`, no focus trap.

**A10. Icon extraction** — `Sidebar.jsx:35-52` inline SVG literals 8x. Make `components/Icons.jsx`.

**A11. Color constants** — `Store.jsx:10-25` `CATEGORY_COLORS` dict of Tailwind class strings. Extract to `constants/colors.js` with helpers.

**A12. Grouped state** — `Store.jsx` 14 useState → group modals/products/forms into objects.

**A13. SW half-implemented** — `/sw.js` registered, no cache strategy. Either finish or remove registration.

### LOW

**A14. Alert component** — red/green banners repeated 4+ places. Make `Alert.jsx` with `type` prop.
**A15. Route config file** — move route list to `config/routes.js`.
**A16. Memoize Sidebar icons** — if Layout re-renders often.
**A17. Recharts bundle audit** — confirm tree-shake; consider lighter lib if bundle big.
**A18. Dark mode verify** — `tailwind.config.js` `darkMode: 'class'` matches Tailwind 4 expectations; `index.css` manual variant may be obsolete.
**A19. Register.jsx** — confirm still routed; remove if dead.
**A20. Input id/htmlFor pairing** — `AddMember.jsx:108-153` labels lack matching input ids.

---

## Proposed execution order

**Phase 1 — safety + quick wins (½ day)**
- S4 CORS, S5 default creds, S6 mass assignment, S12 rate limit
- A3 401 interceptor, A5 delete App.css, S17/S19 cleanup

**Phase 2 — service extraction (1-2 days)**
- S1 PricingService, S2 SubscriptionService, S3 controller slimming
- S8 ExpiryCalculator, S13 populate constants
- S9 error middleware, S10 Joi validation

**Phase 3 — admin structure (1-2 days)**
- A2 useForm, A4 errorHandler, A6 AuthContext
- A1 page splits (Members/Store/Payments)
- A10/A11 Icons + colors extraction

**Phase 4 — polish (½ day)**
- A7/A8/A9/A12/A13 + remaining LOW items
- S14 config module, S15 logger

Risk: no unit tests → each phase needs Playwright E2E pass to verify.

---

## Recommendation

Start Phase 1 — low risk, high value, no architecture change. Pick one item to begin.
