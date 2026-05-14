import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Info } from "lucide-react";
import type { TimelineEra, TimelineEvent } from "../../shared/types/timeline";

const CARD_MIN_SPACING = 130;
const TOP_PAD = 70;
const BOTTOM_PAD = 70;

function parseYear(dateLabel: string): number {
  const m = dateLabel.match(/^(-?\d+)/);
  return m ? parseInt(m[1]) : 9999;
}

function getTickInterval(range: number): number {
  if (range <= 10)    return 1;
  if (range <= 30)    return 5;
  if (range <= 100)   return 10;
  if (range <= 300)   return 25;
  if (range <= 1000)  return 100;
  if (range <= 3000)  return 250;
  if (range <= 10000) return 500;
  return 1000;
}

function eraColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return {
    bg:   `hsl(${hue}, 48%, 52%)`,
    text: `hsl(${hue}, 30%, 92%)`,
  };
}

function confidenceBorder(conf: TimelineEvent["confidence"]): string {
  switch (conf) {
    case "high":   return "rgba(74,222,128,0.55)";
    case "medium": return "rgba(251,191,36,0.55)";
    case "low":    return "rgba(248,113,113,0.55)";
    default:       return "rgba(255,255,255,0.25)";
  }
}

function lineStyleClass(conf: TimelineEvent["confidence"]): string {
  if (conf === "high")   return "border-solid";
  if (conf === "medium") return "border-dashed";
  return "border-dotted";
}

