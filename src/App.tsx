import { useReducer, useState } from "react";
import { motion, useDragControls } from "framer-motion";
import { ChatPanel } from "./features/chat/ChatPanel";
import type { ChatMessage } from "./features/chat/ChatPanel";
import { TimelinePanel } from "./features/timeline/TimelinePanel";
import { eraReducer, timelineReducer } from "./features/timeline/timelineReducer";
import type { ChatResponse, TimelineAction, TimelineEraAction, TimelineEvent } from "./shared/types/timeline";

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Ask me about any historical topic and I'll build a timeline." },
  ]);

  const [events, dispatchEvent] = useReducer(timelineReducer, [] as TimelineEvent[]);
  const [eras, dispatchEra] = useReducer(eraReducer, []);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const dragControls = useDragControls();

  function applyActions(actions: TimelineAction[]) {
    for (const a of actions) dispatchEvent(a);
  }

  function applyEraActions(actions: TimelineEraAction[]) {
    for (const a of actions) dispatchEra(a);
  }

  async function onSend(text: string) {
    const userMsg: ChatMessage = { role: "user", content: text };
    const loadingMsg: ChatMessage = { role: "assistant", content: "…" };

    const outgoingMessages = [...messages, userMsg];

    setMessages((prev) => [...prev, userMsg, loadingMsg]);

    try {
      const r = await fetch("http://localhost:8787/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: outgoingMessages,
          timelineSnapshot: { events, eras },
        }),
      });

      const resp = (await r.json()) as ChatResponse;

      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: resp.assistantMessage ?? "(no text)",
        };
        return next;
      });

      if (resp.actions) applyActions(resp.actions);
      if (resp.eraActions) applyEraActions(resp.eraActions);
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: "Could not reach the server. Make sure it's running on port 8787.",
        };
        return next;
      });
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      {/* Sky background — fixed so it stays put while timeline scrolls */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "linear-gradient(to bottom, #1a6fb5 0%, #3d94d0 28%, #71b8e8 58%, #b8ddf5 100%)",
        }}
      />

      {/* Timeline — scrollable, transparent so sky shows through */}
      <div className="h-full w-full overflow-auto">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <TimelinePanel events={events} eras={eras} />
        </div>
      </div>

      {/* Floating glass chat panel */}
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragElastic={0}
        className="fixed bottom-6 right-6 z-50 w-96 rounded-2xl border border-white/30 shadow-[0_20px_60px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.55)]"
        style={{ backdropFilter: "blur(28px)", background: "rgba(255,255,255,0.18)" }}
      >
        <ChatPanel
          messages={messages}
          onSend={onSend}
          collapsed={chatCollapsed}
          onToggleCollapse={() => setChatCollapsed((v) => !v)}
          onPointerDownDragHandle={(e) => dragControls.start(e)}
        />
      </motion.div>
    </div>
  );
}
