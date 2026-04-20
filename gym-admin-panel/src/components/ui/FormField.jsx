import React, { useId } from 'react';
import { cn } from './cn';

const FormField = ({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  className,
  children,
}) => {
  const generatedId = useId();
  const fieldId = htmlFor || generatedId;

  const child = React.isValidElement(children)
    ? React.cloneElement(children, {
        id: children.props.id || fieldId,
        'aria-invalid': error ? true : children.props['aria-invalid'],
        'aria-describedby':
          [children.props['aria-describedby'], error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : null]
            .filter(Boolean)
            .join(' ') || undefined,
        error: error ? true : children.props.error,
      })
    : children;

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={fieldId}
          className="flex items-center gap-1 text-xs font-medium text-slate-600 uppercase tracking-wide dark:text-slate-400"
        >
          {label}
          {required && (
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-red-500"
              title="Required"
            />
          )}
        </label>
      )}
      {child}
      {error ? (
        <p id={`${fieldId}-error`} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

export default FormField;
