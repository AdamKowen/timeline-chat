import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import crypto from "node:crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const TimelineConfidenceSchema = z.enum(["high", "medium", "low"]);
const TimelineSourceKindSchema = z.enum(["primary", "secondary", "tertiary", "unknown"]);

const TimelineSourceSchema = z.object({
  title: z.string(),
  url: z.string().optional(),
  kind: TimelineSourceKindSchema,
  confidence: TimelineConfidenceSchema,
  note: z.string().optional(),
});

const TimelineEventSchema = z.object({
  id: z.string(),
  dateLabel: z.string(),
  title: z.string(),
  summary: z.string(),
  confidence: TimelineConfidenceSchema,
  sources: z.array(TimelineSourceSchema).optional(),
  createdAt: z.string(),
  lastUpdatedAt: z.string().optional(),
});

const EraBgClassSchema = z.enum([
  "bg-amber-50",
  "bg-blue-50",
  "bg-green-50",
  "bg-purple-50",
  "bg-rose-50",
  "bg-slate-50",
]);

const TimelineEraSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  startLabel: z.string(),
  endLabel: z.string(),
  priority: z.number().optional(),
  bgClass: EraBgClassSchema.optional(),
});

const TimelineSnapshotSchema = z.object({
  events: z.array(TimelineEventSchema).default([]),
  eras: z.array(TimelineEraSchema.extend({ id: z.string() })).default([]),
});

// --- Event action schemas ---

// Lenient source schema for model output — coerce unexpected enum values rather than throwing.
const IncomingSourceSchema = z.object({
  title: z.string(),
  url: z.string().optional(),
  kind: TimelineSourceKindSchema.catch("unknown"),
  confidence: TimelineConfidenceSchema.catch("medium"),
  note: z.string().optional(),
});

const IncomingNewEventSchema = z.object({
  id: z.string().optional(),
  dateLabel: z.string(),
  title: z.string(),
  summary: z.string(),
  confidence: TimelineConfidenceSchema.catch("medium"),
  sources: z.array(IncomingSourceSchema).optional(),
});

const IncomingEventPatchSchema = z.object({
  dateLabel: z.string().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  confidence: TimelineConfidenceSchema.catch("medium").optional(),
  sources: z.array(IncomingSourceSchema).optional(),
});

const IncomingEventActionSchema = z.union([
  z.object({ type: z.literal("ADD_EVENT"), event: IncomingNewEventSchema }),
  z.object({ type: z.literal("UPDATE_EVENT"), id: z.string(), patch: IncomingEventPatchSchema }),
  z.object({ type: z.literal("DELETE_EVENT"), id: z.string() }),
]);

// --- Era action schemas ---

const IncomingNewEraSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  startLabel: z.string(),
  endLabel: z.string(),
  priority: z.number().optional(),
  bgClass: EraBgClassSchema.optional(),
});

const IncomingEraPatchSchema = z.object({
  title: z.string().optional(),
  startLabel: z.string().optional(),
  endLabel: z.string().optional(),
  priority: z.number().optional(),
  bgClass: EraBgClassSchema.optional(),
});

const IncomingEraActionSchema = z.union([
  z.object({ type: z.literal("ADD_ERA"), era: IncomingNewEraSchema }),
  z.object({ type: z.literal("UPDATE_ERA"), id: z.string(), patch: IncomingEraPatchSchema }),
  z.object({ type: z.literal("DELETE_ERA"), id: z.string() }),
]);

// --- Model reply schema ---

const ModelReplySchema = z.object({
  assistantMessage: z.string(),
  actions: z.array(IncomingEventActionSchema).default([]),
  eraActions: z.array(IncomingEraActionSchema).default([]),
});

const RequestSchema = z.object({
  messages: z.array(ChatMessageSchema).default([]),
  timelineSnapshot: TimelineSnapshotSchema.optional(),
});

