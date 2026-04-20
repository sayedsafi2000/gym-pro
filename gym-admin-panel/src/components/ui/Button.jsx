import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from './cn';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-control font-medium transition ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const VARIANTS = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 ' +
    'dark:bg-brand-500 dark:hover:bg-brand-400',
  secondary:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 ' +
    'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 ' +
    'dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100',
  danger:
    'bg-red-600 text-white hover:bg-red-700 ' +
    'dark:bg-red-600 dark:hover:bg-red-500',
  success:
    'bg-accent-600 text-white hover:bg-accent-700 ' +
    'dark:bg-accent-500 dark:hover:bg-accent-400',
  warning:
    'bg-amber-500 text-white hover:bg-amber-600 ' +
    'dark:bg-amber-500 dark:hover:bg-amber-400',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

const Spinner = ({ className }) => (
  <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const Button = React.forwardRef(function Button(
  {
    as,
    to,
    href,
    type,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    iconLeft,
    iconRight,
    fullWidth = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className);
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  const content = (
    <>
      {loading ? (
        <Spinner className={iconSize} />
      ) : (
        iconLeft && <span className={cn('shrink-0', iconSize)}>{iconLeft}</span>
      )}
      {children && <span>{children}</span>}
      {!loading && iconRight && <span className={cn('shrink-0', iconSize)}>{iconRight}</span>}
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }
  const Tag = as || 'button';
  return (
    <Tag
      ref={ref}
      type={Tag === 'button' ? type || 'button' : type}
      className={classes}
      disabled={disabled || loading}
      {...rest}
    >
      {content}
    </Tag>
  );
});

export default Button;
