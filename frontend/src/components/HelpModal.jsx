import React from 'react';
import { X, Type, Image as ImageIcon, Search, ShieldCheck, Download, Command } from 'lucide-react';
import { usePdfStore } from '../store/usePdfStore';

export default function HelpModal() {
  const { isHelpModalOpen } = usePdfStore();

  if (!isHelpModalOpen) return null;

  const close = () => usePdfStore.setState({ isHelpModalOpen: false });

  return (
    <div className="modal-overlay-backdrop" onClick={close}>
      <div className="modal-dialog-box" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Command size={20} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Tahir's PDFedi — User & Shortcuts Guide
            </h2>
          </div>
          <button className="action-icon-btn" onClick={close}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Type size={18} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Direct In-Place Text Editing</strong>
              <p style={{ color: 'var(--text-muted)' }}>
                Click any text on the page to select it, or double-click to immediately open the in-place editor. Change fonts, sizes, colors, and alignments via the floating ribbon. Press <code>Ctrl+Enter</code> or click outside to commit.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <ImageIcon size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Image Selection, Resizing & Dragging</strong>
              <p style={{ color: 'var(--text-muted)' }}>
                Click any image to reveal the 8 resize grab handles and top rotation pin. Drag to move, drag corners to resize (locked aspect ratio by default), or click <em>Replace Image</em> to swap in any photo.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Search size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Document Search (Ctrl+F)</strong>
              <p style={{ color: 'var(--text-muted)' }}>
                Search for exact text across all pages. Matches are highlighted on the canvas with smooth Next/Previous jumping.
              </p>
            </div>
          </div>

          {/* Keyboard Shortcuts Table */}
          <div className="prop-card" style={{ marginBottom: 0 }}>
            <div className="prop-card-title">
              <Command size={14} color="var(--accent-violet)" />
              <span>Keyboard Shortcuts</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: '6px', fontSize: '0.78rem' }}>
              <span><code>Ctrl + Z</code></span> <span>Undo last edit</span>
              <span><code>Ctrl + Y</code> / <code>Shift+Z</code></span> <span>Redo edit</span>
              <span><code>Ctrl + F</code></span> <span>Open document search</span>
              <span><code>Ctrl + Enter</code></span> <span>Commit in-place text edit</span>
              <span><code>Escape</code></span> <span>Deselect element / Cancel edit</span>
              <span><code>+</code> / <code>-</code></span> <span>Zoom in / Zoom out</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <ShieldCheck size={18} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>True Vector Redaction & Non-Destructive Export</strong>
              <p style={{ color: 'var(--text-muted)' }}>
                Your original uploaded PDF is never modified or overwritten. When you export, the PyMuPDF backend cleanly redacts the original vectors and writes a compliant, certified PDF to <code>output/edited.pdf</code>.
              </p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button className="tool-btn primary" onClick={close} style={{ padding: '6px 18px' }}>
            Got it, let's edit!
          </button>
        </div>
      </div>
    </div>
  );
}
