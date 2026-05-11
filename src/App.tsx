import { useReducer, useState } from "react";
import { ChatPanel } from "./features/chat/ChatPanel";
import type { ChatMessage } from "./features/chat/ChatPanel";
import { TimelinePanel } from "./features/timeline/TimelinePanel";
import { timelineReducer } from "./features/timeline/timelineReducer";
import type { ChatResponse, TimelineAction, TimelineEra, TimelineEvent } from "./shared/types/timeline";

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Type 'start' to add a timeline event (mock)." },
  ]);

  const [events, dispatch] = useReducer(timelineReducer, [] as TimelineEvent[]);
  const [eras, setEras] = useState<TimelineEra[]>([]);

  function applyActions(actions: TimelineAction[]) {
    for (const a of actions) dispatch(a);
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
      if (resp.eras) setEras(resp.eras);
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: "אירעה שגיאה בשיחה עם המודל. בדוק שהשרת המקומי רץ.",
        };
        return next;
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 p-4 md:grid-cols-2">
        <div className="h-[80vh] rounded-2xl border border-gray-200 bg-white shadow-sm">
          <ChatPanel messages={messages} onSend={onSend} />
        </div>

        <div className="h-[80vh] rounded-2xl border border-gray-200 bg-white shadow-sm">
          <TimelinePanel events={events} eras={eras} />
        </div>
      </div>
    </div>
  );
}
