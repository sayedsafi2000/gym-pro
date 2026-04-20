# Dead Code Analysis — 2026-04-20

Tools: knip, depcheck. ts-prune skipped (no TypeScript).
Test baseline: no JS unit tests. Playwright E2E (112 specs) requires Docker stack.
Verification strategy: manual grep confirm + `npm run build` + `npm run lint` per change.

## Summary

| Category | Count | Action |
|---------|-------|--------|
| SAFE    | 3     | Propose delete |
| CAUTION | 2     | Optional de-export |
| DANGER / false-positive | 9 | Leave alone |

---

## SAFE — propose delete

### 1. `gym-admin-panel/src/App.css` — unused stylesheet
- Not imported anywhere (`App.jsx` + `main.jsx` verified).
- Vite build won't include it.
- **Action:** delete file.

### 2. `gym-admin-panel` devDep `autoprefixer`
- `postcss.config.js` uses only `@tailwindcss/postcss`.
- Tailwind 4 handles autoprefixing internally.
- **Action:** remove from `package.json` devDependencies.
- **Verify:** `npm run build` + visual check.

### 3. `gym-admin-panel/src/contexts/ThemeContext.jsx` default export
- `ThemeContext` exported as default but never imported externally.
- Named `ThemeProvider` + `useTheme` are used.
- **Action:** drop `export default ThemeContext;` line. Keep const (used internally by Provider).

---

## CAUTION — optional de-export (not deletion)

### 4. `gym-admin-panel/src/utils/auth.js` — internal-only exports
Exports never imported externally:
- `TOKEN_KEY`, `ADMIN_KEY` (only used within `auth.js`)
- `getAdminData` (called by `getRole`, `getPermissions` internally)
- `getRole` (called by `isSuperAdmin` internally)
- `getPermissions` (called by `hasPermission` internally)
- **Action:** strip `export` keyword on the 5 symbols.
- **Risk:** low — behaviour unchanged, just API surface shrinks.

### 5. `gym-server/controllers/subscriptionController.js` exports
- `syncMemberFields`, `recalculateSubscriptionFinancials` — only called internally.
- Exported via `module.exports = { ..., syncMemberFields, recalculateSubscriptionFinancials }`.
- **Action:** drop from exports object.
- **Risk:** low — nothing imports them.

---

## DANGER / false-positives — DO NOT TOUCH

| Item | Why flagged | Why keep |
|------|-------------|----------|
| `gym-admin-panel/public/sw.js` | knip: unused | Registered in `main.jsx:19` via `navigator.serviceWorker.register('/sw.js')`. |
| `gym-server/migrate-lifetime.js` | knip: unused file | CLI migration script — run manually via `node`. |
| `gym-server/migrate-products.js` | knip: unused file | CLI migration script. |
| `gym-server/migrate-subscriptions.js` | knip: unused file | CLI migration script. |
| `gym-server/middleware/authMiddleware.js` `protect` export | knip | Imported via `require('../middleware/authMiddleware')` (default export). |
| `gym-server/services/attendanceSyncService.js` `start`/`stop` | knip | Called in `server.js:55`. |
| depcheck admin false-positives: `@tailwindcss/postcss`, `@types/react`, `@types/react-dom`, `postcss`, `tailwindcss` | depcheck AST didn't resolve | Build tooling — required. |
| depcheck server: none | — | — |
| `paymentController.js` parser error | depcheck: `Unexpected reserved word 'package'` at 120:10 | Legal in JS (`package` reserved only in strict/module). Ignore for depcheck; fine at runtime under CommonJS. |

---

## Test strategy

No JS unit tests. Per-change verification:
1. `cd gym-admin-panel && npm run lint && npm run build` for admin changes.
2. `node -e "require('./controllers/subscriptionController')"` for server changes.
3. Playwright E2E optional if Docker stack up.

Rollback: `git reset --hard HEAD~1` per change (tree was clean at start).
