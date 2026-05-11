import type { TimelineEra } from "../shared/types/timeline";

export const mockEras: TimelineEra[] = [
  {
    id: "era_1",
    title: "Early Build",
    startLabel: "2025-12-01",
    endLabel: "2025-12-31",
    bgClass: "bg-gradient-to-b from-sky-500/10 to-sky-500/0",
    priority: 10,
  },
  {
    id: "era_2",
    title: "Polish & UX",
    startLabel: "2026-01-01",
    endLabel: "2026-02-28",
    bgClass: "bg-gradient-to-b from-orange-500/12 to-orange-500/0",
    priority: 9,
  },
];
