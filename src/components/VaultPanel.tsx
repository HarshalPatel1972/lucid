import { useState, useEffect, memo } from 'react';

interface VaultItem {
  id: string;
  title: string;
  content: string;
  color: string;
}

const COLORS = [
  'var(--accent)',
  'var(--red)',
  'var(--green)',
  'var(--orange)',
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#14b8a6', // teal
];

export const VaultPanel = memo(function VaultPanel() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [activeItem, setActiveItem] = useState<VaultItem | null>(null);

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('lucid_vault');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse vault:', e);
      }
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('lucid_vault', JSON.stringify(items));
  }, [items]);

  const createNew = () => {
    const fresh: VaultItem = {
      id: Date.now().toString(),
      title: 'New Note',
      content: '',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
    setItems((old) => [fresh, ...old]);
    setActiveItem(fresh);
  };

  const deleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems((old) => old.filter((i) => i.id !== id));
  };

  const updateActive = (patch: Partial<VaultItem>) => {
    if (!activeItem) return;
    const updated = { ...activeItem, ...patch };
    setActiveItem(updated);
    setItems((old) => old.map((i) => (i.id === updated.id ? updated : i)));
  };

  if (activeItem) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Editor header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-0)', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-1)' }}>
          <button
            onClick={() => setActiveItem(null)}
            style={{
              padding: '6px 10px', background: 'var(--bg-3)', color: 'var(--text-0)',
              borderRadius: 'var(--radius)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: '1px solid var(--border-1)'
            }}
          >
            ← Back
          </button>
          
          <input
            type="text"
            value={activeItem.title}
            onChange={(e) => updateActive({ title: e.target.value })}
            style={{
              flex: 1, background: 'transparent', border: 'none', color: 'var(--text-0)',
              fontSize: '14px', fontWeight: 600, outline: 'none', padding: '4px 8px'
            }}
            placeholder="Note Title..."
          />
        </div>

        {/* Editor body */}
        <textarea
          value={activeItem.content}
          onChange={(e) => updateActive({ content: e.target.value })}
          placeholder="Paste your resume, context, or code here. You can reference this in chat later..."
          style={{
            flex: 1, padding: '16px', background: 'var(--bg-0)', color: 'var(--text-0)',
            border: 'none', resize: 'none', outline: 'none', fontSize: '13px',
            fontFamily: 'inherit', lineHeight: 1.5
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-0)' }}>Storage Vault</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>Save algorithms, resumes, or context</p>
        </div>
        <button
          onClick={createNew}
          style={{
            padding: '6px 12px', background: 'var(--accent)', color: 'white',
            borderRadius: 'var(--radius)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: 'none'
          }}
        >
          + New Note
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', alignContent: 'start' }}>
        {items.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
            <p>Vault is empty.</p>
          </div>
        )}
        
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => setActiveItem(item)}
            style={{
              position: 'relative',
              aspectRatio: '1',
              background: item.color,
              borderRadius: 'var(--radius-lg)',
              padding: '12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'transform 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
             {/* Delete button (top right) */}
             <button
              onClick={(e) => deleteItem(item.id, e)}
              style={{
                position: 'absolute', top: '8px', right: '8px', width: '20px', height: '20px',
                borderRadius: '50%', background: 'rgba(0,0,0,0.2)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer',
                fontSize: '11px'
              }}
              title="Delete"
             >✕</button>

            <h3 style={{
              color: 'white', fontSize: '13px', fontWeight: 600,
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
              overflow: 'hidden', wordBreak: 'break-word', marginTop: '14px'
            }}>
              {item.title || 'Untitled'}
            </h3>
            
            <p style={{
               color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: 'auto',
               whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {item.content ? `${item.content.length} chars` : 'Empty'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
});
