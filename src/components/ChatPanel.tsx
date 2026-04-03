import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { invoke } from '@tauri-apps/api/core';

export type MessageContent = string | { text: string; image_base64: string };

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: MessageContent;
}

export interface ChatPanelProps {
  sessionKey: number;
  pendingSnip?: { type: 'ocr' | 'vision'; data: string } | null;
  onSnipConsumed?: () => void;
}

// ── Inline SVG Icons ───────────────────────────────────────────
const UserIcon = () => (
  <svg viewBox="0 0 12 12" fill="none">
    <circle cx="6" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M1.5 11c0-2 2-3.5 4.5-3.5S10.5 9 10.5 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

const AIIcon = () => (
  <svg viewBox="0 0 12 12" fill="none">
    <path d="M6 1L7.5 4.5L11 6L7.5 7.5L6 11L4.5 7.5L1 6L4.5 4.5L6 1Z"
      stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 14 14" fill="none">
    <path d="M12 7L2 2.5L5 7L2 11.5L12 7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"/>
  </svg>
);

// ── Smart text renderer (code blocks + inline code) ────────────
function renderText(text: string): React.ReactNode {
  const codeBlockRx = /(```[\s\S]*?```)/g;
  const parts = text.split(codeBlockRx);

  return parts.map((part, i) => {
    // Fenced code block
    if (part.startsWith('```')) {
      const m = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
      const lang = m?.[1]?.trim() || '';
      const code = m?.[2] ?? part.replace(/^```\w*\n?/, '').replace(/```$/, '');
      return (
        <div key={i} className="code-block">
          {lang && (
            <div className="code-header">
              <span className="code-lang">{lang}</span>
            </div>
          )}
          <pre><code>{code}</code></pre>
        </div>
      );
    }

    // Inline code
    const inlineParts = part.split(/(`[^`\n]+`)/g);
    return (
      <span key={i}>
        {inlineParts.map((s, j) =>
          s.startsWith('`') && s.endsWith('`') && s.length > 2
            ? <code key={j} className="inline-code">{s.slice(1, -1)}</code>
            : s
        )}
      </span>
    );
  });
}

// ── Component ──────────────────────────────────────────────────
export const ChatPanel = memo(function ChatPanel({
  sessionKey,
  pendingSnip,
  onSnipConsumed,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [sessionKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    autoResize(e.target);
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() && !pendingSnip) return;
    if (loading) return;

    let content: MessageContent = input.trim();
    if (pendingSnip) {
      content = pendingSnip.type === 'vision'
        ? { text: input.trim(), image_base64: pendingSnip.data }
        : `[Screen OCR]\n${pendingSnip.data}${input.trim() ? `\n\n${input.trim()}` : ''}`;
    }

    const msg: Message = { role: 'user', content };
    const newMsgs = [...messages, msg];
    setMessages(newMsgs);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    if (onSnipConsumed) onSnipConsumed();
    setLoading(true);

    try {
      const response = await invoke<string>('ai_complete', {
        messages: newMsgs,
        system: null,
      });
      setMessages([...newMsgs, { role: 'assistant', content: response }]);
    } catch (e) {
      setMessages([...newMsgs, { role: 'assistant', content: `Error: ${e}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, pendingSnip, onSnipConsumed]);

  return (
    <div className="chat-root">
      {/* Messages */}
      <div className="messages-list">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 32 32" fill="none">
                <path d="M16 4L18 12L26 14L18 16L16 24L14 16L6 14L14 12L16 4Z"
                  stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                <path d="M24 24L25 27L28 28L25 29L24 32L23 29L20 28L23 27L24 24Z"
                  stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="empty-label">Ask Lucid anything</p>
            <p className="empty-sub">Type below, or capture a region of your screen</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className="msg-group">
            <div className={`msg-row ${m.role}`}>
              <div className={`msg-avatar ${m.role}`}>
                {m.role === 'user' ? <UserIcon /> : <AIIcon />}
              </div>
              <div className="msg-body">
                <div className={`msg-bubble ${m.role}`}>
                  {typeof m.content === 'string'
                    ? m.role === 'assistant'
                      ? renderText(m.content)
                      : m.content
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <img
                          src={`data:image/png;base64,${m.content.image_base64}`}
                          alt="Attached"
                          style={{ maxWidth: 220, borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                        {m.content.text && <span>{m.content.text}</span>}
                      </div>
                    )
                  }
                </div>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="thinking-row">
            <div className="msg-avatar assistant">
              <AIIcon />
            </div>
            <div className="thinking-dots">
              <div className="dot" />
              <div className="dot" />
              <div className="dot" />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="input-area">
        {pendingSnip && (
          <div className="snip-badge">
            <div className="snip-badge-left">
              <div className="snip-thumb">
                {pendingSnip.type === 'vision'
                  ? <img src={`data:image/png;base64,${pendingSnip.data}`} alt="snip" />
                  : 'TXT'
                }
              </div>
              <div>
                <p className="snip-label">
                  {pendingSnip.type === 'vision' ? 'Screenshot' : 'OCR text'} attached
                </p>
                <p className="snip-sub">Will send with your message</p>
              </div>
            </div>
            <button className="snip-dismiss" onClick={onSnipConsumed} title="Remove">✕</button>
          </div>
        )}

        <div className="input-row">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message Lucid… (Enter to send, Shift+Enter for newline)"
            className="chat-textarea"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={loading || (!input.trim() && !pendingSnip)}
            className="send-btn"
            title="Send (Enter)"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
});