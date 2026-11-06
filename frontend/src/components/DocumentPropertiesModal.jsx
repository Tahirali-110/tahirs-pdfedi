import React from 'react';
import { X, FileText, Shield, Calendar, HardDrive, Info } from 'lucide-react';
import { usePdfStore } from '../store/usePdfStore';

export default function DocumentPropertiesModal() {
  const { isPropertiesModalOpen, properties, filename } = usePdfStore();

  if (!isPropertiesModalOpen) return null;

  const close = () => usePdfStore.setState({ isPropertiesModalOpen: false });

  return (
    <div className="modal-overlay-backdrop" onClick={close}>
      <div className="modal-dialog-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Document Properties
            </h2>
          </div>
          <button className="action-icon-btn" onClick={close}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <div className="prop-card" style={{ marginBottom: 0 }}>
            <div className="prop-card-title">
              <Info size={14} color="var(--accent-primary)" />
              <span>General Overview</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Filename:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{properties?.filename || filename}</strong>
              <span style={{ color: 'var(--text-muted)' }}>Total Pages:</span>
              <span>{properties?.pageCount || 1}</span>
              <span style={{ color: 'var(--text-muted)' }}>File Size:</span>
              <span>{properties?.fileSizeFormatted || 'Unknown'}</span>
              <span style={{ color: 'var(--text-muted)' }}>PDF Version:</span>
              <span>{properties?.format || 'PDF 1.7'}</span>
              <span style={{ color: 'var(--text-muted)' }}>Security:</span>
              <span>{properties?.isEncrypted ? 'Password Protected' : 'None (Editable)'}</span>
            </div>
          </div>

          <div className="prop-card" style={{ marginBottom: 0 }}>
            <div className="prop-card-title">
              <Calendar size={14} color="var(--accent-violet)" />
              <span>Metadata & Authoring</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Title:</span>
              <span>{properties?.title || 'None'}</span>
              <span style={{ color: 'var(--text-muted)' }}>Author:</span>
              <span>{properties?.author || 'None'}</span>
              <span style={{ color: 'var(--text-muted)' }}>Subject:</span>
              <span>{properties?.subject || 'None'}</span>
              <span style={{ color: 'var(--text-muted)' }}>Producer:</span>
              <span>{properties?.producer || 'PyMuPDF Engine'}</span>
              <span style={{ color: 'var(--text-muted)' }}>Created:</span>
              <span>{properties?.creationDate || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button className="tool-btn primary" onClick={close} style={{ padding: '6px 16px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

