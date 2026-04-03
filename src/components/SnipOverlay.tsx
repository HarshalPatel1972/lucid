import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface CaptureResultModalProps {
  imageData: string;
  onChoice: (type: 'ocr' | 'vision') => void;
  onCancel: () => void;
}

function CaptureResultModal({ imageData, onChoice, onCancel }: CaptureResultModalProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        backgroundColor: 'var(--bg-1)',
        border: '1px solid var(--border-1)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '12px',
        maxWidth: '360px', width: '100%',
        boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
      }}>
        <img
          src={`data:image/png;base64,${imageData}`}
          alt="Captured area"
          style={{
            maxWidth: '100%', maxHeight: '180px', objectFit: 'contain',
            border: '1px solid var(--border-1)', borderRadius: 'var(--radius)',
          }}
        />
        <p style={{ fontSize: 12, color: 'var(--text-2)', textAlign: 'center' }}>
          How would you like to use this capture?
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onChoice('ocr')}
            style={{
              flex: 1, padding: '8px', cursor: 'pointer',
              backgroundColor: 'var(--bg-2)', color: 'var(--text-1)',
              border: '1px solid var(--border-1)', borderRadius: 'var(--radius)',
              fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
              transition: 'background 120ms',
            }}
            onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-3)')}
            onMouseOut={e => (e.currentTarget.style.background = 'var(--bg-2)')}
          >
            Extract Text (OCR)
          </button>
          <button
            onClick={() => onChoice('vision')}
            style={{
              flex: 1, padding: '8px', cursor: 'pointer',
              backgroundColor: 'var(--accent)', color: 'white',
              border: 'none', borderRadius: 'var(--radius)',
              fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
              transition: 'background 120ms',
            }}
            onMouseOver={e => (e.currentTarget.style.background = 'var(--accent-hi)')}
            onMouseOut={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            Send as Image
          </button>
        </div>
        <button
          onClick={onCancel}
          style={{
            padding: '6px', cursor: 'pointer',
            backgroundColor: 'transparent', color: 'var(--text-3)',
            border: 'none', borderRadius: 'var(--radius)',
            fontSize: 12, fontFamily: 'inherit',
          }}
        >
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
  const [captureData, setCaptureData] = useState<{ b64: string; rect: { x: number; y: number; width: number; height: number } } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setStartX(e.clientX); setStartY(e.clientY);
    setCurrentX(e.clientX); setCurrentY(e.clientY);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    setCurrentX(e.clientX); setCurrentY(e.clientY);
  };

  const handleMouseUp = async () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    if (width < 8 || height < 8) { onCancel(); return; }
    try {
      const b64 = await invoke<string>('capture_region', { x, y, width, height });
      setCaptureData({ b64, rect: { x, y, width, height } });
    } catch (err) {
      console.error("Capture failed:", err);
      onCancel();
    }
  };

  if (captureData) {
    return (
      <CaptureResultModal
        imageData={captureData.b64}
        onChoice={async (type) => {
          if (type === 'ocr') {
            try {
              const text = await invoke<string>('ocr_region', captureData.rect);
              onCapture({ type: 'ocr', data: text });
            } catch (err) {
              console.error(err);
              onCapture({ type: 'ocr', data: '[OCR failed]' });
            }
          } else {
            onCapture({ type: 'vision', data: captureData.b64 });
          }
        }}
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
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.55)', cursor: 'crosshair',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {isDrawing && (
        <div style={{
          position: 'absolute', left, top, width, height,
          border: '1.5px solid var(--accent)',
          backgroundColor: 'var(--accent-bg)',
          boxShadow: '0 0 0 1px rgba(99,102,241,0.15)',
        }} />
      )}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%',
        transform: 'translateX(-50%)',
        color: 'var(--text-1)',
        fontSize: 12,
        padding: '6px 14px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border-1)',
        backdropFilter: 'blur(4px)',
        letterSpacing: '-0.01em',
      }}>
        Drag to select · Esc to cancel
      </div>
    </div>
  );
}