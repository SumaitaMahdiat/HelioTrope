import "dotenv/config";
import cors from "cors";
import express from "express";
import { generateOutfitCombinations } from "./rulesEngine.js";
import { explainOutfitWithAI } from "./aiEnhance.js";
import type {
  ClosetItemInput,
  GenerateRequest,
  OccasionTag,
  OutfitStyle,
  WardrobeCategory,
} from "./types.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT) || 3001;
const VALID_CATEGORIES = new Set<WardrobeCategory>([
  "top",
  "bottom",
  "dress",
  "outerwear",
  "shoes",
  "accessories",
  "bag",
  "glasses",
  "makeup",
]);
const VALID_OCCASIONS = new Set<OccasionTag>([
  "casual",
  "work",
  "formal",
  "party",
  "wedding",
  "eid",
  "sports",
  "travel",
]);
const VALID_STYLES = new Set<OutfitStyle>(["classic", "clueless"]);
const SAMPLE_CLOSET: ClosetItemInput[] = [
  {
    id: "s1",
    name: "White Cotton Shirt",
    category: "top",
    color: "white",
    occasions: ["casual", "work"],
  },
  {
    id: "s2",
    name: "Navy Wide-Leg Pants",
    category: "bottom",
    color: "navy",
    occasions: ["work", "formal"],
  },
  {
    id: "s3",
    name: "Black Abaya Dress",
    category: "dress",
    color: "black",
    occasions: ["formal", "eid"],
  },
  {
    id: "s4",
    name: "Beige Blazer",
    category: "outerwear",
    color: "beige",
    occasions: ["work"],
  },
  {
    id: "s5",
    name: "White Sneakers",
    category: "shoes",
    color: "white",
    occasions: ["casual", "travel"],
  },
  {
    id: "s6",
    name: "Tan Handbag",
    category: "bag",
    color: "tan",
    occasions: ["work", "travel"],
  },
  {
    id: "s7",
    name: "Gold Earrings",
    category: "accessories",
    color: "gold",
    occasions: ["party", "eid"],
  },
];

function validateCloset(closet: ClosetItemInput[]) {
  if (!Array.isArray(closet) || closet.length === 0)
    return "closet must be a non-empty array.";
  for (const item of closet) {
    if (!item?.id || !item?.name || !item?.category || !item?.color) {
      return "Each closet item must include id, name, category, and color.";
    }
    if (!VALID_CATEGORIES.has(item.category)) {
      return `Invalid category "${item.category}" for item "${item.name}".`;
    }
    if (item.occasions?.some((o) => !VALID_OCCASIONS.has(o))) {
      return `Invalid occasion tag in item "${item.name}".`;
    }
  }
  return null;
}

app.post("/api/outfits/generate", async (req, res) => {
  try {
    const body = req.body as GenerateRequest;
    if (!body?.closet || !Array.isArray(body.closet)) {
      res
        .status(400)
        .json({ error: "Expected body.closet as an array of items." });
      return;
    }
    if (body.occasion && !VALID_OCCASIONS.has(body.occasion)) {
      res.status(400).json({
        error: `Invalid occasion. Use one of: ${Array.from(VALID_OCCASIONS).join(", ")}`,
      });
      return;
    }
    if (body.style && !VALID_STYLES.has(body.style)) {
      res.status(400).json({
        error: `Invalid style. Use one of: ${Array.from(VALID_STYLES).join(", ")}`,
      });
      return;
    }
    const validationError = validateCloset(body.closet);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const outfits = generateOutfitCombinations(
      body.closet,
      body.occasion,
      15,
      body.style ?? "classic",
    );
    const top = outfits[0] ?? null;

    const key = process.env.OPENROUTER_API_KEY;
    let aiExplanation: string | undefined;

    if (body.useAI && key && top) {
      try {
        aiExplanation = await explainOutfitWithAI(
          top,
          body.occasion,
          key,
          body.closetImages,
        );
      } catch (e) {
        aiExplanation = `[OpenRouter error] ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    res.json({
      occasion: body.occasion ?? null,
      outfits,
      best: top,
      ai: {
        explanation: aiExplanation,
        enabled: Boolean(body.useAI && key),
      },
    });
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : "Generation failed",
    });
  }
});

app.get("/api/outfits/sample-closet", (_req, res) => {
  res.json({ closet: SAMPLE_CLOSET });
});

app.post("/api/outfits/generate/sample", async (req, res) => {
  try {
    const occasion = req.body?.occasion as OccasionTag | undefined;
    const useAI = Boolean(req.body?.useAI);
    if (occasion && !VALID_OCCASIONS.has(occasion)) {
      res.status(400).json({
        error: `Invalid occasion. Use one of: ${Array.from(VALID_OCCASIONS).join(", ")}`,
      });
      return;
    }
    const outfits = generateOutfitCombinations(SAMPLE_CLOSET, occasion, 10);
    const best = outfits[0] ?? null;
    const key = process.env.OPENROUTER_API_KEY;
    let explanation: string | undefined;
    if (useAI && key && best) {
      try {
        explanation = await explainOutfitWithAI(best, occasion, key);
      } catch (e) {
        explanation = `[OpenRouter error] ${e instanceof Error ? e.message : String(e)}`;
      }
    }
    res.json({
      occasion: occasion ?? null,
      outfits,
      best,
      ai: {
        explanation,
        enabled: Boolean(useAI && key),
      },
    });
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : "Sample generation failed",
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, feature: "outfit-generator" });
});

app.listen(PORT, () => {
  console.log(`[outfit-generator] http://localhost:${PORT}`);
});
