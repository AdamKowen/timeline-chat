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

const TimelineEraSchema = z.object({
  id: z.string(),
  title: z.string(),
  startLabel: z.string(),
  endLabel: z.string(),
  priority: z.number().optional(),
  bgClass: z.string().optional(),
});

const TimelineSnapshotSchema = z.object({
  events: z.array(TimelineEventSchema).default([]),
  eras: z.array(TimelineEraSchema).default([]),
});

const IncomingNewEventSchema = z.object({
  id: z.string().optional(),
  dateLabel: z.string(),
  title: z.string(),
  summary: z.string(),
  confidence: TimelineConfidenceSchema,
  sources: z.array(TimelineSourceSchema).optional(),
});

const IncomingEventPatchSchema = z.object({
  dateLabel: z.string().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  confidence: TimelineConfidenceSchema.optional(),
  sources: z.array(TimelineSourceSchema).optional(),
});

const IncomingTimelineActionSchema = z.union([
  z.object({ type: z.literal("ADD_EVENT"), event: IncomingNewEventSchema }),
  z.object({ type: z.literal("UPDATE_EVENT"), id: z.string(), patch: IncomingEventPatchSchema }),
  z.object({ type: z.literal("DELETE_EVENT"), id: z.string() }),
]);

const ModelReplySchema = z.object({
  assistantMessage: z.string(),
  actions: z.array(IncomingTimelineActionSchema).default([]),
  eras: z.array(TimelineEraSchema).optional(),
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
You are a timeline assistant embedded in a chat UI.

Return ONLY valid JSON with this exact shape:
{
  "assistantMessage": string,
  "actions": Array,
  "eras"?: Array
}

Rules:
- actions must contain at most 5 items.
- Avoid duplicates: if an event already exists in timelineSnapshot, prefer UPDATE_EVENT using the existing id.
- If the user request is unreasonable (e.g., "all of history"), explain in assistantMessage and return actions: [].
- dateLabel should be "YYYY-MM-DD" when possible, otherwise "YYYY".
- confidence must be "high" | "medium" | "low".
- Do not fabricate URLs. If you do not know a URL, omit it.

Actions:
- ADD_EVENT: { "type": "ADD_EVENT", "event": { dateLabel, title, summary, confidence, sources? } }
- UPDATE_EVENT: { "type": "UPDATE_EVENT", "id": "<existing id>", "patch": { title?, dateLabel?, summary?, confidence?, sources? } }
- DELETE_EVENT: { "type": "DELETE_EVENT", "id": "<existing id>" }

Conversation:
${JSON.stringify(args.messages, null, 2)}

Current timeline snapshot:
${JSON.stringify(args.timelineSnapshot, null, 2)}
`.trim();
}

function normalizeActions(actions: z.infer<typeof IncomingTimelineActionSchema>[]) {
  const now = new Date().toISOString();
  const limited = actions.slice(0, 5);

  return limited.map((a) => {
    if (a.type === "ADD_EVENT") {
      const id = a.event.id ?? crypto.randomUUID();
      return {
        type: "ADD_EVENT" as const,
        event: {
          id,
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

    if (a.type === "UPDATE_EVENT") {
      return {
        type: "UPDATE_EVENT" as const,
        id: a.id,
        patch: a.patch,
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
    const actions = normalizeActions(modelJson.actions);

    res.json({
      assistantMessage: modelJson.assistantMessage,
      actions,
      eras: modelJson.eras,
    });
  } catch {
    res.status(500).json({
      assistantMessage: "Server error",
      actions: [],
      eras: [],
    });
  }
});

app.listen(8787, () => {
  console.log("Local LLM bridge running on http://localhost:8787");
});
