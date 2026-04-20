import React from 'react';
import { cn } from './cn';

const EmptyState = ({ icon, title, description, action, className }) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center text-center py-12 px-6',
      'rounded-card border border-dashed border-slate-200 bg-slate-50/50',
      'dark:border-slate-800 dark:bg-slate-900/40',
      className,
    )}
  >
    {icon && (
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {icon}
      </div>
    )}
    {title && (
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
    )}
    {description && (
      <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
