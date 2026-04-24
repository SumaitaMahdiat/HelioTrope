import type { ChatMessage, ChatRequest } from "./types.js";

function buildSystemPrompt(
  closet?: ChatRequest["closet"],
  context?: ChatRequest["context"],
): string {
  let base =
    "You are Heliotrope's AI fashion assistant for buyers in Bangladesh. " +
    "Give practical, respectful styling advice. Reference local occasions (eid, weddings, Pohela Boishakh) when relevant. " +
    "If a digital closet is provided, prefer suggesting combinations using those items by name; say what is missing if the user asks for a full look and something is not in the closet. " +
    "Keep answers concise unless the user asks for detail.";

  if (context?.city) base += ` User city hint: ${context.city}.`;
  if (context?.season) base += ` Season: ${context.season}.`;

  if (closet?.length) {
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

  base += "\n\nNote: No image analysis available; use text descriptions only.";

  return base;
}

export async function runFashionChat(
  req: ChatRequest,
  apiKey: string,
): Promise<{ reply: string; model: string }> {
  const system = buildSystemPrompt(req.closet, req.context);
  const model = process.env.GROQ_MODEL || "llama3.1-8b-instant";

  // Build OpenAI-compatible messages
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [{ role: "system" as const, content: system }];

  // Add conversation, ignoring images (Groq text-only)
  for (const m of req.messages.filter((m) => m.role !== "system")) {
    messages.push({
      role: m.role as "user" | "assistant",
      content: m.content,
    });
  }

  const response = await fetch(
    `https://api.groq.com/openai/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.75,
        max_tokens: 600,
      }),
    },
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(
      `Groq API error (${response.status}): ${errBody || "request failed"}`,
    );
  }

  const data = (await response.json()) as {
    choices: Array<{
      message: { content?: string };
    }>;
  };

  const reply = data.choices[0]?.message?.content?.trim() || "";

  return { reply, model: `groq-${model}` };
}
