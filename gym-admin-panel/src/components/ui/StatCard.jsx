import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from './cn';

const ACCENTS = {
  neutral: 'text-slate-500 dark:text-slate-400',
  brand: 'text-brand-600 dark:text-brand-400',
  success: 'text-accent-600 dark:text-accent-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
  info: 'text-sky-600 dark:text-sky-400',
};

const ICON_BG = {
  neutral: 'bg-slate-100 dark:bg-slate-800',
  brand: 'bg-brand-50 dark:bg-brand-900/40',
  success: 'bg-accent-50 dark:bg-accent-900/40',
  warning: 'bg-amber-50 dark:bg-amber-900/40',
  danger: 'bg-red-50 dark:bg-red-900/40',
  info: 'bg-sky-50 dark:bg-sky-900/40',
};

const StatCard = ({
  label,
  value,
  hint,
  icon,
  accent = 'neutral',
  to,
  trend,
  className,
}) => {
  const Wrapper = to ? Link : 'div';
  const wrapperProps = to ? { to } : {};
  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        'group block rounded-card border border-slate-200 bg-white shadow-card p-5',
        'dark:border-slate-800 dark:bg-slate-900',
        to && 'transition hover:border-slate-300 hover:shadow-card-lg dark:hover:border-slate-700',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className={cn('mt-2 text-2xl font-semibold tabular-nums', ACCENTS[accent])}>
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
          )}
          {trend && (
            <p
              className={cn(
                'mt-2 inline-flex items-center gap-1 text-xs font-medium',
                trend.direction === 'up' && 'text-accent-600 dark:text-accent-400',
                trend.direction === 'down' && 'text-red-600 dark:text-red-400',
                trend.direction === 'flat' && 'text-slate-500 dark:text-slate-400',
              )}
            >
              {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'shrink-0 flex h-10 w-10 items-center justify-center rounded-control',
              ICON_BG[accent],
              ACCENTS[accent],
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Wrapper>
  );
};

export default StatCard;
