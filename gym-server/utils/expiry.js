// Expiry date math. Centralised so create + edit flows stay consistent.
// Lifetime packages: expiryDate = end of the free-months window (never null
// on Member, since attendance uses it as a gate). Time-limited packages:
// expiryDate = join + duration days.

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * DAY_MS;

const calcExpiry = (pkg, joinDate) => {
  const base = new Date(joinDate).getTime();
  if (pkg.isLifetime) {
    const months = pkg.freeMonths || 0;
    return new Date(base + months * MONTH_MS);
  }
  return new Date(base + pkg.duration * DAY_MS);
};

// Monthly-renewal extensions can push expiryDate past what calcExpiry would
// reproduce. Never shorten on a plain edit — prefer the existing value when
// it's further in the future.
const reconcileExpiry = (existingExpiry, pkg, joinDate) => {
  const recalc = calcExpiry(pkg, joinDate);
  const existing = existingExpiry ? new Date(existingExpiry).getTime() : 0;
  return recalc.getTime() > existing ? recalc : existingExpiry;
};

module.exports = { calcExpiry, reconcileExpiry, DAY_MS, MONTH_MS };
