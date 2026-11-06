import React from 'react';
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { usePdfStore } from '../store/usePdfStore';
import { rotatePageApi, deletePageApi, duplicatePageApi } from '../utils/api';

export default function PageThumbnails() {
  const {
    pageCount,
    currentPage,
    setCurrentPage,
    pageData,
    pageOrder,
    movePage,
    rotatePageLocal,
    setDocument,
    showToast,
    isSidebarOpen,
    filename,
  } = usePdfStore();

  const toggleSidebar = () =>
    usePdfStore.setState((state) => ({ isSidebarOpen: !state.isSidebarOpen }));

  const handleRotate = async (e, pageIdx) => {
    e.stopPropagation();
    try {
      rotatePageLocal(pageIdx, 90);
      showToast(`Rotated Page ${pageIdx + 1} by 90°`, 'info');
      await rotatePageApi(pageIdx, 90);
    } catch (err) {
      showToast(`Rotation failed: ${err.message}`, 'error');
    }
  };

  const handleDuplicate = async (e, pageIdx) => {
    e.stopPropagation();
    try {
      showToast(`Duplicating Page ${pageIdx + 1}...`, 'info');
      const res = await duplicatePageApi(pageIdx);
      usePdfStore.setState({ pageCount: res.pageCount });
      showToast(`Duplicated Page ${pageIdx + 1}`, 'success');
    } catch (err) {
      showToast(`Duplicate failed: ${err.message}`, 'error');
    }
  };

  const handleDelete = (e, pageIdx) => {
    e.stopPropagation();
    if (pageCount <= 1) {
      showToast('Cannot delete the only page in the document', 'error');
      return;
    }

    usePdfStore.setState({
      confirmModal: {
        title: `Delete Page ${pageIdx + 1}?`,
        message: 'This will remove this page from the document. This action cannot be undone once exported.',
        confirmText: 'Delete Page',
        danger: true,
        onConfirm: async () => {
          try {
            const res = await deletePageApi(pageIdx);
            usePdfStore.setState({
              pageCount: res.pageCount,
              currentPage: res.activePage,
              pageData: res.updatedPage,
            });
            showToast(`Deleted Page ${pageIdx + 1}`, 'info');
          } catch (err) {
            showToast(`Delete failed: ${err.message}`, 'error');
          }
        },
      },
    });
  };

  const handleMoveUp = (e, orderIdx) => {
    e.stopPropagation();
    if (orderIdx > 0) {
      movePage(orderIdx, orderIdx - 1);
      showToast('Moved page up', 'info');
    }
  };

  const handleMoveDown = (e, orderIdx) => {
    e.stopPropagation();
    if (orderIdx < pageOrder.length - 1) {
      movePage(orderIdx, orderIdx + 1);
      showToast('Moved page down', 'info');
    }
  };

  return (
    <aside className={`thumbnails-drawer ${!isSidebarOpen ? 'collapsed' : ''}`}>
      <div className="drawer-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} color="var(--accent-primary)" />
          <span>Pages ({pageCount})</span>
        </div>
        <button
          className="action-icon-btn"
          onClick={toggleSidebar}
          title="Collapse Sidebar"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="drawer-scroll-list">
        {pageOrder.map((pageIdx, orderIdx) => {
          const isSelected = currentPage === pageIdx;
          return (
            <div
              key={`${pageIdx}_${orderIdx}`}
              className={`page-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setCurrentPage(pageIdx)}
            >
              <div className="page-card-preview">
                {isSelected && pageData?.pageImage ? (
                  <img
                    src={pageData.pageImage}
                    alt={`Page ${pageIdx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    {pageIdx + 1}
                  </span>
                )}
              </div>

              <div className="page-card-actions">
                <span>Page {pageIdx + 1}</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <button
                    className="action-icon-btn"
                    disabled={orderIdx === 0}
                    onClick={(e) => handleMoveUp(e, orderIdx)}
                    title="Move Page Up"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    className="action-icon-btn"
                    disabled={orderIdx === pageOrder.length - 1}
                    onClick={(e) => handleMoveDown(e, orderIdx)}
                    title="Move Page Down"
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    className="action-icon-btn"
                    onClick={(e) => handleRotate(e, pageIdx)}
                    title="Rotate 90°"
                  >
                    <RotateCw size={12} />
                  </button>
                  <button
                    className="action-icon-btn"
                    onClick={(e) => handleDuplicate(e, pageIdx)}
                    title="Duplicate Page"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    className="action-icon-btn"
                    onClick={(e) => handleDelete(e, pageIdx)}
                    title="Delete Page"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
