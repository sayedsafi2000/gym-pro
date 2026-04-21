import React, { useEffect, useRef } from 'react';
import { cn } from './cn';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const Modal = ({
  open,
  onClose,
  size = 'md',
  labelledBy,
  describedBy,
  closeOnBackdrop = true,
  initialFocusRef,
  className,
  children,
}) => {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;

    const node = dialogRef.current;
    const target =
      initialFocusRef?.current ||
      node?.querySelector('[data-autofocus]') ||
      node?.querySelector(FOCUSABLE);
    target?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const focusables = Array.from(node.querySelectorAll(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previouslyFocused.current && typeof previouslyFocused.current.focus === 'function') {
        previouslyFocused.current.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
    >
      <div
        className="fixed inset-0 bg-slate-900/50"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full mx-4 max-h-[95vh] overflow-y-auto',
          'rounded-card border border-slate-200 bg-white shadow-card-lg',
          'dark:border-slate-800 dark:bg-slate-900',
          SIZES[size],
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
