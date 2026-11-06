import React, { useEffect, useState, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import PageThumbnails from './components/PageThumbnails';
import PageCanvas from './components/PageCanvas';
import PropertiesPanel from './components/PropertiesPanel';
import BottomDock from './components/BottomDock';
import SearchBar from './components/SearchBar';
import DocumentPropertiesModal from './components/DocumentPropertiesModal';
import ConfirmModal from './components/ConfirmModal';
import HelpModal from './components/HelpModal';
import { usePdfStore } from './store/usePdfStore';
import {
  fetchPageData,
  loadSamplePdf,
  exportModifiedPdf,
  getDownloadUrl,
} from './utils/api';

export default function App() {
  const {
    theme,
    currentPage,
    zoom,
    setDocument,
    pageCount,
    setPageData,
    setLoadingPage,
    stagedEdits,
    pageOrder,
    pageRotations,
    undo,
    redo,
    showToast,
    toast,
    filename,
    pageData,
    pageCache,
  } = usePdfStore();

  const [isExporting, setIsExporting] = useState(false);

  // Apply Theme Attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Initial Load: Pre-load sample document
  useEffect(() => {
    async function init() {
      try {
        setLoadingPage(true);
        const res = await loadSamplePdf();
        setDocument({
          filename: res.filename,
          pageCount: res.pageCount,
          firstPage: res.firstPage,
          properties: res.properties,
        });
      } catch (err) {
        console.error('Failed to load sample:', err);
      } finally {
        setLoadingPage(false);
      }
    }
    init();
  }, []);

  // Fetch Page Data with Caching
  const loadPage = useCallback(
    async (pageNum, zoomLevel) => {
      const cacheKey = `p_${pageNum}_z_${Math.round(zoomLevel * 100)}`;
      if (pageCache[cacheKey]) {
        setPageData(pageCache[cacheKey]);
        return;
      }

      try {
        setLoadingPage(true);
        const data = await fetchPageData(pageNum, zoomLevel);
        setPageData(data);
      } catch (err) {
        showToast(`Error loading page ${pageNum + 1}: ${err.message}`, 'error');
      } finally {
        setLoadingPage(false);
      }
    },
    [pageCache]
  );

  useEffect(() => {
    if (pageCount > 0) {
      loadPage(currentPage, zoom);
    }
  }, [currentPage, zoom]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Z (Undo)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      // Ctrl+Y (Redo)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      // Ctrl+F (Find)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        usePdfStore.setState({ isSearchOpen: true });
      }
      // Escape (Deselect / Cancel)
      else if (e.key === 'Escape') {
        usePdfStore.setState({
          activeTextBlock: null,
          selectedImageId: null,
          isSearchOpen: false,
        });
      }
      // ? (Help)
      else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        usePdfStore.setState({ isHelpModalOpen: true });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Auto-save staged modifications to localStorage
  useEffect(() => {
    if (Object.keys(stagedEdits).length > 0) {
      try {
        localStorage.setItem(`pdf_staged_${filename}`, JSON.stringify(stagedEdits));
      } catch (e) {}
    }
  }, [stagedEdits, filename]);

  // Export Modified PDF
  const handleExport = async () => {
    try {
      setIsExporting(true);
      showToast('Compiling vector redactions and exporting PDF...', 'info');

      const res = await exportModifiedPdf(stagedEdits, pageOrder, pageRotations);
      showToast('PDF exported and verified! Downloading...', 'success');

      // Trigger instant automatic browser download
      const link = document.createElement('a');
      link.href = getDownloadUrl();
      link.download = 'edited.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      showToast(`Export failed: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="app-container">
      {/* 1. Main Acrobat Toolbar */}
      <Toolbar onExport={handleExport} isExporting={isExporting} />

      {/* 2. Secondary Context / File Information Sub-bar */}
      <div className="context-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{filename}</strong>
          <span>•</span>
          <span>
            {pageData ? `${Math.round(pageData.width)} × ${Math.round(pageData.height)} pt` : 'Loading...'}
          </span>
          <span>•</span>
          <span style={{ color: '#10b981', fontWeight: 600 }}>Safe Non-Destructive Mode</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>💡 <em>Click to select text or image • Double-click to edit text in place</em></span>
        </div>
      </div>

      {/* 3. Central Three-Column Workspace */}
      <div className="workspace-viewport">
        {/* Left Drawer: Page Thumbnails */}
        <PageThumbnails />

        {/* Center: Scrollable PDF Canvas */}
        <main className="canvas-scroller-view">
          <PageCanvas />
          {/* Floating Search Bar */}
          <SearchBar />
          {/* Floating Bottom Navigation & Zoom Dock */}
          <BottomDock />
        </main>

        {/* Right Drawer: Properties & Staged Edits Inspector */}
        <PropertiesPanel />
      </div>

      {/* 4. Modals */}
      <DocumentPropertiesModal />
      <ConfirmModal />
      <HelpModal />

      {/* 5. Floating Toast Alerts */}
      {toast && (
        <div className="toast-pill-message">
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor:
                toast.type === 'success'
                  ? '#10b981'
                  : toast.type === 'error'
                  ? '#ef4444'
                  : 'var(--accent-primary)',
            }}
          />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