function SourcesButton({ event }: { event: TimelineEvent }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const sources = useMemo(() => event.sources ?? [], [event.sources]);
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const canPortal = typeof document !== "undefined" && !!document.body;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-700 transition-opacity hover:opacity-80"
        style={{
          background: "rgba(255,255,255,0.45)",
          border: "1px solid rgba(255,255,255,0.5)",
          backdropFilter: "blur(8px)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
        }}
        title="View sources"
      >
        <Info size={14} />
        Sources
      </button>

      {canPortal
        ? createPortal(
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    top: pos.top,
                    right: pos.right,
                    background: "rgba(255,255,255,0.80)",
                    backdropFilter: "blur(24px)",
                    border: "1px solid rgba(255,255,255,0.5)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)",
                  }}
                  className="fixed z-[9999] w-80 rounded-xl p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-800">Sources</div>
                    <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-700">
                      close
                    </button>
                  </div>
                  {sources.length === 0 ? (
                    <div className="text-sm text-gray-600">No sources.</div>
                  ) : (
                    <ul className="space-y-2">
                      {sources.map((s, idx) => (
                        <li
                          key={`${s.url ?? "nosrc"}_${idx}`}
                          className="rounded-lg p-2"
                          style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.6)" }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-medium text-gray-800">{s.title}</div>
                              <div className="mt-0.5 text-xs text-gray-500">{s.kind} · {s.confidence}</div>
                            </div>
                            {s.url && s.url.startsWith("http") && (
                              <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                open <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          {s.note && <div className="mt-1 text-xs text-gray-500">{s.note}</div>}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 text-[11px] text-gray-400">Sources are model-suggested. Verify before trusting.</div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )
        : null}
    </div>
  );
}

function EventCard({ event }: { event: TimelineEvent }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      layout
      onHoverStart={() => setOpen(true)}
      onHoverEnd={() => setOpen(false)}
      whileHover={{ scale: 1.06 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="cursor-default rounded-3xl"
      style={{
        background: "rgba(255,255,255,0.22)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.25)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.55)",
      }}
    >
      <div className="px-4 py-3.5">
        <div className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>
          {event.dateLabel}
        </div>
        <div className="mt-0.5 text-sm font-semibold leading-snug text-white">
          {event.title}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-4">
              <div className="mb-1.5 flex items-center gap-2 text-xs text-white/60">
                <div className={`h-0.5 w-6 border-t border-white/40 ${lineStyleClass(event.confidence)}`} />
                <span>confidence: <span className="font-medium">{event.confidence}</span></span>
              </div>
              <p className="text-xs leading-relaxed text-white/85">{event.summary}</p>
              {(event.sources?.length ?? 0) > 0 && (
                <div className="mt-2"><SourcesButton event={event} /></div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function TimelinePanel({ events, eras }: { events: TimelineEvent[]; eras: TimelineEra[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(760);
  const [hoveredEraId, setHoveredEraId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => setCw(entry.contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const cx = cw / 2;
  const cardW = Math.max(130, Math.floor(cx) - 60);

  const sorted = useMemo(
    () => [...events].sort((a, b) => parseYear(a.dateLabel) - parseYear(b.dateLabel)),
    [events]
  );

  const { minYear, maxYear, range, baseH, yearToY } = useMemo(() => {
    const validYears = sorted.map(e => parseYear(e.dateLabel)).filter(y => y !== 9999);
    if (validYears.length === 0) {
      return { minYear: 2000, maxYear: 2024, range: 24, baseH: 500, yearToY: () => TOP_PAD };
    }
    const min = Math.min(...validYears);
    const max = Math.max(...validYears);
    const r = Math.max(max - min, 1);
    const h = Math.max(500, sorted.length * CARD_MIN_SPACING);
    return {
      minYear: min,
      maxYear: max,
      range: r,
      baseH: h,
      yearToY: (y: number) => TOP_PAD + ((y - min) / r) * h,
    };
  }, [sorted]);

  const positioned = useMemo(() => {
    const items = sorted.map((event, i) => ({
      event,
      trueY: yearToY(parseYear(event.dateLabel)),
      cardY: yearToY(parseYear(event.dateLabel)),
      side: (i % 2 === 0 ? "left" : "right") as "left" | "right",
    }));

    for (const side of ["left", "right"] as const) {
      const group = items.filter(it => it.side === side);
      for (let i = 1; i < group.length; i++) {
        if (group[i].cardY < group[i - 1].cardY + CARD_MIN_SPACING) {
          group[i].cardY = group[i - 1].cardY + CARD_MIN_SPACING;
        }
      }
    }
    return items;
  }, [sorted, yearToY]);

  const D_NORMAL = 40;
  const D_HOVERED = 72;
  const EXPANSION = D_HOVERED - D_NORMAL;

  const eraShifts = useMemo(() => {
    const map = new Map<string, number>();
    for (const { event, trueY } of positioned) {
      const year = parseYear(event.dateLabel);
      const era = eras.find(
        e => year >= parseYear(e.startLabel) && year <= parseYear(e.endLabel)
      );
      if (!era || hoveredEraId !== era.id) { map.set(event.id, 0); continue; }
      const eraY1 = yearToY(parseYear(era.startLabel));
      const eraY2 = yearToY(parseYear(era.endLabel));
      const eraH = eraY2 - eraY1;
      const t = eraH > 0 ? (trueY - eraY1) / eraH : 0.5;
      map.set(event.id, EXPANSION * (t - 0.5));
    }
    return map;
  }, [positioned, eras, hoveredEraId, yearToY]);

  const totalH = positioned.length === 0
    ? 300
    : Math.max(...positioned.map(p => p.cardY)) + BOTTOM_PAD + 110;

  const ticks = useMemo(() => {
    const interval = getTickInterval(range);
    const first = Math.ceil(minYear / interval) * interval;
    const result: number[] = [];
    for (let y = first; y <= maxYear; y += interval) result.push(y);
    return result;
  }, [minYear, maxYear, range]);

  const cpOffset = Math.min(80, cardW * 0.35);

  if (events.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
          Ask about a historical topic to build the timeline
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: totalH }}>

      {/* Era blobs — full-bleed SVG, painted top→bottom; motion.path animates curve depth on hover */}
      <svg
        className="absolute"
        style={{ top: 0, left: "calc(50% - 50vw)", width: "100vw", height: totalH }}
        viewBox={`0 0 100 ${totalH}`}
        preserveAspectRatio="none"
      >
        {(() => {
          const sorted = [...eras]
            .map(era => ({ era, y1: yearToY(parseYear(era.startLabel)), y2: yearToY(parseYear(era.endLabel)) }))
            .filter(e => e.y2 > e.y1)
            .sort((a, b) => a.y1 - b.y1);
          return sorted.map(({ era, y1, y2 }, idx) => {
            const hovered = hoveredEraId === era.id;
            const d = hovered ? 72 : 40;
            const isFirst = idx === 0;
            const isLast  = idx === sorted.length - 1;
            const top    = isFirst ? `M 0,0 L 100,0`               : `M 0,${y1} Q 50,${y1 - d} 100,${y1}`;
            const bottom = isLast  ? `L 100,${totalH} L 0,${totalH}` : `L 100,${y2} Q 50,${y2 + d} 0,${y2}`;
            const pathD  = `${top} ${bottom} Z`;
            return (
              <motion.path
                key={era.id}
                animate={{ d: pathD }}
                transition={{ type: "spring", stiffness: 220, damping: 18, mass: 1.1 }}
                fill={eraColor(era.id).bg}
                onMouseEnter={() => setHoveredEraId(era.id)}
                onMouseLeave={() => setHoveredEraId(null)}
                style={{ cursor: "default" }}
              />
            );
          });
        })()}
      </svg>

      {/* Era labels */}
      {eras.map(era => {
        const y1 = yearToY(parseYear(era.startLabel));
        const y2 = yearToY(parseYear(era.endLabel));
        if (y2 <= y1) return null;
        const bandH = y2 - y1;
        const { text } = eraColor(era.id);
        return (
          <div
            key={era.id}
            className="pointer-events-none absolute"
            style={{ top: y1, height: bandH, left: "calc(50% - 50vw)", width: "100vw" }}
          >
            <motion.div
              className="absolute left-8 top-6 font-black tracking-tight leading-none"
              animate={{ scale: hoveredEraId === era.id ? 1.12 : 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18, mass: 1.1 }}
              style={{ fontSize: 36, color: text, originX: 0, originY: 0.5 }}
            >
              {era.title}
            </motion.div>
          </div>
        );
      })}

      <svg className="pointer-events-none absolute inset-0" width={cw} height={totalH}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="white" stopOpacity="1"   />
            <stop offset="100%" stopColor="white" stopOpacity="1"   />
          </linearGradient>
        </defs>

        {/* Era color bands on center line */}
        {eras.map(era => {
          const y1 = yearToY(parseYear(era.startLabel));
          const y2 = yearToY(parseYear(era.endLabel));
          if (y2 <= y1) return null;
          return (
            <rect
              key={era.id}
              x={cx - 7.5} y={y1}
              width={15} height={Math.max(y2 - y1, 4)}
              fill={eraColor(era.id).text}
              opacity={0.5}
              rx={7.5}
            />
          );
        })}

        {/* Main line — 15px, white gradient */}
        <rect
          x={cx - 7.5}
          y={TOP_PAD - 32}
          width={15}
          height={totalH - BOTTOM_PAD + 32 - (TOP_PAD - 32)}
          fill="url(#lineGrad)"
          rx={7.5}
        />

        {/* Event dots with year labels */}
        {positioned.map(({ event, trueY: ty, side }) => {
          const year = parseYear(event.dateLabel);
          const labelX  = side === "left" ? cx + 22 : cx - 22;
          const anchor  = side === "left" ? "start"  : "end";
          const shift = eraShifts.get(event.id) ?? 0;

          return (
            <motion.g
              key={event.id}
              animate={{ y: shift }}
              transition={{ type: "spring", stiffness: 220, damping: 18, mass: 1.1 }}
            >
              {/* Dot halo */}
              <circle cx={cx} cy={ty} r={11}  fill="rgba(237,117,72,0.18)" />
              {/* Dot */}
              <circle cx={cx} cy={ty} r={8}   fill="rgb(237,117,72)" />
              {/* Year label */}
              <text
                x={labelX}
                y={ty + 4}
                textAnchor={anchor}
                fontSize={11}
                fontWeight="600"
                fill="rgba(255,255,255,0.75)"
                fontFamily="system-ui, sans-serif"
              >
                {year < 0 ? `${Math.abs(year)} BCE` : year}
              </text>
            </motion.g>
          );
        })}
      </svg>

      {/* Event cards */}
      {positioned.map(({ event, cardY, side }) => (
        <motion.div
          key={event.id}
          className="absolute"
          animate={{ y: eraShifts.get(event.id) ?? 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 18, mass: 1.1 }}
          style={{
            top: cardY,
            ...(side === "left"
              ? { right: cx + 16, width: cardW }
              : { left:  cx + 16, width: cardW }),
          }}
        >
          <EventCard event={event} />
        </motion.div>
      ))}
    </div>
  );
}
