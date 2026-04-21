import express from "express";
import { ClosetItemModel } from "../models/ClosetItem.js";
import { authenticate } from "./authRoutes.js";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadRoot = path.join(__dirname, "..", "uploads");
const MAX_VISION_ITEMS = Number(process.env.AI_VISION_ITEMS || 4);
const MAX_IMAGE_BYTES = Number(
  process.env.AI_VISION_MAX_IMAGE_BYTES || 2_000_000,
);
const VALID_OUTFIT_OCCASIONS = new Set([
  "casual",
  "work",
  "formal",
  "party",
  "wedding",
  "eid",
  "sports",
  "travel",
]);

function inferClothesCategory(item) {
  const text = `${item.name || ""} ${item.notes || ""}`.toLowerCase();
  if (/(dress|abaya|gown|frock|jumpsuit)/.test(text)) return "dress";
  if (
    /(jacket|blazer|coat|hoodie|sweater|cardigan|shrug|outerwear)/.test(text)
  ) {
    return "outerwear";
  }
  if (/(pant|trouser|jeans|skirt|shorts|legging|palazzo|bottom)/.test(text)) {
    return "bottom";
  }
  return "top";
}

function toOutfitCategory(item) {
  if (item.type === "accessories") return "accessories";
  if (item.type === "bags") return "bag";
  if (item.type === "glasses") return "glasses";
  if (item.type === "shoes") return "shoes";
  if (item.type === "makeup") return "makeup";
  if (item.type === "clothes") return inferClothesCategory(item);
  return null;
}

function toOutfitClosetItems(closetItems) {
  return closetItems
    .map((item) => {
      const category = toOutfitCategory(item);
      if (!category) return null;
      return {
        id: String(item._id),
        name: item.name,
        category,
        color: item.colors?.[0] || "neutral",
        occasions: Array.isArray(item.occasions)
          ? item.occasions.filter((o) => VALID_OUTFIT_OCCASIONS.has(String(o)))
          : [],
        brand: item.brand || undefined,
      };
    })
    .filter(Boolean);
}

function mimeFromFileName(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

async function buildClosetVisionImages(items) {
  const candidates = items
    .filter(
      (item) =>
        typeof item.imageUrl === "string" &&
        item.imageUrl.startsWith("/uploads/"),
    )
    .slice(0, Math.max(0, MAX_VISION_ITEMS));

  const results = [];
  for (const item of candidates) {
    try {
      const fileName = item.imageUrl.replace("/uploads/", "");
      const filePath = path.join(uploadRoot, fileName);
      const file = await fs.readFile(filePath);
      if (file.length > MAX_IMAGE_BYTES) {
        continue;
      }

      results.push({
        itemId: String(item._id),
        name: item.name,
        mimeType: mimeFromFileName(fileName),
        dataBase64: file.toString("base64"),
      });
    } catch (e) {
      // Ignore unreadable files and continue with remaining images.
    }
  }
  return results;
}

function buildFashionSystemPrompt(closet = [], context = {}) {
  let base =
    "You are Heliotrope's AI fashion assistant for buyers in Bangladesh. " +
    "Give practical, respectful styling advice. Reference local occasions (eid, weddings, Pohela Boishakh) when relevant. " +
    "If a digital closet is provided, prefer suggesting combinations using those items by name; say what is missing if the user asks for a full look and something is not in the closet. " +
    "Keep answers concise unless the user asks for detail.";

  if (context.city) base += ` User city hint: ${context.city}.`;
  if (context.season) base += ` Season: ${context.season}.`;

  if (closet.length) {
    const lines = closet
      .map(
        (c) =>
          `- ${c.name} (${c.category})${c.color ? ` color:${c.color}` : ""}${c.brand ? ` brand:${c.brand}` : ""}${c.occasions?.length ? ` occasions:${c.occasions.join(",")}` : ""}${c.hasImage ? " hasImage:true" : ""}`,
      )
      .join("\n");
    base += `\n\nUser's digital closet:\n${lines}`;
  } else {
    base +=
      "\n\nNo closet items were sent; give general advice and ask what they own if needed.";
  }

  base +=
    "\n\nWhen closet images are provided, use them to infer visible colors, fabric weight, style formality, and item type before suggesting outfits.";

  return base;
}

function toOpenRouterMessages(messages, closetImages = []) {
  const conversation = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  if (closetImages.length) {
    const imageList = closetImages
      .map((image) => `${image.name} (id:${image.itemId})`)
      .join(", ");
    conversation.push({
      role: "user",
      content:
        "Closet images were provided for context. Treat these items as visually confirmed: " +
        imageList,
    });
  }
  return conversation;
}

function buildFashionFallbackReply(messages, closet = []) {
  const lastUserMessage =
    [...messages]
      .reverse()
      .find((m) => m && m.role === "user" && typeof m.content === "string")
      ?.content?.toLowerCase() || "";

  const closetNames = closet.map((item) => String(item.name || "")).join(", ");

  if (lastUserMessage.includes("green dress")) {
    return [
      "For a green dress, keep the rest clean and balanced:",
      "- Shoes: nude, beige, gold, or white",
      "- Bag: tan, cream, or a small metallic clutch",
      "- Jewelry: gold works best with green most of the time",
      "- Layer: a light beige or white outer layer if you need one",
      closetNames
        ? `If you have these closet items, I’d work them in first: ${closetNames}.`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (lastUserMessage.includes("black jeans")) {
    return (
      "Black jeans are easiest with a white, cream, or soft-colored top. " +
      "Add neutral shoes and one accent piece like gold jewelry or a small bag."
    );
  }

  return (
    "I’m temporarily rate-limited, but here’s the quick styling rule: start with the main item, match one neutral piece, " +
    "and add one accent color or accessory. If you share the occasion and what you already own, I can narrow it down further."
  );
}

async function runFashionChatDirect(payload) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      assistant:
        "OPENROUTER_API_KEY is not configured. Add it to the server environment to enable live fashion suggestions.",
      model: "demo",
    };
  }

  const model =
    process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct";
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: buildFashionSystemPrompt(payload.closet, payload.context),
          },
          ...toOpenRouterMessages(payload.messages, payload.closetImages),
        ],
        temperature: 0.75,
        max_tokens: 600,
      }),
    },
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    if (response.status === 429) {
      return {
        assistant: buildFashionFallbackReply(payload.messages, payload.closet),
        model: "fallback",
      };
    }

    throw new Error(
      `OpenRouter API error (${response.status}): ${errBody || "request failed"}`,
    );
  }

  const data = await response.json();
  const assistant = data?.choices?.[0]?.message?.content?.trim() || "";

  return { assistant, model };
}

