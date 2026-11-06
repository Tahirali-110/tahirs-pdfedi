import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Trash2, Lock, Unlock, RotateCw } from 'lucide-react';
import { usePdfStore } from '../store/usePdfStore';

export default function ImageTransformerLayer({
  images,
  selectedImageId,
  onSelectImage,
  onUpdateImage,
  onDeleteImage,
  zoom,
}) {
  const [activeTransform, setActiveTransform] = useState(null);
  const fileInputRef = useRef(null);

  // Mouse Down for Drag / Resize / Rotate
  const handleMouseDown = (e, img, handleType = 'move') => {
    e.stopPropagation();
    e.preventDefault();
    onSelectImage(img.id);

    const [x0, y0, x1, y1] = img.currentBbox || img.bbox;
    const centerX = (x0 + x1) / 2;
    const centerY = (y0 + y1) / 2;

    setActiveTransform({
      imgId: img.id,
      handleType,
      startX: e.clientX,
      startY: e.clientY,
      initX0: x0,
      initY0: y0,
      initX1: x1,
      initY1: y1,
      centerX,
      centerY,
      initRotation: img.rotation || 0,
      lockAspect: img.lockAspect ?? true,
    });
  };

  useEffect(() => {
    if (!activeTransform) return;

    const handleMouseMove = (e) => {
      const { initX0, initY0, initX1, initY1, handleType, lockAspect, centerX, centerY, initRotation } = activeTransform;

      if (handleType === 'rotate') {
        const mouseX = (e.clientX - activeTransform.startX) / zoom + centerX;
        const mouseY = (e.clientY - activeTransform.startY) / zoom + centerY;
        const rad = Math.atan2(mouseY - centerY, mouseX - centerX);
        let deg = Math.round((rad * 180) / Math.PI) + 90;
        deg = (deg + 360) % 360;
        onUpdateImage(activeTransform.imgId, { rotation: deg });
        return;
      }

      const dx = (e.clientX - activeTransform.startX) / zoom;
      const dy = (e.clientY - activeTransform.startY) / zoom;

      let newX0 = initX0;
      let newY0 = initY0;
      let newX1 = initX1;
      let newY1 = initY1;

      const initW = initX1 - initX0;
      const initH = initY1 - initY0;
      const aspect = initH / initW;

      if (handleType === 'move') {
        newX0 = initX0 + dx;
        newY0 = initY0 + dy;
        newX1 = initX1 + dx;
        newY1 = initY1 + dy;
      } else if (handleType === 'se') {
        newX1 = Math.max(initX0 + 20, initX1 + dx);
        newY1 = lockAspect ? initY0 + (newX1 - initX0) * aspect : Math.max(initY0 + 20, initY1 + dy);
      } else if (handleType === 'e') {
        newX1 = Math.max(initX0 + 20, initX1 + dx);
      } else if (handleType === 's') {
        newY1 = Math.max(initY0 + 20, initY1 + dy);
      } else if (handleType === 'nw') {
        newX0 = Math.min(initX1 - 20, initX0 + dx);
        newY0 = lockAspect ? initY1 - (initX1 - newX0) * aspect : Math.min(initY1 - 20, initY0 + dy);
      } else if (handleType === 'ne') {
        newX1 = Math.max(initX0 + 20, initX1 + dx);
        newY0 = lockAspect ? initY1 - (newX1 - initX0) * aspect : Math.min(initY1 - 20, initY0 + dy);
      } else if (handleType === 'sw') {
        newX0 = Math.min(initX1 - 20, initX0 + dx);
        newY1 = lockAspect ? initY0 + (initX1 - newX0) * aspect : Math.max(initY0 + 20, initY1 + dy);
      } else if (handleType === 'n') {
        newY0 = Math.min(initY1 - 20, initY0 + dy);
      } else if (handleType === 'w') {
        newX0 = Math.min(initX1 - 20, initX0 + dx);
      }

      onUpdateImage(activeTransform.imgId, {
        currentBbox: [newX0, newY0, newX1, newY1],
      });
    };

    const handleMouseUp = () => {
      setActiveTransform(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeTransform, zoom, onUpdateImage]);

  // Handle Replacement Image Upload
  const handleReplacementUpload = (e, img) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      onUpdateImage(img.id, {
        replacementDataUrl: dataUrl,
        isReplaced: true,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="image-overlay-plane">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
      />

      {images.map((img) => {
        if (img.isDeleted) return null;

        const isSelected = selectedImageId === img.id;
        const [x0, y0, x1, y1] = img.currentBbox || img.bbox;
        const left = x0 * zoom;
        const top = y0 * zoom;
        const width = (x1 - x0) * zoom;
        const height = (y1 - y0) * zoom;
        const rotation = img.rotation || 0;

        return (
          <div
            key={img.id}
            className={`image-item-box ${isSelected ? 'selected' : ''}`}
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
            onMouseDown={(e) => handleMouseDown(e, img, 'move')}
          >
            {/* If moved or replaced, render preview element */}
            {(img.replacementDataUrl || img.isMoved) && (
              <img
                src={img.replacementDataUrl || img.dataUrl}
                alt="Transformed PDF element"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: img.lockAspect ? 'contain' : 'fill',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Transform Handles when selected */}
            {isSelected && (
              <>
                {/* 8 Resize Handles */}
                <div className="transformer-handle handle-nw" onMouseDown={(e) => handleMouseDown(e, img, 'nw')} />
                <div className="transformer-handle handle-n"  onMouseDown={(e) => handleMouseDown(e, img, 'n')} />
                <div className="transformer-handle handle-ne" onMouseDown={(e) => handleMouseDown(e, img, 'ne')} />
                <div className="transformer-handle handle-e"  onMouseDown={(e) => handleMouseDown(e, img, 'e')} />
                <div className="transformer-handle handle-se" onMouseDown={(e) => handleMouseDown(e, img, 'se')} />
                <div className="transformer-handle handle-s"  onMouseDown={(e) => handleMouseDown(e, img, 's')} />
                <div className="transformer-handle handle-sw" onMouseDown={(e) => handleMouseDown(e, img, 'sw')} />
                <div className="transformer-handle handle-w"  onMouseDown={(e) => handleMouseDown(e, img, 'w')} />

                {/* Top Rotation Pin */}
                <div className="rotation-handle-line" />
                <div
                  className="rotation-handle-pin"
                  onMouseDown={(e) => handleMouseDown(e, img, 'rotate')}
                  title="Drag to Rotate"
                />

                {/* Floating Image Control Pill */}
                <div className="image-floating-pill" onMouseDown={(e) => e.stopPropagation()}>
                  <button
                    className="tool-btn"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.onchange = (e) => handleReplacementUpload(e, img);
                        fileInputRef.current.click();
                      }
                    }}
                    title="Replace with an image from your computer"
                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                  >
                    <RefreshCw size={12} />
                    <span>Replace Image</span>
                  </button>

                  <button
                    className="action-icon-btn"
                    onClick={() =>
                      onUpdateImage(img.id, {
                        lockAspect: !(img.lockAspect ?? true),
                      })
                    }
                    title={img.lockAspect ? 'Unlock Aspect Ratio' : 'Lock Aspect Ratio'}
                  >
                    {img.lockAspect ? <Lock size={13} /> : <Unlock size={13} />}
                  </button>

                  <button
                    className="action-icon-btn"
                    onClick={() =>
                      onUpdateImage(img.id, {
                        rotation: ((img.rotation || 0) + 90) % 360,
                      })
                    }
                    title="Rotate 90° Clockwise"
                  >
                    <RotateCw size={13} />
                  </button>

                  <button
                    className="action-icon-btn"
                    onClick={() => onDeleteImage(img.id)}
                    title="Delete Image from Page"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
