import React, { useState, useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Check,
  X,
  Type,
} from 'lucide-react';
import { usePdfStore } from '../store/usePdfStore';

export default function TextEditorOverlay({
  activeBlock,
  zoom,
  onCommitEdit,
  onCancelEdit,
  onDeleteBlock,
}) {
  if (!activeBlock) return null;

  const [text, setText] = useState(activeBlock.text || '');
  const [fontSize, setFontSize] = useState(activeBlock.size || 12);
  const [fontFamily, setFontFamily] = useState(activeBlock.font || 'Helvetica');
  const [fontColor, setFontColor] = useState(activeBlock.color || '#000000');
  const [isBold, setIsBold] = useState(
    (activeBlock.font || '').toLowerCase().includes('bold')
  );
  const [isItalic, setIsItalic] = useState(
    (activeBlock.font || '').toLowerCase().includes('italic') ||
      (activeBlock.font || '').toLowerCase().includes('oblique')
  );
  const [alignment, setAlignment] = useState(activeBlock.alignment || 'left');

  const textareaRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    setText(activeBlock.text || '');
    setFontSize(activeBlock.size || 12);
    setFontFamily(activeBlock.font || 'Helvetica');
    setFontColor(activeBlock.color || '#000000');
    setIsBold((activeBlock.font || '').toLowerCase().includes('bold'));
    setIsItalic(
      (activeBlock.font || '').toLowerCase().includes('italic') ||
        (activeBlock.font || '').toLowerCase().includes('oblique')
    );
    setAlignment(activeBlock.alignment || 'left');

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
    }, 40);
  }, [activeBlock]);

  // Screen coordinates
  const [x0, y0, x1, y1] = activeBlock.bbox;
  const left = x0 * zoom;
  const top = y0 * zoom;
  const originalWidth = (x1 - x0) * zoom;
  const originalHeight = (y1 - y0) * zoom;

  // Ensure reasonable minimum dimensions for comfortable editing
  const width = Math.max(originalWidth + 28, 180);
  const height = Math.max(originalHeight + 14, 44);

  const handleApply = () => {
    onCommitEdit({
      id: activeBlock.id,
      original_bbox: activeBlock.bbox,
      target_bbox: [
        x0,
        y0,
        x0 + width / zoom,
        y0 + height / zoom,
      ],
      originalText: activeBlock.text,
      newText: text,
      fontSize: Number(fontSize),
      fontFamily,
      fontColor,
      isBold,
      isItalic,
      alignment,
      isDelete: false,
    });
  };

  const handleDelete = () => {
    onDeleteBlock({
      id: activeBlock.id,
      original_bbox: activeBlock.bbox,
      originalText: activeBlock.text,
      newText: '',
      isDelete: true,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onCancelEdit();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleApply();
    }
  };

  const getCssFontFamily = (f) => {
    const fl = (f || '').toLowerCase();
    if (fl.includes('times') || fl.includes('serif')) return '"Times New Roman", Times, serif';
    if (fl.includes('courier') || fl.includes('mono')) return '"JetBrains Mono", "Courier New", monospace';
    return 'Helvetica, Arial, sans-serif';
  };

  return (
    <div
      ref={containerRef}
      className="inplace-text-container"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        minHeight: `${height}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Floating Precision Formatting Ribbon */}
      <div className="floating-text-ribbon">
        {/* Font Family */}
        <select
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          title="Font Family"
        >
          <option value="Helvetica">Helvetica (Sans)</option>
          <option value="Times">Times New Roman (Serif)</option>
          <option value="Courier">Courier (Monospace)</option>
        </select>

        {/* Font Size */}
        <input
          type="number"
          min="6"
          max="96"
          step="0.5"
          value={fontSize}
          onChange={(e) => setFontSize(e.target.value)}
          style={{ width: '46px', textAlign: 'center' }}
          title="Font Size (pt)"
        />

        {/* Color Picker */}
        <input
          type="color"
          value={fontColor}
          onChange={(e) => setFontColor(e.target.value)}
          title="Font Color"
          style={{ width: '26px', height: '24px', padding: 0, cursor: 'pointer' }}
        />

        {/* Bold & Italic */}
        <button
          className={`format-icon-btn ${isBold ? 'active' : ''}`}
          onClick={() => setIsBold(!isBold)}
          title="Bold (Ctrl+B)"
        >
          <Bold size={13} />
        </button>

        <button
          className={`format-icon-btn ${isItalic ? 'active' : ''}`}
          onClick={() => setIsItalic(!isItalic)}
          title="Italic (Ctrl+I)"
        >
          <Italic size={13} />
        </button>

        {/* Alignment */}
        <button
          className={`format-icon-btn ${alignment === 'left' ? 'active' : ''}`}
          onClick={() => setAlignment('left')}
          title="Align Left"
        >
          <AlignLeft size={13} />
        </button>

        <button
          className={`format-icon-btn ${alignment === 'center' ? 'active' : ''}`}
          onClick={() => setAlignment('center')}
          title="Align Center"
        >
          <AlignCenter size={13} />
        </button>

        <button
          className={`format-icon-btn ${alignment === 'right' ? 'active' : ''}`}
          onClick={() => setAlignment('right')}
          title="Align Right"
        >
          <AlignRight size={13} />
        </button>

        <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 2px' }} />

        {/* Delete Text */}
        <button
          className="format-icon-btn"
          onClick={handleDelete}
          title="Delete Text (Permanent Redaction)"
          style={{ color: '#ef4444' }}
        >
          <Trash2 size={13} />
        </button>

        {/* Cancel */}
        <button
          className="format-icon-btn"
          onClick={onCancelEdit}
          title="Cancel (Esc)"
        >
          <X size={13} />
        </button>

        {/* Commit */}
        <button
          className="format-icon-btn"
          onClick={handleApply}
          title="Commit Changes (Ctrl+Enter)"
          style={{ background: '#10b981', color: '#ffffff' }}
        >
          <Check size={13} />
        </button>
      </div>

      {/* In-Place Textarea Input */}
      <textarea
        ref={textareaRef}
        className="inplace-textarea-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          fontFamily: getCssFontFamily(fontFamily),
          fontSize: `${fontSize * zoom}px`,
          color: fontColor,
          fontWeight: isBold ? '700' : '400',
          fontStyle: isItalic ? 'italic' : 'normal',
          textAlign: alignment,
        }}
        placeholder="Type replacement text..."
      />
    </div>
  );
}
