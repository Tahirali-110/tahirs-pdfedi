import React from 'react';
import {
  Type,
  Image as ImageIcon,
  Layers,
  Trash2,
  Info,
  ChevronRight,
  ChevronLeft,
  RotateCw,
  Lock,
  Unlock,
  Sliders,
} from 'lucide-react';
import { usePdfStore } from '../store/usePdfStore';

export default function PropertiesPanel() {
  const {
    isPropertiesOpen,
    activeTextBlock,
    setActiveTextBlock,
    selectedImageId,
    pageData,
    stagedEdits,
    currentPage,
    revertEdit,
    showToast,
  } = usePdfStore();

  const toggleProperties = () =>
    usePdfStore.setState((state) => ({ isPropertiesOpen: !state.isPropertiesOpen }));

  const currentStaged = stagedEdits[currentPage] || {
    textEdits: [],
    imageEdits: [],
    newTexts: [],
    newImages: [],
  };

  const totalEditsCount = Object.values(stagedEdits).reduce(
    (acc, page) =>
      acc +
      (page.textEdits?.length || 0) +
      (page.imageEdits?.length || 0) +
      (page.newTexts?.length || 0) +
      (page.newImages?.length || 0),
    0
  );

  const selectedImage = (pageData?.images || []).find((im) => im.id === selectedImageId);

  return (
    <aside className={`properties-drawer ${!isPropertiesOpen ? 'collapsed' : ''}`}>
      <div className="drawer-header-bar">
        <button className="action-icon-btn" onClick={toggleProperties} title="Collapse Inspector">
          <ChevronRight size={16} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sliders size={14} color="var(--accent-primary)" />
          <span>Properties</span>
        </div>
      </div>

      <div className="properties-body">
        {/* Selected Text Element Inspector */}
        {activeTextBlock ? (
          <div className="prop-card">
            <div className="prop-card-title">
              <Type size={15} color="var(--accent-primary)" />
              <span>Text Element</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Content:</strong>
                <div
                  style={{
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    marginTop: '4px',
                    color: 'var(--text-primary)',
                    maxHeight: '70px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {activeTextBlock.text}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Font Size:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{activeTextBlock.size || 12} pt</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Family:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{activeTextBlock.font || 'Helvetica'}</div>
                </div>
              </div>

              <div style={{ marginTop: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Position (X, Y, W, H):</span>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                  ({Math.round(activeTextBlock.bbox[0])}, {Math.round(activeTextBlock.bbox[1])}) —{' '}
                  {Math.round(activeTextBlock.bbox[2] - activeTextBlock.bbox[0])} ×{' '}
                  {Math.round(activeTextBlock.bbox[3] - activeTextBlock.bbox[1])} pt
                </div>
              </div>
            </div>
          </div>
        ) : selectedImage ? (
          /* Selected Image Element Inspector */
          <div className="prop-card">
            <div className="prop-card-title">
              <ImageIcon size={15} color="var(--accent-violet)" />
              <span>Image Element</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Resolution:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedImage.width} × {selectedImage.height} px
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Format:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                    {selectedImage.ext || 'PNG'}
                  </div>
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>PDF XRef:</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedImage.xref}</div>
              </div>

              <div style={{ marginTop: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Dimensions (W × H):</span>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {Math.round((selectedImage.currentBbox || selectedImage.bbox)[2] - (selectedImage.currentBbox || selectedImage.bbox)[0])} ×{' '}
                  {Math.round((selectedImage.currentBbox || selectedImage.bbox)[3] - (selectedImage.currentBbox || selectedImage.bbox)[1])} pt
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="prop-card" style={{ textAlign: 'center', padding: '16px 8px' }}>
            <Info size={18} color="var(--text-muted)" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Click any text or image on the canvas to inspect and modify properties.
            </div>
          </div>
        )}

        {/* Staged Modifications Section */}
        <div className="prop-card">
          <div className="prop-card-title" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} color="var(--accent-primary)" />
              <span>Staged Changes ({totalEditsCount})</span>
            </div>
          </div>

          {totalEditsCount === 0 ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No edits staged. Original PDF is completely clean and untouched.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentStaged.textEdits.map((te) => (
                <div
                  key={te.id}
                  style={{
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '5px',
                    padding: '8px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '190px' }}>
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>[Text]</span>{' '}
                    {te.isDelete ? 'Deleted' : `"${te.newText.slice(0, 24)}"`}
                  </div>
                  <button
                    className="action-icon-btn"
                    onClick={() => revertEdit(currentPage, 'text', te.id)}
                    title="Revert edit"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              {currentStaged.imageEdits.map((ie) => (
                <div
                  key={ie.id}
                  style={{
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '5px',
                    padding: '8px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>[Image]</span>{' '}
                    {ie.isDelete ? 'Deleted' : ie.replacementDataUrl ? 'Replaced' : 'Transformed'}
                  </div>
                  <button
                    className="action-icon-btn"
                    onClick={() => revertEdit(currentPage, 'image', ie.id)}
                    title="Revert edit"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
