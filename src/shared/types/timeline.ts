export type TimelineConfidence = "high" | "medium" | "low";
export type TimelineSourceKind = "primary" | "secondary" | "tertiary" | "unknown";

export type TimelineSource = {
  title: string;
  url?: string;
  kind: TimelineSourceKind;
  confidence: TimelineConfidence;
  note?: string;
};

export type TimelineEvent = {
  id: string;
  dateLabel: string;
  title: string;
  summary: string;
  confidence: TimelineConfidence;
  sources?: TimelineSource[];
  createdAt: string;
  lastUpdatedAt?: string;
};

export type TimelineEra = {
  id: string;
  title: string;
  startLabel: string;
  endLabel: string;
  priority?: number;
  bgClass?: string;
};

// --- Event actions ---

export type TimelineAddEventAction = {
  type: "ADD_EVENT";
  event: TimelineEvent;
};

export type TimelineUpdateEventAction = {
  type: "UPDATE_EVENT";
  id: string;
  patch: Partial<
    Pick<TimelineEvent, "dateLabel" | "title" | "summary" | "confidence" | "sources">
  >;
};

export type TimelineDeleteEventAction = {
  type: "DELETE_EVENT";
  id: string;
};

export type TimelineAction =
  | TimelineAddEventAction
  | TimelineUpdateEventAction
  | TimelineDeleteEventAction;

// --- Era actions ---

export type TimelineAddEraAction = {
  type: "ADD_ERA";
  era: TimelineEra;
};

export type TimelineUpdateEraAction = {
  type: "UPDATE_ERA";
  id: string;
  patch: Partial<Pick<TimelineEra, "title" | "startLabel" | "endLabel" | "priority" | "bgClass">>;
};

export type TimelineDeleteEraAction = {
  type: "DELETE_ERA";
  id: string;
};

export type TimelineEraAction =
  | TimelineAddEraAction
  | TimelineUpdateEraAction
  | TimelineDeleteEraAction;

// --- Server response ---

export type ChatResponse = {
  assistantMessage: string;
  actions: TimelineAction[];
  eraActions?: TimelineEraAction[];
};
