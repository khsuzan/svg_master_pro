import { useCallback } from 'react'

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant,
  onConfirm,
  onCancel,
}) {
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) onCancel?.()
  }, [onCancel])

  if (!visible) return null

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="confirm-modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onCancel}>&times;</button>
        </div>
        <div className="modal-body">
          <p className="confirm-message">{message}</p>
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={onCancel}>{cancelLabel}</button>
          <button
            className={`modal-btn ${variant === 'danger' ? 'modal-btn-danger' : 'modal-btn-save'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
