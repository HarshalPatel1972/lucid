import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Send, Bot, User, Loader2 } from "lucide-react";

export type MessageContent = string | { text: string; image_base64: string };

export interface Message {
  role: "user" | "assistant" | "system";
  content: MessageContent;
}

export interface ChatPanelProps {
  sessionKey: number;
  pendingSnip?: { type: "ocr" | "vision"; data: string } | null;
  onSnipConsumed?: () => void;
}

export function ChatPanel({
  sessionKey,
  pendingSnip,
  onSnipConsumed,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [appConfig, setAppConfig] = useState<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    invoke("get_config").then(setAppConfig as any).catch(console.error);
    setMessages([]);
  }, [sessionKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() && !pendingSnip) return;
    if (loading) return;

    let content: MessageContent = input;

    if (pendingSnip) {
      if (pendingSnip.type === "vision") {
        content = { text: input, image_base64: pendingSnip.data };
      } else {
        // ocr
        content = `[OCR Result:]\n${pendingSnip.data}\n\n[User Input:]\n${input}`;
      }
    }

    const msg: Message = { role: "user", content };
    const newMsgs = [...messages, msg];
    setMessages(newMsgs);
    setInput("");
    if (onSnipConsumed) onSnipConsumed();
    setLoading(true);

    try {
      const response = await invoke<string>("ai_complete", {
        messages: newMsgs,
        system: appConfig?.session_prompt || null,
      });
      setMessages([...newMsgs, { role: "assistant", content: response }]);
    } catch (e) {
      setMessages([...newMsgs, { role: "assistant", content: `Error: ${e}` }]);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content: MessageContent) => {
    if (typeof content === "string") return content;
    return (
      <div className="flex flex-col gap-2">
        <img
          src={`data:image/png;base64,${content.image_base64}`}
          alt="Uploaded"
          className="max-w-sm rounded-md shadow-sm"
        />
        <p>{content.text}</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 font-sans text-zinc-100">
      {/* Header */}
      <div className="flex items-center px-6 py-4 border-b border-zinc-800 bg-zinc-920 select-none">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="text-blue-400" /> AI Assistant
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 opacity-50">
            <Bot size={48} />
            <p>How can I help you today?</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-4 ${m.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${m.role === "user" ? "bg-blue-600" : "bg-zinc-800"}`}
            >
              {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl whitespace-pre-wrap ${m.role === "user" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-200"}`}
            >
              {renderContent(m.content)}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-zinc-800 text-zinc-400 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Thinking...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-920">
        {pendingSnip && (
          <div className="max-w-4xl mx-auto mb-2 flex items-center justify-between p-2 rounded-xl bg-blue-900/20 border border-blue-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded flex-shrink-0 border border-zinc-700 bg-black flex items-center justify-center overflow-hidden">
                {pendingSnip.type === "vision" && (
                  <img
                    src={`data:image/png;base64,${pendingSnip.data}`}
                    alt="Snip"
                    className="w-full h-full object-cover"
                  />
                )}
                {pendingSnip.type === "ocr" && (
                  <span className="text-[10px] font-bold text-zinc-400">
                    TXT
                  </span>
                )}
              </div>
              <div className="text-sm">
                <p className="font-semibold text-blue-200">
                  Attached Snip ({pendingSnip.type})
                </p>
                <p className="text-xs text-blue-400">Ready to send</p>
              </div>
            </div>
            <button
              onClick={onSnipConsumed}
              className="text-zinc-400 hover:text-white p-2"
              title="Remove attachment"
            >
              &times;
            </button>
          </div>
        )}
        <div className="flex gap-2 max-w-4xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message... (Shift+Enter for new line)"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none min-h-[52px] max-h-48"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="self-end p-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
