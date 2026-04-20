import React from 'react';

const ConfirmModal = ({ open, title, message, onConfirm, onCancel, confirmLabel = 'Delete', danger = true }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/50" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white rounded-[5px] border border-slate-200 shadow-lg max-w-sm w-full mx-4 p-6 z-10 dark:bg-slate-900 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-[5px] border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 dark:bg-slate-800 dark:text-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-[5px] px-4 py-2 text-sm font-medium text-white transition ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
