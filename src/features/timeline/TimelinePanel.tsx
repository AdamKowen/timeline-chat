import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Info } from "lucide-react";
import type { TimelineEra, TimelineEvent } from "../../shared/types/timeline";

function toComparable(label: string): string {
  // NOTE: For ISO (YYYY-MM-DD) and YYYY this works reasonably for now.
  // Later we will support BCE / circa / unknown parsing properly.
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) return label;
  if (/^\d{4}$/.test(label)) return `${label}-01-01`;
  return "9999-12-31"; // Unknown goes last
}

function inRange(dateLabel: string, start: string, end: string): boolean {
  const d = toComparable(dateLabel);
  const s = toComparable(start);
  const e = toComparable(end);
  return d >= s && d <= e;
}

function confidenceClasses(conf: TimelineEvent["confidence"]) {
  switch (conf) {
    case "high":
      return "border-green-500/40 bg-green-500/5";
    case "medium":
      return "border-yellow-500/40 bg-yellow-500/5";
    case "low":
      return "border-red-500/40 bg-red-500/5";
    default:
      return "border-white/10 bg-white/5";
  }
}

function lineStyle(conf: TimelineEvent["confidence"]) {
  return conf === "high"
    ? "border-solid"
    : conf === "medium"
    ? "border-dashed"
    : "border-dotted";
}

function SourcesButton({ event }: { event: TimelineEvent }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const sources = useMemo(() => event.sources ?? [], [event.sources]);

  const [pos, setPos] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });

  useEffect(() => {
    if (!open) return;

    // NOTE: Measure button position and place the menu in a fixed portal layer.
    const update = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const top = r.bottom + 8;
      const right = window.innerWidth - r.right;
      setPos({ top, right });
    };

    update();

    // NOTE: Keep position correct on scroll/resize (capture scroll from any container).
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // NOTE: Avoid SSR crashes if used in a non-browser environment.
  const canPortal = typeof document !== "undefined" && !!document.body;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
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
                  style={{ top: pos.top, right: pos.right }}
                  className="fixed z-[9999] w-80 rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">Sources</div>
                    <button
                      onClick={() => setOpen(false)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
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
                          className="rounded-lg border border-gray-100 p-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-medium">{s.title}</div>
                              <div className="mt-0.5 text-xs text-gray-600">
                                {s.kind} • {s.confidence}
                              </div>
                            </div>

                            {s.url && s.url.startsWith("http") && (
                              <a
                                href={s.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                              >
                                open <ExternalLink size={12} />
                              </a>
                            )}
                          </div>

                          {s.note && (
                            <div className="mt-1 text-xs text-gray-600">{s.note}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-3 text-[11px] text-gray-500">
                    Note: sources are model-suggested. Verify before trusting.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )
        : null}
    </div>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 28 } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.12 } },
};

const listVariants = {
  visible: { transition: { staggerChildren: 0.055 } },
};

function EventCard({ event }: { event: TimelineEvent }) {
  return (
    <motion.div
      key={event.id}
      layout
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="relative pl-10"
    >
      {/* Dot */}
      <div className="absolute left-2.5 top-4 h-3 w-3 rounded-full bg-gray-900" />

      <div
        className={[
          "rounded-xl border p-3 shadow-sm bg-white",
          confidenceClasses(event.confidence),
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-gray-500">{event.dateLabel}</div>
            <div className="text-base font-semibold">{event.title}</div>
          </div>

          <SourcesButton event={event} />
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
          <div
            className={[
              "h-0.5 w-10 border-t border-gray-400",
              lineStyle(event.confidence),
            ].join(" ")}
          />
          <span>
            confidence: <span className="font-medium">{event.confidence}</span>
          </span>
        </div>

        <p className="mt-2 text-sm text-gray-700">{event.summary}</p>
      </div>
    </motion.div>
  );
}

export function TimelinePanel({
  events,
  eras,
}: {
  events: TimelineEvent[];
  eras: TimelineEra[];
}) {
  // NOTE: Higher priority eras appear first (useful when eras overlap).
  const sortedEras = useMemo(() => {
    return [...eras].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }, [eras]);

  const { eraSections, notInAnyEra } = useMemo(() => {
    // NOTE: Compute everything in a pure way (no refs mutation during render).
    const used = new Set<string>();

    const sections = sortedEras
      .map((era) => {
        const eraEvents = events.filter((e) =>
          inRange(e.dateLabel, era.startLabel, era.endLabel)
        );

        if (eraEvents.length === 0) return null;

        for (const e of eraEvents) used.add(e.id);

        return { era, eraEvents };
      })
      .filter(Boolean) as Array<{ era: TimelineEra; eraEvents: TimelineEvent[] }>;

    const remaining = events.filter((e) => !used.has(e.id));

    return { eraSections: sections, notInAnyEra: remaining };
  }, [events, sortedEras]);

  return (
    <div className="h-full w-full p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <span className="text-xs text-gray-500">
          {events.length} events • {eras.length} eras
        </span>
      </div>

      <div className="space-y-4">
        {eraSections.map(({ era, eraEvents }) => {
          return (
            <section key={era.id} className="relative">
              {/* Era backdrop (NOT a card container) */}
              <div
                className={[
                  "pointer-events-none absolute inset-0 rounded-3xl",
                  era.bgClass ?? "bg-white",
                  "ring-1 ring-black/5",
                ].join(" ")}
                aria-hidden="true"
              />

              {/* Era header */}
              <div className="relative z-10 px-4 pt-3 pb-2 flex items-baseline justify-between">
                <div className="text-sm font-semibold">{era.title}</div>
                <div className="text-xs text-gray-500">
                  {era.startLabel} → {era.endLabel}
                </div>
              </div>

              {/* Era content */}
              <div className="relative z-10 px-4 pb-4">
                {/* Section vertical line */}
                <div className="absolute bottom-0 left-7 top-0 w-px bg-gray-200" />

                <motion.div className="space-y-3 pl-6" variants={listVariants} initial="hidden" animate="visible">
                  <AnimatePresence initial={false}>
                    {eraEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>
            </section>
          );
        })}

        {/* Uncategorized events (not in any era) */}
        {notInAnyEra.length > 0 ? (
          <section className="relative">
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl bg-white ring-1 ring-black/5"
              aria-hidden="true"
            />

            <div className="relative z-10 px-4 pt-3 pb-2 flex items-baseline justify-between">
              <div className="text-sm font-semibold">Uncategorized</div>
              <div className="text-xs text-gray-500">not in any era</div>
            </div>

            <div className="relative z-10 px-4 pb-4">
              <div className="absolute bottom-0 left-7 top-0 w-px bg-gray-200" />

              <motion.div className="space-y-3 pl-6" variants={listVariants} initial="hidden" animate="visible">
                <AnimatePresence initial={false}>
                  {notInAnyEra.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
