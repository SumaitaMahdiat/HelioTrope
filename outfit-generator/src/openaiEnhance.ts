import type {
  ClosetImageInput,
  ClosetItemInput,
  GeneratedOutfit,
  OccasionTag,
} from "./types.js";

type GeminiPart =
  | { text: string }
  | {
      inlineData: {
        mimeType: string;
        data: string;
      };
    };

async function generateGeminiText(
  apiKey: string,
  system: string,
  parts: GeminiPart[]
): Promise<string> {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.68,
          maxOutputTokens: 320,
        },
      }),
    }
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(
      `Gemini API error (${response.status}): ${errBody || "request failed"}`
    );
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  return (
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join("\n")
      .trim() || ""
  );
}

function imageParts(images?: ClosetImageInput[]): GeminiPart[] {
  if (!images?.length) return [];
  const parts: GeminiPart[] = [
    {
      text:
        "Closet item images are attached below. Infer visible colors, fabric weight, formality, and fit silhouette where possible.",
    },
  ];
  for (const img of images) {
    parts.push({ text: `Item: ${img.name} (id:${img.itemId})` });
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.dataBase64,
      },
    });
  }
  return parts;
}

export async function explainOutfitWithAI(
  outfit: GeneratedOutfit,
  occasion: OccasionTag | undefined,
  apiKey: string,
  closetImages?: ClosetImageInput[]
): Promise<string> {
  const itemsDesc = outfit.items
    .map((i) => `${i.name} (${i.category}, ${i.color})`)
    .join("; ");
  const itemIds = new Set(outfit.items.map((i) => i.id));
  const matchingImages = closetImages?.filter((img) => itemIds.has(img.itemId));

  const system =
    "You are a concise fashion stylist for Bangladeshi buyers. Give 2-4 short sentences: why this outfit works, one tweak if needed.";
  const parts: GeminiPart[] = [
    {
      text: `Occasion: ${occasion ?? "unspecified"}. Outfit: ${itemsDesc}. Rule engine notes: ${outfit.ruleNotes.join(" ")}`,
    },
    ...imageParts(matchingImages),
  ];

  return generateGeminiText(apiKey, system, parts);
}

export async function aiSuggestFromCloset(
  closet: ClosetItemInput[],
  occasion: OccasionTag | undefined,
  apiKey: string,
  closetImages?: ClosetImageInput[]
): Promise<string> {
  const list = closet
    .map((c) => `- ${c.name} [${c.category}] ${c.color}${c.occasions?.length ? ` tags:${c.occasions.join(",")}` : ""}`)
    .join("\n");

  const system =
    "Suggest one practical outfit using only items from the user's list by name. If something is missing (e.g. shoes), say what category to add. Keep under 120 words.";
  const parts: GeminiPart[] = [
    {
      text: `Occasion: ${occasion ?? "general"}\nCloset:\n${list}`,
    },
    ...imageParts(closetImages),
  ];

  return generateGeminiText(apiKey, system, parts);
}
