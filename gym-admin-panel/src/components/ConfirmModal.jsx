import React, { useId } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';

const ConfirmModal = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  loading = false,
}) => {
  const titleId = useId();
  const msgId = useId();

  return (
    <Modal open={open} onClose={onCancel} size="sm" labelledBy={titleId} describedBy={msgId}>
      <div className="p-6">
        <h3 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        <p id={msgId} className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" size="md" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            size="md"
            onClick={onConfirm}
            loading={loading}
            data-autofocus
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
