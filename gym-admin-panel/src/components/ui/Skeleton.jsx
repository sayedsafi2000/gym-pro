import React from 'react';
import { cn } from './cn';

const Skeleton = ({ className, as: Tag = 'div', ...rest }) => (
  <Tag
    className={cn(
      'animate-pulse rounded-control bg-slate-200 dark:bg-slate-800',
      className,
    )}
    {...rest}
  />
);

export default Skeleton;
