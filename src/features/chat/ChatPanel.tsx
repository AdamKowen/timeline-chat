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
          <GripHorizontal size={14} className="text-gray-400" />
          <h2 className="text-sm font-semibold">Chat</h2>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onToggleCollapse}
          className="rounded-md p-1 text-gray-400 hover:text-gray-600"
        >
          {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="mx-3 h-80 overflow-auto rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={[
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "ml-auto bg-gray-900 text-white"
                      : "mr-auto bg-white text-gray-900 shadow-sm border border-gray-100",
                  ].join(" ")}
                >
                  {m.content}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

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
              className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            />
            <button
              type="submit"
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}
