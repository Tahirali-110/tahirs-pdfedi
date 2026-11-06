import React from 'react';
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw,
} from 'lucide-react';
import { usePdfStore } from '../store/usePdfStore';
import { rotatePageApi } from '../utils/api';

export default function BottomDock() {
  const {
    pageCount,
    currentPage,
    setCurrentPage,
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    pageData,
    rotatePageLocal,
    showToast,
  } = usePdfStore();

  const handleRotate = async () => {
    try {
      rotatePageLocal(currentPage, 90);
      showToast(`Rotated Page ${currentPage + 1} by 90°`, 'info');
      await rotatePageApi(currentPage, 90);
    } catch (err) {
      showToast(`Rotation failed: ${err.message}`, 'error');
    }
  };

  const handleFitWidth = () => {
    if (!pageData) return;
    const viewportWidth = window.innerWidth - 560; // account for drawers
    const targetZoom = Math.max(0.5, Math.min(2.5, viewportWidth / pageData.width));
    setZoom(targetZoom);
  };

  const handleFitPage = () => {
    if (!pageData) return;
    const viewportHeight = window.innerHeight - 180;
    const targetZoom = Math.max(0.5, Math.min(2.0, viewportHeight / pageData.height));
    setZoom(targetZoom);
  };

  return (
    <div className="bottom-dock-container">
      {/* Page Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          className="action-icon-btn"
          disabled={currentPage === 0}
          onClick={() => setCurrentPage(0)}
          title="First Page"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          className="action-icon-btn"
          disabled={currentPage === 0}
          onClick={() => setCurrentPage(currentPage - 1)}
          title="Previous Page"
        >
          <ChevronLeft size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '0 4px' }}>
          <select
            value={currentPage}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {Array.from({ length: pageCount || 1 }, (_, i) => (
              <option key={i} value={i}>
                {i + 1}
              </option>
            ))}
          </select>
          <span style={{ color: 'var(--text-muted)' }}>/ {pageCount || 1}</span>
        </div>

        <button
          className="action-icon-btn"
          disabled={currentPage >= pageCount - 1}
          onClick={() => setCurrentPage(currentPage + 1)}
          title="Next Page"
        >
          <ChevronRight size={16} />
        </button>
        <button
          className="action-icon-btn"
          disabled={currentPage >= pageCount - 1}
          onClick={() => setCurrentPage(pageCount - 1)}
          title="Last Page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>

      <div className="divider-vertical" />

      {/* Zoom Stepper & Slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button className="action-icon-btn" onClick={zoomOut} title="Zoom Out">
          <ZoomOut size={15} />
        </button>

        <input
          type="range"
          min="0.5"
          max="3.0"
          step="0.05"
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          style={{ width: '80px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
          title={`Zoom: ${Math.round(zoom * 100)}%`}
        />

        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            minWidth: '42px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          {Math.round(zoom * 100)}%
        </span>

        <button className="action-icon-btn" onClick={zoomIn} title="Zoom In">
          <ZoomIn size={15} />
        </button>
      </div>

      <div className="divider-vertical" />

      {/* Fit Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          className="action-icon-btn"
          onClick={handleFitWidth}
          title="Fit Page Width"
        >
          <Maximize2 size={15} />
        </button>
        <button
          className="action-icon-btn"
          onClick={handleFitPage}
          title="Fit Page to Screen"
        >
          <Minimize2 size={15} />
        </button>
        <button
          className="action-icon-btn"
          onClick={handleRotate}
          title="Rotate Page (+90°)"
        >
          <RotateCw size={15} />
        </button>
      </div>
    </div>
  );
}

