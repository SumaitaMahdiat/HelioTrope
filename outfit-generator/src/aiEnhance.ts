import type {
  ClosetImageInput,
  GeneratedOutfit,
  OccasionTag,
} from "./types.js";

async function generateOpenRouterText(
  apiKey: string,
  system: string,
  userPrompt: string,
  closetImages?: ClosetImageInput[],
): Promise<string> {
  const defaultModel =
    process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct";
  const visionModel = process.env.OPENROUTER_VISION_MODEL || defaultModel;

  const buildBody = (modelName: string, includeImages: boolean) => ({
    model: modelName,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content:
          includeImages && closetImages?.length
            ? [
                {
                  type: "text",
                  text: `${userPrompt} Analyze the attached closet images as visual evidence before finalizing your explanation.`,
                },
                ...closetImages.map((image) => ({
                  type: "image_url",
                  image_url: {
                    url: `data:${image.mimeType};base64,${image.dataBase64}`,
                  },
                })),
              ]
            : userPrompt,
      },
    ],
    temperature: 0.68,
    max_tokens: 320,
  });

  const runCompletion = (body: ReturnType<typeof buildBody>) =>
    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

  let usedVisionInput = Boolean(closetImages?.length);
  let response = await runCompletion(
    buildBody(usedVisionInput ? visionModel : defaultModel, usedVisionInput),
  );

  if (!response.ok && usedVisionInput) {
    const errBody = await response.text().catch(() => "");
    const imageNotSupported =
      response.status === 404 &&
      /no endpoints found that support image input|support image input/i.test(
        errBody,
      );

    if (imageNotSupported) {
      usedVisionInput = false;
      response = await runCompletion(buildBody(defaultModel, false));
    } else {
      throw new Error(
        `OpenRouter API error (${response.status}): ${errBody || "request failed"}`,
      );
    }
  }

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
    ? "Closet images were provided."
    : "No closet images were provided.";
  const userPrompt = `Occasion: ${occasion ?? "unspecified"}. Outfit: ${itemsDesc}. Rule engine notes: ${outfit.ruleNotes.join(" ")} ${imageHint}`;

  return generateOpenRouterText(apiKey, system, userPrompt, closetImages);
}
