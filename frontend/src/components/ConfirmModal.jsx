import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { usePdfStore } from '../store/usePdfStore';

export default function ConfirmModal() {
  const { confirmModal } = usePdfStore();

  if (!confirmModal) return null;

  const { title, message, onConfirm, confirmText = 'Delete', danger = true } = confirmModal;

  const close = () => usePdfStore.setState({ confirmModal: null });

  const handleConfirm = () => {
    onConfirm?.();
    close();
  };

  return (
    <div className="modal-overlay-backdrop" onClick={close}>
      <div className="modal-dialog-box" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div
            style={{
              background: danger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
              padding: '8px',
              borderRadius: '8px',
              color: danger ? '#ef4444' : 'var(--accent-primary)',
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {title}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              {message}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
          <button className="tool-btn" onClick={close}>
            Cancel
          </button>
          <button
            className="tool-btn"
            onClick={handleConfirm}
            style={{
              background: danger ? '#ef4444' : 'var(--accent-primary)',
              color: '#ffffff',
              fontWeight: 600,
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

