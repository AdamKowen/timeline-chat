import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { animate, motion, useDragControls, useMotionValue } from "framer-motion";
import { ChatPanel } from "./features/chat/ChatPanel";
import type { ChatMessage } from "./features/chat/ChatPanel";
import { TimelinePanel } from "./features/timeline/TimelinePanel";
import { eraReducer, timelineReducer } from "./features/timeline/timelineReducer";
import type { ChatResponse, TimelineAction, TimelineEraAction, TimelineEvent } from "./shared/types/timeline";

const PANEL_W = 384; // w-96
const MARGIN = 24;

type Corner = "tl" | "tr" | "bl" | "br";

function nearestCorner(rect: DOMRect): Corner {
  const isRight = rect.left + rect.width / 2 > window.innerWidth / 2;
  const isBottom = rect.top + rect.height / 2 > window.innerHeight / 2;
  if (isRight && isBottom) return "br";
  if (!isRight && isBottom) return "bl";
  if (isRight) return "tr";
  return "tl";
}

function cornerPos(corner: Corner, h: number) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  switch (corner) {
    case "tl": return { x: MARGIN,               y: MARGIN };
    case "tr": return { x: W - PANEL_W - MARGIN, y: MARGIN };
    case "bl": return { x: MARGIN,               y: H - h - MARGIN };
    case "br": return { x: W - PANEL_W - MARGIN, y: H - h - MARGIN };
  }
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Ask me about any historical topic and I'll build a timeline." },
  ]);

  const [events, dispatchEvent] = useReducer(timelineReducer, [] as TimelineEvent[]);
  const [eras, dispatchEra] = useReducer(eraReducer, []);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const panelX = useMotionValue(window.innerWidth - PANEL_W - MARGIN);
  const panelY = useMotionValue(window.innerHeight - 460 - MARGIN);
  const scrollY = useMotionValue(0);
  const currentCorner = useRef<Corner>("br");

  const SPRING = { type: "spring", stiffness: 200, damping: 30, mass: 1 } as const;

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    panelY.set(window.innerHeight - el.getBoundingClientRect().height - MARGIN);
  }, [panelY]);

  // Re-snap to same corner whenever the panel height changes (collapse/expand)
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const pos = cornerPos(currentCorner.current, rect.height);
      animate(panelX, pos.x, SPRING);
      animate(panelY, pos.y, SPRING);
    });
    return () => cancelAnimationFrame(frame);
  }, [chatCollapsed, panelX, panelY]);

  function snapToCorner() {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const corner = nearestCorner(rect);
    currentCorner.current = corner;
    const pos = cornerPos(corner, rect.height);
    animate(panelX, pos.x, SPRING);
    animate(panelY, pos.y, SPRING);
  }

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
      <div
        onScroll={(e) => scrollY.set(e.currentTarget.scrollTop)}
        className="h-full w-full overflow-x-hidden overflow-y-auto"
      >
        <div className="mx-auto max-w-3xl px-4">
          <TimelinePanel events={events} eras={eras} scrollY={scrollY} />
        </div>
      </div>

      {/* Floating glass chat panel */}
      <motion.div
        ref={panelRef}
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragElastic={0}
        onDragEnd={snapToCorner}
        className="fixed top-0 left-0 z-50 w-96 rounded-2xl border border-white/30 shadow-[0_20px_60px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.55)]"
        style={{
          x: panelX,
          y: panelY,
          backdropFilter: "blur(28px)",
          background: "rgba(255,255,255,0.18)",
        }}
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
