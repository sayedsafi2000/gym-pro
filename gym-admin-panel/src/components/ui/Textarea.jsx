import React from 'react';
import { cn } from './cn';

const BASE =
  'block w-full rounded-control border bg-white px-4 py-2.5 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 transition ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed ' +
  'dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 ' +
  'dark:focus:ring-brand-900/50 dark:focus:border-brand-500';

const Textarea = React.forwardRef(function Textarea(
  { error = false, rows = 4, className, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        BASE,
        error
          ? 'border-red-400 focus:border-red-500 focus:ring-red-200 dark:border-red-500'
          : 'border-slate-300 dark:border-slate-700',
        className,
      )}
      {...rest}
    />
  );
});

export default Textarea;
