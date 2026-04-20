import React from 'react';
import { cn } from './cn';

const VARIANTS = {
  neutral:
    'bg-slate-100 text-slate-700 border border-slate-200 ' +
    'dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
  brand:
    'bg-brand-50 text-brand-700 border border-brand-100 ' +
    'dark:bg-brand-900/40 dark:text-brand-300 dark:border-brand-800',
  success:
    'bg-accent-50 text-accent-700 border border-accent-100 ' +
    'dark:bg-accent-900/40 dark:text-accent-300 dark:border-accent-800',
  warning:
    'bg-amber-50 text-amber-700 border border-amber-100 ' +
    'dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800',
  danger:
    'bg-red-50 text-red-700 border border-red-100 ' +
    'dark:bg-red-900/40 dark:text-red-200 dark:border-red-800',
  info:
    'bg-sky-50 text-sky-700 border border-sky-100 ' +
    'dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-800',
};

const SIZES = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
};

const Badge = ({ variant = 'neutral', size = 'md', className, children, ...rest }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-control font-medium',
      VARIANTS[variant],
      SIZES[size],
      className,
    )}
    {...rest}
  >
    {children}
  </span>
);

export default Badge;
