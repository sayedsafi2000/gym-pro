# TODOS

## UI Refinement (from /plan-design-review, 2026-04-09)

### 1. Create DESIGN.md
Document the de facto design system: slate palette, `rounded-[5px]`, `p-6` cards,
`p-8` headers, `font-semibold` headings, `৳` currency, no gradients, status badge pattern.
Prevents further drift across pages.
**Depends on:** Nothing. **Effort:** ~5 min.

### 2. Toast Notification System
Create `ToastProvider.jsx` + `useToast.js` hook. Toasts appear top-right, auto-dismiss
after 4s. `bg-slate-900 text-white` for success, `bg-red-600 text-white` for error.
`aria-live="polite"` on container. Wrap App in `<ToastProvider>` in main.jsx.
Replace all `alert()` and silent `console.error` across: AddMember, EditMember,
MembersList, Store, Attendance, Dashboard, MemberDetails, Payments.
**Depends on:** Nothing. **Effort:** ~15 min.

### 3. Mobile Hamburger Menu
Replace wrapping flex nav in Layout.jsx with hamburger on <768px. Slide-out drawer
overlay with backdrop. Desktop nav stays horizontal. Increase touch targets to
`px-4 py-2.5` (≥44px). Add `aria-label` and `aria-expanded` on hamburger button.
**Depends on:** Nothing. **Effort:** ~15 min.

### 4. Flatten AddMember Page
Remove gradients, shadow-xl, transform hover:scale-105. Replace all `gray-*` with
`slate-*`. Replace `rounded-2xl` on inputs with `rounded-[5px]`. Replace `font-bold`
with `font-semibold`. Flat submit button: `bg-slate-900 text-white hover:bg-slate-800`.
Preview section: `bg-slate-50 border border-slate-200` instead of gradient.
**Depends on:** DESIGN.md. **Effort:** ~10 min.

### 5. Flatten EditMember Page
Remove gradient header → flat `bg-white border border-slate-200 p-8`. Flat submit
button. Fix preview section gradient. Add `← Back to Members` link at top of header
(matching MemberDetails pattern).
**Depends on:** DESIGN.md. **Effort:** ~10 min.

### 6. Fix Store.jsx
Replace `rounded-2xl` on form inputs with `rounded-[5px]`. Add empty state when
products array is empty: "No products yet. Add your first product."
**Depends on:** Nothing. **Effort:** ~5 min.

### 7. Fix MembersList.jsx
Replace `rounded-3xl` on table container with `rounded-[5px]`.
**Depends on:** Nothing. **Effort:** ~1 min.

### 8. Fix MemberDetails Currency
Replace `$` with `৳` on lines 237, 241, 246, 377, 383. Change `' BDT'` discount
suffix to `'৳'`.
**Depends on:** Nothing. **Effort:** ~2 min.

### 9. Dashboard Contextual Alerts
Replace Quick Actions section with actionable alerts: expiring memberships, overdue
payments, device sync failures. Add backend `GET /api/dashboard/alerts` endpoint.
Each alert is a clickable row with color-coded badge and link. Empty state: "All
clear — no alerts right now."
**Depends on:** Backend endpoint. **Effort:** ~20 min.

### 10. Empty State Improvements
Add warm empty states with CTA buttons to: Store (no products), Payments (filtered
to zero), Dashboard alerts (all clear), Calendar (no attendance this month).
Pattern: centered text + action button + `bg-slate-50` background.
**Depends on:** Nothing. **Effort:** ~10 min.

### 11. Calendar Mobile Optimization
On <640px: abbreviate day headers to single letters (S M T W T F S). Reduce cell
font to `text-xs`. Show tooltip below cell instead of above to prevent clipping.
**Depends on:** Nothing. **Effort:** ~10 min.

### 12. MemberDetails Stats Row Reflow
Change stats grid from `lg:grid-cols-6` to `lg:grid-cols-3` (2 rows of 3 cards).
Gives more breathing room for values like "1h 55m" and "52%".
**Depends on:** Nothing. **Effort:** ~1 min.

### 13. Critical Accessibility
- Toast container: `aria-live="polite"` + `role="status"`
- Nav buttons: `px-4 py-2.5` for 44px touch targets
- Hamburger: `aria-label="Open navigation menu"` + `aria-expanded`
- Calendar arrows: `aria-label="Previous month"` / `aria-label="Next month"`
**Depends on:** Toast system, hamburger menu. **Effort:** ~5 min.

---

## Deferred (not in current scope)

### Full Accessibility Audit
Keyboard nav on calendar, focus management, screen reader testing, full ARIA coverage.
**When:** After core UI is consistent.

### Delete Confirmation Modals
Replace `window.confirm()` with inline modals showing context. Needs a modal component.
**When:** After toast system is in place (shared component pattern established).

### Inline Prerequisite Hints
Show hints when Add Member has no packages, or Payments has no members.
**When:** After empty states are done.

### Nav Icons
Add SVG icons to nav items. Needs icon set selection (Heroicons, Lucide, etc.).
**When:** After hamburger menu is done.
