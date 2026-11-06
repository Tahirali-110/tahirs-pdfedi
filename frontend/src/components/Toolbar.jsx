import React, { useRef } from 'react';
import {
  Upload,
  RefreshCw,
  Undo2,
  Redo2,
  Download,
  MousePointer,
  Type,
  PlusSquare,
  Image as ImageIcon,
  Search,
  Sun,
  Moon,
  Info,
  HelpCircle,
  FileCheck,
} from 'lucide-react';

// Custom PDFedi Logo — document body + pen nib
const PDFediLogo = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Document body */}
    <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8L14 2z" fill="#6366f1" opacity="0.95"/>
    {/* Folded corner */}
    <path d="M14 2v6h6" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Pen / edit nib */}
    <path d="M9.5 17.5l1.5-1.5 3.5-3.5 1.5 1.5-3.5 3.5H9.5v-1.5z" fill="white" opacity="0.92"/>
    <path d="M14.5 13l1.5 1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);
import { usePdfStore } from '../store/usePdfStore';
import { uploadPdfFile, loadSamplePdf } from '../utils/api';

export default function Toolbar({ onExport, isExporting }) {
  const fileInputRef = useRef(null);

  const {
    filename,
    theme,
    toggleTheme,
    editMode,
    setEditMode,
    undoStack,
    redoStack,
    undo,
    redo,
    setDocument,
    showToast,
    isSearchOpen,
    usePdfStore: store,
  } = usePdfStore();

  const openSearch = () => usePdfStore.setState({ isSearchOpen: true });
  const openProps = () => usePdfStore.setState({ isPropertiesModalOpen: true });
  const openHelp = () => usePdfStore.setState({ isHelpModalOpen: true });

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast(`Uploading ${file.name}...`, 'info');
      const res = await uploadPdfFile(file);
      setDocument({
        filename: res.filename,
        pageCount: res.pageCount,
        firstPage: res.firstPage,
        properties: res.properties,
      });
      showToast(`Loaded "${res.filename}" (${res.pageCount} pages)`, 'success');
    } catch (err) {
      showToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleSampleClick = async () => {
    try {
      showToast('Loading executive sample document...', 'info');
      const res = await loadSamplePdf();
      setDocument({
        filename: res.filename,
        pageCount: res.pageCount,
        firstPage: res.firstPage,
        properties: res.properties,
      });
      showToast('Sample document loaded successfully', 'success');
    } catch (err) {
      showToast(`Failed to load sample: ${err.message}`, 'error');
    }
  };

  return (
    <nav className="top-navbar">
      {/* Brand & Open Document */}
      <div className="tool-group">
        <div className="brand-section">
          <PDFediLogo />
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Tahir's PDFedi</span>
          <span className="brand-badge">PRO</span>
        </div>

        <div className="divider-vertical" />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf"
          style={{ display: 'none' }}
        />

        <button
          className="tool-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Open a PDF from your computer"
        >
          <Upload size={15} />
          <span>Open PDF</span>
        </button>

        <button
          className="tool-btn"
          onClick={handleSampleClick}
          title="Load built-in 3-page sample corporate report"
        >
          <RefreshCw size={14} />
          <span>Sample PDF</span>
        </button>
      </div>

      {/* Editing Modes & Tools */}
      <div className="tool-group">
        <button
          className={`tool-btn ${editMode === 'select' ? 'active' : ''}`}
          onClick={() => setEditMode('select')}
          title="Select / Inspect Tool (V)"
        >
          <MousePointer size={15} />
          <span>Select</span>
        </button>

        <button
          className={`tool-btn ${editMode === 'text' ? 'active' : ''}`}
          onClick={() => setEditMode('text')}
          title="Direct In-Place Text Editing (T)"
        >
          <Type size={15} />
          <span>Edit Text</span>
        </button>

        <button
          className={`tool-btn ${editMode === 'addText' ? 'active' : ''}`}
          onClick={() => setEditMode('addText')}
          title="Insert New Text Anywhere on the Page"
        >
          <PlusSquare size={15} />
          <span>Add Text</span>
        </button>

        <button
          className={`tool-btn ${editMode === 'image' ? 'active' : ''}`}
          onClick={() => setEditMode('image')}
          title="Direct Image Drag, Resize & Replace (I)"
        >
          <ImageIcon size={15} />
          <span>Edit Images</span>
        </button>

        <div className="divider-vertical" />

        <button
          className="tool-btn"
          onClick={openSearch}
          title="Search in Document (Ctrl+F)"
        >
          <Search size={15} />
          <span>Find</span>
        </button>

        <button
          className="tool-btn"
          disabled={undoStack.length === 0}
          onClick={undo}
          title="Undo last edit (Ctrl+Z)"
        >
          <Undo2 size={15} />
          {undoStack.length > 0 && (
            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>({undoStack.length})</span>
          )}
        </button>

        <button
          className="tool-btn"
          disabled={redoStack.length === 0}
          onClick={redo}
          title="Redo edit (Ctrl+Y)"
        >
          <Redo2 size={15} />
          {redoStack.length > 0 && (
            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>({redoStack.length})</span>
          )}
        </button>
      </div>

      {/* Actions & Settings */}
      <div className="tool-group">
        <button
          className="tool-btn"
          onClick={openProps}
          title="Document Metadata & Properties"
        >
          <Info size={16} />
        </button>

        <button
          className="tool-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Slate Light Mode' : 'Switch to Obsidian Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          className="tool-btn"
          onClick={openHelp}
          title="Help & Keyboard Shortcuts (?)"
        >
          <HelpCircle size={16} />
        </button>

        <div className="divider-vertical" />

        <button
          className="tool-btn primary"
          onClick={onExport}
          disabled={isExporting}
          title="Export and Download Clean Modified PDF"
        >
          <Download size={15} />
          <span>{isExporting ? 'Exporting...' : 'Export PDF'}</span>
        </button>
      </div>
    </nav>
  );
}
