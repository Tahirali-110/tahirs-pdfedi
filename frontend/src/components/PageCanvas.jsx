import React, { useRef } from 'react';
import TextEditorOverlay from './TextEditorOverlay';
import ImageTransformerLayer from './ImageTransformerLayer';
import { usePdfStore } from '../store/usePdfStore';

export default function PageCanvas() {
  const {
    pageData,
    zoom,
    editMode,
    activeTextBlock,
    setActiveTextBlock,
    commitTextEdit,
    addNewText,
    selectedImageId,
    setSelectedImageId,
    commitImageEdit,
    stagedEdits,
    currentPage,
    searchMatches,
    currentMatchIndex,
    showToast,
  } = usePdfStore();

  const canvasRef = useRef(null);

  if (!pageData) return null;

  const { width, height, pageImage, textBlocks = [], images = [] } = pageData;
  const scaledWidth = width * zoom;
  const scaledHeight = height * zoom;

  // Staged modifications on this page
  const currentStaged = stagedEdits[currentPage] || {
    textEdits: [],
    imageEdits: [],
    newTexts: [],
    newImages: [],
  };

  // Merge images with staged transforms
  const pageImages = images.map((img) => {
    const staged = currentStaged.imageEdits.find((ie) => ie.id === img.id);
    if (staged) {
      return {
        ...img,
        currentBbox: staged.new_bbox,
        replacementDataUrl: staged.replacementDataUrl,
        rotation: staged.rotation || 0,
        isDeleted: staged.isDelete,
        isMoved: true,
      };
    }
    return img;
  });

  const handleCanvasClick = (e) => {
    // If in Add Text mode, insert text at click point
    if (editMode === 'addText' && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / zoom;
      const clickY = (e.clientY - rect.top) / zoom;

      const newId = `new_text_${Date.now()}`;
      const newBlock = {
        id: newId,
        bbox: [clickX, clickY, clickX + 160, clickY + 28],
        text: 'New Text',
        size: 12,
        font: 'Helvetica',
        color: '#000000',
        alignment: 'left',
      };

      setActiveTextBlock(newBlock);
      showToast('Positioned new text box. Type replacement text.', 'info');
      return;
    }

    // Direct background click: deselect
    if (e.target === canvasRef.current || e.target.classList.contains('pdf-rendered-page-img')) {
      if (activeTextBlock) setActiveTextBlock(null);
      if (selectedImageId) setSelectedImageId(null);
    }
  };

  const handleCommitText = (editPayload) => {
    commitTextEdit(currentPage, editPayload);
    showToast('Applied text changes to PDF', 'success');
  };

  const handleDeleteText = (deletePayload) => {
    commitTextEdit(currentPage, deletePayload);
    showToast('Redacted text block from PDF', 'info');
  };

  const handleUpdateImage = (imgId, updates) => {
    const targetImg = pageImages.find((im) => im.id === imgId);
    if (!targetImg) return;

    commitImageEdit(currentPage, {
      id: targetImg.id,
      xref: targetImg.xref,
      original_bbox: targetImg.bbox,
      new_bbox: updates.currentBbox || targetImg.currentBbox || targetImg.bbox,
      originalDataUrl: targetImg.dataUrl,
      replacementDataUrl: updates.replacementDataUrl || targetImg.replacementDataUrl,
      rotation: updates.rotation !== undefined ? updates.rotation : targetImg.rotation || 0,
      keepAspect: updates.lockAspect !== undefined ? updates.lockAspect : targetImg.lockAspect ?? true,
      isDelete: false,
    });
  };

  const handleDeleteImage = (imgId) => {
    const targetImg = pageImages.find((im) => im.id === imgId);
    if (!targetImg) return;

    commitImageEdit(currentPage, {
      id: targetImg.id,
      xref: targetImg.xref,
      original_bbox: targetImg.bbox,
      isDelete: true,
    });
    setSelectedImageId(null);
    showToast('Marked image for deletion', 'info');
  };

  // Search matches on current page
  const currentPageMatches = searchMatches.filter((m) => m.page === currentPage);

  return (
    <div
      ref={canvasRef}
      className="pdf-paper-document"
      style={{
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`,
        cursor: editMode === 'addText' ? 'crosshair' : 'default',
      }}
      onClick={handleCanvasClick}
    >
      {/* 1. Base Rendered PDF Page Background */}
      <img
        src={pageData.pageImage}
        alt={`PDF Page ${currentPage + 1}`}
        className="pdf-rendered-page-img"
      />

      {/* 2. Search Highlights */}
      {currentPageMatches.map((m, idx) => {
        const [mx0, my0, mx1, my1] = m.bbox;
        const isCurrentMatch = searchMatches[currentMatchIndex] === m;
        return (
          <div
            key={idx}
            className={`search-highlight-marker ${isCurrentMatch ? 'active' : ''}`}
            style={{
              left: `${mx0 * zoom}px`,
              top: `${my0 * zoom}px`,
              width: `${(mx1 - mx0) * zoom}px`,
              height: `${(my1 - my0) * zoom}px`,
            }}
          />
        );
      })}

      {/* 3. Staged Text Edits Preview */}
      {currentStaged.textEdits.map((edit) => {
        const [x0, y0, x1, y1] = edit.original_bbox;
        const left = x0 * zoom;
        const top = y0 * zoom;
        const w = (x1 - x0) * zoom;
        const h = (y1 - y0) * zoom;

        return (
          <div
            key={edit.id}
            style={{
              position: 'absolute',
              left: `${left}px`,
              top: `${top}px`,
              minWidth: `${w}px`,
              minHeight: `${h}px`,
              backgroundColor: '#ffffff',
              zIndex: 10,
              pointerEvents: 'auto',
              cursor: 'pointer',
              padding: '2px 4px',
              fontFamily: edit.fontFamily || 'Helvetica, Arial, sans-serif',
              fontSize: `${(edit.fontSize || 12) * zoom}px`,
              color: edit.fontColor || '#000000',
              fontWeight: edit.isBold ? '700' : '400',
              fontStyle: edit.isItalic ? 'italic' : 'normal',
              textAlign: edit.alignment || 'left',
              whiteSpace: 'pre-wrap',
              border: '1px dashed var(--accent-primary)',
              borderRadius: '2px',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTextBlock({
                id: edit.id,
                bbox: edit.original_bbox,
                text: edit.newText,
                size: edit.fontSize,
                font: edit.fontFamily,
                color: edit.fontColor,
                alignment: edit.alignment,
              });
            }}
            title="Click to edit staged text"
          >
            {edit.isDelete ? (
              <span style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '11px' }}>
                [Deleted / Redacted]
              </span>
            ) : (
              edit.newText
            )}
          </div>
        );
      })}

      {/* 4. Interactive Text Layer */}
      <div className="text-overlay-plane">
        {textBlocks.map((block) => {
          const isStaged = currentStaged.textEdits.some((e) => e.id === block.id);
          const isBeingEdited = activeTextBlock?.id === block.id;
          if (isStaged || isBeingEdited) return null;

          const [x0, y0, x1, y1] = block.bbox;
          const left = x0 * zoom;
          const top = y0 * zoom;
          const w = (x1 - x0) * zoom;
          const h = (y1 - y0) * zoom;

          return (
            <div
              key={block.id}
              className="text-hover-box"
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${w}px`,
                height: `${h}px`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                // Single click selects, if already selected or in text mode enters edit mode
                if (editMode === 'text') {
                  setActiveTextBlock(block);
                } else {
                  usePdfStore.setState({ activeTextBlock: block });
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setActiveTextBlock(block);
              }}
              title="Click to select, double-click to edit in-place"
            />
          );
        })}
      </div>

      {/* 5. In-Place Active Text Editor */}
      {activeTextBlock && (
        <TextEditorOverlay
          activeBlock={activeTextBlock}
          zoom={zoom}
          onCommitEdit={handleCommitText}
          onCancelEdit={() => setActiveTextBlock(null)}
          onDeleteBlock={handleDeleteText}
        />
      )}

      {/* 6. Image Transformer Layer */}
      <ImageTransformerLayer
        images={pageImages}
        selectedImageId={selectedImageId}
        onSelectImage={setSelectedImageId}
        onUpdateImage={handleUpdateImage}
        onDeleteImage={handleDeleteImage}
        zoom={zoom}
      />
    </div>
  );
}
