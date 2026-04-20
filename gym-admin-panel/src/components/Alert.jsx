import React from 'react';

// Shared banner for inline success/error/info messaging. Replaces the ad-hoc
// divs scattered across pages so colour tokens stay consistent.

const STYLES = {
  error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-300',
  success: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800/60 dark:bg-green-900/30 dark:text-green-300',
  info: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-900/30 dark:text-blue-300',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800/60 dark:bg-yellow-900/30 dark:text-yellow-300',
};

const Alert = ({ type = 'info', children, className = '' }) => {
  if (!children) return null;
  const role = type === 'error' ? 'alert' : 'status';
  return (
    <div role={role} className={`rounded-control border px-4 py-3 text-sm ${STYLES[type] || STYLES.info} ${className}`}>
      {children}
    </div>
  );
};

export default Alert;
