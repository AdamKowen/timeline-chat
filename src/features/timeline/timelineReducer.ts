import type { TimelineAction, TimelineEra, TimelineEraAction, TimelineEvent } from "../../shared/types/timeline";

// NOTE: Sort is simple now: lexicographic dateLabel works for ISO dates.
// Later we will support real parsing and unknown/approx handling.
function sortEvents(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => a.dateLabel.localeCompare(b.dateLabel));
}

export function timelineReducer(
  state: TimelineEvent[],
  action: TimelineAction
): TimelineEvent[] {
  switch (action.type) {
    case "ADD_EVENT": {
      const next = [...state, action.event];
      return sortEvents(next);
    }
    case "UPDATE_EVENT": {
      const next = state.map((e) =>
        e.id === action.id
          ? { ...e, ...action.patch, lastUpdatedAt: new Date().toISOString() }
          : e
      );
      return sortEvents(next);
    }
    case "DELETE_EVENT": {
      return state.filter((e) => e.id !== action.id);
    }
    default:
      return state;
  }
}

export function eraReducer(
  state: TimelineEra[],
  action: TimelineEraAction
): TimelineEra[] {
  switch (action.type) {
    case "ADD_ERA": {
      // Replace if same id already exists, otherwise append.
      const exists = state.some((e) => e.id === action.era.id);
      if (exists) return state.map((e) => (e.id === action.era.id ? action.era : e));
      return [...state, action.era];
    }
    case "UPDATE_ERA": {
      return state.map((e) =>
        e.id === action.id ? { ...e, ...action.patch } : e
      );
    }
    case "DELETE_ERA": {
      return state.filter((e) => e.id !== action.id);
    }
    default:
      return state;
  }
}
