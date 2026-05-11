import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, GripHorizontal } from "lucide-react";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export function ChatPanel({
  messages,
  onSend,
  collapsed,
  onToggleCollapse,
  onPointerDownDragHandle,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onPointerDownDragHandle: (e: React.PointerEvent) => void;
}) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col">
      {/* Drag handle / header */}
      <div
        className="flex cursor-grab items-center justify-between px-4 py-3 select-none active:cursor-grabbing"
        onPointerDown={onPointerDownDragHandle}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="text-white/50" />
          <h2 className="text-sm font-semibold text-white/90">Chat</h2>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onToggleCollapse}
          className="rounded-md p-1 text-white/50 hover:text-white/80 transition-colors"
        >
          {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Message list */}
          <div
            className="mx-3 h-80 overflow-auto rounded-xl p-3"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={[
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "ml-auto text-white"
                      : "mr-auto text-gray-900",
                  ].join(" ")}
                  style={
                    m.role === "user"
                      ? {
                          background: "rgba(30, 80, 160, 0.65)",
                          backdropFilter: "blur(12px)",
                          border: "1px solid rgba(100,160,255,0.3)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
                        }
                      : {
                          background: "rgba(255,255,255,0.55)",
                          backdropFilter: "blur(12px)",
                          border: "1px solid rgba(255,255,255,0.4)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
                        }
                  }
                >
                  {m.content}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input row */}
          <form
            className="m-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const t = text.trim();
              if (!t) return;
              onSend(t);
              setText("");
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask about history…"
              className="flex-1 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-white/50 outline-none"
              style={{
                background: "rgba(255,255,255,0.25)",
                border: "1px solid rgba(255,255,255,0.35)",
                backdropFilter: "blur(12px)",
              }}
            />
            <button
              type="submit"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{
                background: "rgba(25,75,155,0.70)",
                border: "1px solid rgba(100,160,255,0.3)",
                backdropFilter: "blur(12px)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}
