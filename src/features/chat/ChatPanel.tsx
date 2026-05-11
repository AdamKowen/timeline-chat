import { useState } from "react";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export function ChatPanel({
  messages,
  onSend,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");

  

  return (
    <div className="flex h-full w-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Chat</h2>
        <span className="text-xs text-gray-500">mock mode</span>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white p-3">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={[
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                m.role === "user"
                  ? "ml-auto bg-gray-900 text-white"
                  : "mr-auto bg-gray-100 text-gray-900",
              ].join(" ")}
            >
              {m.content}
            </div>
          ))}
        </div>
      </div>

      <form
        className="mt-3 flex gap-2"
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
          placeholder='Try: "start" or "correct_date"'
          className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
        />
        <button
          type="submit"
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Send
        </button>
      </form>
    </div>
  );
}
