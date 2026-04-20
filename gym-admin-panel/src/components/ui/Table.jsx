import React from 'react';
import { cn } from './cn';

const Table = ({ className, children, ...rest }) => (
  <div className="w-full overflow-x-auto rounded-card border border-slate-200 dark:border-slate-800">
    <table
      className={cn(
        'min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800',
        className,
      )}
      {...rest}
    >
      {children}
    </table>
  </div>
);

const Header = ({ className, children, sticky = false, ...rest }) => (
  <thead
    className={cn(
      'bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500',
      'dark:bg-slate-800/60 dark:text-slate-400',
      sticky && 'sticky top-0 z-10',
      className,
    )}
    {...rest}
  >
    {children}
  </thead>
);

const Body = ({ className, children, ...rest }) => (
  <tbody
    className={cn(
      'divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900',
      className,
    )}
    {...rest}
  >
    {children}
  </tbody>
);

const Row = ({ className, children, interactive = false, ...rest }) => (
  <tr
    className={cn(
      interactive && 'transition hover:bg-slate-50 dark:hover:bg-slate-800/60',
      className,
    )}
    {...rest}
  >
    {children}
  </tr>
);

const Cell = ({ as: Tag = 'td', className, align = 'left', children, ...rest }) => (
  <Tag
    className={cn(
      'px-4 py-3 text-slate-700 dark:text-slate-300',
      align === 'right' && 'text-right',
      align === 'center' && 'text-center',
      className,
    )}
    {...rest}
  >
    {children}
  </Tag>
);

const Heading = ({ className, align = 'left', children, ...rest }) => (
  <th
    scope="col"
    className={cn(
      'px-4 py-3 font-semibold text-slate-500 dark:text-slate-400',
      align === 'right' && 'text-right',
      align === 'center' && 'text-center',
      className,
    )}
    {...rest}
  >
    {children}
  </th>
);

Table.Header = Header;
Table.Body = Body;
Table.Row = Row;
Table.Cell = Cell;
Table.Heading = Heading;

export default Table;
