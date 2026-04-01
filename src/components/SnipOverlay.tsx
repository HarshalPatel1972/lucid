import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface CaptureResultModalProps {
  imageData: string;
  onChoice: (type: 'ocr' | 'vision') => void;
  onCancel: () => void;
}

export function CaptureResultModal({ imageData, onChoice, onCancel }: CaptureResultModalProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.8)'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
        maxWidth: '400px', width: '100%'
      }}>
        <img
          src={`data:image/png;base64,${imageData}`}
          alt="Captured area"
          style={{
            maxWidth: '100%', maxHeight: '200px', objectFit: 'contain',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)'
          }}
        />
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button onClick={() => onChoice('ocr')} style={{ flex: 1, padding: 'var(--space-2)', cursor: 'pointer', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            Send as Text (OCR)
          </button>
          <button onClick={() => onChoice('vision')} style={{ flex: 1, padding: 'var(--space-2)', cursor: 'pointer', backgroundColor: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)' }}>
            Send as Image (Vision)
          </button>
        </div>
        <button onClick={onCancel} style={{ padding: 'var(--space-2)', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent', borderRadius: 'var(--radius-md)' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

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
  const [captureData, setCaptureData] = useState<string | null>(null);

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

    if (width < 10 || height < 10) {
      onCancel();
      return;
    }

    try {
      const b64 = await invoke<string>('capture_region', { x, y, width, height });
      setCaptureData(b64);
    } catch (err) {
      console.error("Capture failed:", err);
      onCancel();
    }
  };

  if (captureData) {
    return (
      <CaptureResultModal
        imageData={captureData}
        onChoice={(type) => onCapture({ type, data: captureData })}
        onCancel={onCancel}
      />
    );
  }

  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

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
            left, top, width, height,
            border: '2px solid var(--accent-blue)',
            backgroundColor: 'rgba(0, 122, 204, 0.2)'
          }}
        />
      )}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        color: 'var(--text-heading)', fontFamily: 'var(--font-ui)', fontSize: 'var(--font-size-md)',
        padding: 'var(--space-2) var(--space-4)', backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 'var(--radius-md)'
      }}>
        ESC to cancel
      </div>
    </div>
  );
}