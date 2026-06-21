import "dotenv/config";
import cors from "cors";
import express from "express";
import { runFashionChat } from "./assistant.js";
import type { ChatRequest } from "./types.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT) || 3002;

function buildDemoReply(prompt: string) {
  const p = prompt.toLowerCase();
  if (p.includes("eid")) {
    return (
      "For an Eid dinner, go for a polished but comfortable look: a black or deep-navy base with one warm accent (gold/tan). " +
      "If you have a kurti or a simple dress, pair it with neutral shoes and one statement accessory. " +
      "If you tell me what colors you own, I’ll tailor the exact combo."
    );
  }
  if (p.includes("black jeans") || p.includes("black jean")) {
    return (
      "Black jeans are super flexible: try a white/cream top for contrast, then add a neutral shoe and one accent (gold bag/earrings). " +
      "For a dressier vibe, add an outer layer like a blazer or long shrug."
    );
  }
  return (
    "Tell me the occasion, your comfort level (modest/regular), and 3–5 items you own (colors + type). " +
    "I’ll suggest one complete outfit and one alternative with small tweaks."
  );
}

app.post("/api/assistant/chat", async (req, res) => {
  const forwardedKey = req.header("x-groq-api-key");
  const key = forwardedKey || process.env.GROQ_API_KEY;
  if (!key) {
    res.status(503).json({
      error: "GROQ_API_KEY is not configured for fashion-assistant.",
    });
    return;
  }

  const body = req.body as ChatRequest;
  if (!body?.messages?.length) {
    res
      .status(400)
      .json({ error: "Expected messages array with at least one entry." });
    return;
  }
  if (body.messages.some((m) => !m?.role || !m?.content)) {
    res
      .status(400)
      .json({ error: "Each message must include role and content." });
    return;
  }

  try {
    const result = await runFashionChat(body, key);
    res.json({ assistant: result.reply, model: result.model });
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : "Chat failed",
    });
  }
});

/** Demo-safe endpoint that does not require an API key (for presentation before keys are configured). */
app.post("/api/assistant/chat/demo", (req, res) => {
  const body = req.body as ChatRequest;
  const lastUser =
    body?.messages
      ?.slice()
      .reverse()
      .find((m) => m?.role === "user")?.content ?? "Help me pick an outfit.";
  res.json({
    assistant: buildDemoReply(String(lastUser)),
    model: "demo",
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, feature: "fashion-assistant" });
});

app.listen(PORT, () => {
  console.log(`[fashion-assistant] http://localhost:${PORT}`);
});
