import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface SnipOverlayProps {
  onCapture: (result: { type: 'ocr' | 'vision'; data: string }) => void;
  onCancel: () => void;
}

export function SnipOverlay({ onCapture, onCancel }: SnipOverlayProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setStartX(e.clientX);
    setStartY(e.clientY);
    setCurrentX(e.clientX);
    setCurrentY(e.clientY);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    setCurrentX(e.clientX);
    setCurrentY(e.clientY);
  };

  const handleMouseUp = async () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    if (width < 5 || height < 5) {
      onCancel();
      return;
    }

    try {
      // Direct OCR as requested
      const text = await invoke<string>('ocr_region', { x: Math.floor(x), y: Math.floor(y), width: Math.floor(width), height: Math.floor(height) });
      
      if (text) {
        try {
          await navigator.clipboard.writeText(text);
        } catch (clipErr) {
          console.error("Clipboard copy failed:", clipErr);
        }
        onCapture({ type: 'ocr', data: text });
      } else {
        onCancel();
      }
    } catch (err) {
      console.error("Capture or OCR failed:", err);
      onCancel();
    }
  };

  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  const drawWidth = Math.abs(currentX - startX);
  const drawHeight = Math.abs(currentY - startY);

  return (
    <div
      className="snip-overlay"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.5)', cursor: 'crosshair',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {isDrawing && (
        <div
          style={{
            position: 'absolute',
            left, top, width: drawWidth, height: drawHeight,
            border: '2px solid #3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)'
          }}
        />
      )}
      <div style={{
        position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
        color: '#fff', fontSize: '14px', fontWeight: '500',
        padding: '8px 20px', backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: '99px', border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'none'
      }}>
        Drag to snip text &bull; ESC to cancel
      </div>
    </div>
  );
}