import React from 'react';
import { cn } from './cn';

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const Card = React.forwardRef(function Card(
  { as: Tag = 'div', padding = 'md', interactive = false, className, children, ...rest },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={cn(
        'rounded-card border border-slate-200 bg-white shadow-card',
        'dark:border-slate-800 dark:bg-slate-900',
        interactive &&
          'transition hover:border-slate-300 hover:shadow-card-lg dark:hover:border-slate-700',
        PADDING[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
});

export default Card;
