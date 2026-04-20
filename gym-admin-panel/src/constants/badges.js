// Shared badge / pill colour tokens so the same category renders the same
// across pages (Store tiles, receipts, product dropdowns, etc.).

const CATEGORY_COLORS = {
  Supplements: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-300',
  Apparel: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-900/30 dark:text-blue-300',
  Accessories: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/60 dark:bg-purple-900/30 dark:text-purple-300',
  Equipment: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/60 dark:bg-orange-900/30 dark:text-orange-300',
  Drinks: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800/60 dark:bg-cyan-900/30 dark:text-cyan-300',
};

const CATEGORY_FALLBACK = 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';

export const getCategoryColor = (cat) => CATEGORY_COLORS[cat] || CATEGORY_FALLBACK;

export const getStockBadge = (stock) => {
  if (stock === 0) {
    return {
      label: 'Out of Stock',
      cls: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-300',
    };
  }
  if (stock < 10) {
    return {
      label: `Low Stock (${stock})`,
      cls: 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800/60 dark:bg-yellow-900/30 dark:text-yellow-300',
    };
  }
  return {
    label: `In Stock (${stock})`,
    cls: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800/60 dark:bg-green-900/30 dark:text-green-300',
  };
};