function buildPrompt(args: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  timelineSnapshot: { events: unknown[]; eras: unknown[] };
}) {
  return `
You are a knowledgeable historical timeline assistant. Your job is to use your own historical knowledge to research topics and populate a timeline — you do NOT ask the user for dates or facts you already know.

When a user asks about a historical topic, immediately use your knowledge to add relevant events and eras to the timeline. Never ask the user "what year should I use?" or "can you provide a date?" — look it up yourself and emit the actions. If you are genuinely uncertain about a date, use your best estimate and set confidence to "low" or "medium".

Return ONLY valid JSON with this exact shape:
{
  "assistantMessage": string,
  "actions": Array,
  "eraActions": Array
}

━━━ EVENT ACTIONS (max 5 per response) ━━━
ADD_EVENT:    { "type": "ADD_EVENT",    "event": { "dateLabel": "YYYY or YYYY-MM-DD", "title": "...", "summary": "...", "confidence": "high"|"medium"|"low", "sources"?: [...] } }
UPDATE_EVENT: { "type": "UPDATE_EVENT", "id": "<existing id>", "patch": { title?, dateLabel?, summary?, confidence?, sources? } }
DELETE_EVENT: { "type": "DELETE_EVENT", "id": "<existing id>" }

━━━ ERA ACTIONS ━━━
Eras are named time periods that group events visually (e.g. "Roman Republic", "World War II", "Industrial Revolution").
Create eras proactively when events span a recognisable historical period. Keep eras non-overlapping when possible.
Use UPDATE_ERA to adjust date ranges as new events are added. Use DELETE_ERA if an era no longer makes sense.

ADD_ERA:    { "type": "ADD_ERA",    "era": { "title": "...", "startLabel": "YYYY", "endLabel": "YYYY", "bgClass": "<one of the allowed values>", "priority": <integer> } }
UPDATE_ERA: { "type": "UPDATE_ERA", "id": "<existing id>", "patch": { title?, startLabel?, endLabel?, bgClass?, priority? } }
DELETE_ERA: { "type": "DELETE_ERA", "id": "<existing id>" }

Allowed bgClass values (pick one that fits the mood of the era):
  "bg-amber-50"   → ancient / classical
  "bg-green-50"   → medieval / natural
  "bg-purple-50"  → imperial / renaissance
  "bg-blue-50"    → enlightenment / modern
  "bg-rose-50"    → conflict / revolution
  "bg-slate-50"   → contemporary / neutral

━━━ RULES ━━━
- Avoid duplicates: if an event already exists in timelineSnapshot use UPDATE_EVENT with the existing id.
- If an era already exists in timelineSnapshot use UPDATE_ERA — do not create a duplicate.
- dateLabel should be "YYYY-MM-DD" when known, otherwise "YYYY".
- Do not fabricate URLs. Omit the url field if unknown.
- If the user request is unreasonable (e.g. "all of history"), explain in assistantMessage and return empty arrays.
- Always return both "actions" and "eraActions" arrays (use [] when empty).

━━━ CONVERSATION ━━━
${JSON.stringify(args.messages, null, 2)}

━━━ CURRENT TIMELINE SNAPSHOT ━━━
${JSON.stringify(args.timelineSnapshot, null, 2)}
`.trim();
}

function normalizeEventActions(actions: z.infer<typeof IncomingEventActionSchema>[]) {
  const now = new Date().toISOString();
  return actions.slice(0, 5).map((a) => {
    if (a.type === "ADD_EVENT") {
      return {
        type: "ADD_EVENT" as const,
        event: {
          id: a.event.id ?? crypto.randomUUID(),
          dateLabel: a.event.dateLabel,
          title: a.event.title,
          summary: a.event.summary,
          confidence: a.event.confidence,
          sources: a.event.sources,
          createdAt: now,
          lastUpdatedAt: now,
        },
      };
    }
    return a;
  });
}

function normalizeEraActions(actions: z.infer<typeof IncomingEraActionSchema>[]) {
  return actions.map((a) => {
    if (a.type === "ADD_ERA") {
      return {
        type: "ADD_ERA" as const,
        era: {
          id: a.era.id ?? crypto.randomUUID(),
          title: a.era.title,
          startLabel: a.era.startLabel,
          endLabel: a.era.endLabel,
          priority: a.era.priority ?? 0,
          bgClass: a.era.bgClass,
        },
      };
    }
    return a;
  });
}

app.post("/chat", async (req, res) => {
  try {
    const parsedReq = RequestSchema.parse(req.body ?? {});
    const messages = parsedReq.messages;
    const timelineSnapshot = parsedReq.timelineSnapshot ?? { events: [], eras: [] };

    const prompt = buildPrompt({ messages, timelineSnapshot });

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });

    const text = result.response.text();
    const modelJson = ModelReplySchema.parse(JSON.parse(text));

    res.json({
      assistantMessage: modelJson.assistantMessage,
      actions: normalizeEventActions(modelJson.actions),
      eraActions: normalizeEraActions(modelJson.eraActions),
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({
      assistantMessage: "Server error",
      actions: [],
      eraActions: [],
    });
  }
});

app.listen(8787, () => {
  console.log("Local LLM bridge running on http://localhost:8787");
});
