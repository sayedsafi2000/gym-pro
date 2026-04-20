import React from 'react';

// Returns the list of items to render: numbers and 'ellipsis' markers.
// Shows first, last, current, and neighbors; collapses the rest.
const buildPages = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = [1];
  if (current > 3) pages.push('e1');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('e2');
  pages.push(total);
  return pages;
};

const Pagination = ({ page, totalPages, onChange, className = '' }) => {
  if (!totalPages || totalPages < 2) return null;

  const safe = Math.min(Math.max(1, page || 1), totalPages);
  const items = buildPages(safe, totalPages);

  const btn = 'inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-control border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const idle = 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800';
  const active = 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500';

  return (
    <nav className={`flex items-center justify-between gap-2 py-3 ${className}`} aria-label="Pagination">
      {/* Mobile compact view */}
      <div className="flex sm:hidden items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <span>Page {safe} of {totalPages}</span>
      </div>

      <div className="hidden sm:flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(safe - 1)}
          disabled={safe <= 1}
          className={`${btn} ${idle}`}
          aria-label="Previous page"
        >
          ‹ Prev
        </button>
        {items.map((it, i) =>
          typeof it === 'number' ? (
            <button
              type="button"
              key={i}
              onClick={() => onChange(it)}
              className={`${btn} ${it === safe ? active : idle}`}
              aria-current={it === safe ? 'page' : undefined}
            >
              {it}
            </button>
          ) : (
            <span key={i} className="px-1 text-slate-400 dark:text-slate-500">…</span>
          )
        )}
        <button
          type="button"
          onClick={() => onChange(safe + 1)}
          disabled={safe >= totalPages}
          className={`${btn} ${idle}`}
          aria-label="Next page"
        >
          Next ›
        </button>
      </div>

      {/* Mobile buttons */}
      <div className="flex sm:hidden items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(safe - 1)}
          disabled={safe <= 1}
          className={`${btn} ${idle}`}
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => onChange(safe + 1)}
          disabled={safe >= totalPages}
          className={`${btn} ${idle}`}
        >
          ›
        </button>
      </div>
    </nav>
  );
};

export default Pagination;
