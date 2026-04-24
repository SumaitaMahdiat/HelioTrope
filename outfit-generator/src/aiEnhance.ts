import type {
  ClosetImageInput,
  GeneratedOutfit,
  OccasionTag,
} from "./types.js";

async function generateOpenRouterText(
  apiKey: string,
  system: string,
  userPrompt: string,
): Promise<string> {
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
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.68,
        max_tokens: 320,
      }),
    },
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(
      `OpenRouter API error (${response.status}): ${errBody || "request failed"}`,
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function explainOutfitWithAI(
  outfit: GeneratedOutfit,
  occasion: OccasionTag | undefined,
  apiKey: string,
  closetImages?: ClosetImageInput[],
): Promise<string> {
  const itemsDesc = outfit.items
    .map((i) => `${i.name} (${i.category}, ${i.color})`)
    .join("; ");

  const system =
    "You are a concise fashion stylist for Bangladeshi buyers. Give 2-4 short sentences: why this outfit works, one tweak if needed.";
  const imageHint = closetImages?.length
    ? "Closet images were provided but this explanation is text-only."
    : "No closet images were provided.";
  const userPrompt = `Occasion: ${occasion ?? "unspecified"}. Outfit: ${itemsDesc}. Rule engine notes: ${outfit.ruleNotes.join(" ")} ${imageHint}`;

  return generateOpenRouterText(apiKey, system, userPrompt);
}