// Every AI request must come from an authenticated user.
router.use(authenticate);

// Proxy the buyer's chat request to the separate fashion assistant service.
router.post("/ai-chat", async (req, res) => {
  try {
    // The AI assistant is intentionally limited to buyer accounts.
    if (req.user.role !== "buyer") {
      res.status(403).json({ error: "AI fashion assistant is buyer-only." });
      return;
    }

    const userId = req.user.id;

    // The assistant expects a non-empty message history.
    if (!Array.isArray(req.body?.messages) || req.body.messages.length === 0) {
      res.status(400).json({ error: "messages array is required." });
      return;
    }

    // Include the user's closet so responses can be personalized.
    const closetItems = await ClosetItemModel.find({ userId })
      .select("name type colors brand occasions imageUrl")
      .lean();

    const closetImages = await buildClosetVisionImages(closetItems);

    // Trim each closet item down to the fields needed by the assistant.
    const closet = closetItems.map((item) => ({
      id: item._id,
      name: item.name,
      category: item.type,
      color: item.colors?.[0] || undefined,
      brand: item.brand,
      occasions: item.occasions || [],
      hasImage: Boolean(item.imageUrl),
    }));

    const payload = {
      messages: req.body.messages,
      closet,
      closetImages,
      context: req.body.context || { season: "summer" },
    };
    try {
      const data = await runFashionChatDirect(payload);
      res.json(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI request failed";
      res.status(500).json({ error: message });
    }
  } catch (error) {
    // error logged by morgan
    res.status(502).json({
      error:
        error instanceof Error ? error.message : "AI service is unreachable.",
    });
  }
});

// Proxy outfit generation while auto-building closet + image inputs from the signed-in buyer's wardrobe.
router.post("/outfits/generate", async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      res.status(403).json({ error: "Outfit generator is buyer-only." });
      return;
    }

    const userId = req.user.id;
    const requestedOccasion = req.body?.occasion;
    if (
      requestedOccasion &&
      !VALID_OUTFIT_OCCASIONS.has(String(requestedOccasion))
    ) {
      res.status(400).json({
        error: `Invalid occasion. Use one of: ${Array.from(
          VALID_OUTFIT_OCCASIONS,
        ).join(", ")}`,
      });
      return;
    }

    const closetItems = await ClosetItemModel.find({ userId })
      .select("name type colors brand occasions imageUrl notes")
      .lean();

    const closet = toOutfitClosetItems(closetItems);
    if (!closet.length) {
      res.status(400).json({
        error:
          "No compatible closet items found. Add clothes/shoes/accessories first.",
      });
      return;
    }

    const closetImages = await buildClosetVisionImages(closetItems);

    const payload = {
      occasion: requestedOccasion || undefined,
      useAI: Boolean(req.body?.useAI),
      closet,
      closetImages,
    };

    const proxyRes = await fetch("http://localhost:3001/api/outfits/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!proxyRes.ok) {
      const serviceError = await proxyRes.json().catch(() => ({}));
      res.status(proxyRes.status).json({
        error: serviceError?.error || "Outfit generator service error",
      });
      return;
    }

    const data = await proxyRes.json();
    res.json({
      ...data,
      source: {
        closetCount: closet.length,
        closetImageCount: closetImages.length,
      },
    });
  } catch (error) {
    console.error("Outfit generation proxy error:", error);
    res.status(502).json({
      error:
        "Outfit generator is unreachable. Start outfit-generator service on port 3001.",
    });
  }
});

export default router;
