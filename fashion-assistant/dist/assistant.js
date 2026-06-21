function buildSystemPrompt(closet, context) {
    let base = "You are Heliotrope's AI fashion assistant for buyers in Bangladesh. " +
        "Give practical, respectful styling advice. Reference local occasions (eid, weddings, Pohela Boishakh) when relevant. " +
        "If a digital closet is provided, prefer suggesting combinations using those items by name; say what is missing if the user asks for a full look and something is not in the closet. " +
        "Keep answers concise unless the user asks for detail.";
    base +=
        "\n\nOutput format must be exactly this structure:" +
            "\nPrimary Look: <one short paragraph>" +
            "\nAlternative Look: <one short paragraph>" +
            "\nAccessories and Footwear: <one short paragraph>" +
            "\nNotes: <one short paragraph>.";
    base +=
        "\n\nHard styling rules:" +
            "\n- Use exactly one base outfit per look." +
            "\n- A base outfit is either one full-piece garment (dress/abaya/gown/jumpsuit) OR a top+bottom/set." +
            "\n- Never combine two base outfits in the same look (example: do not pair a dress with another full set)." +
            "\n- If another base garment is relevant, place it only in Alternative Look." +
            "\n- Do not invent item IDs. If an ID is unknown, omit it.";
    if (context?.city)
        base += ` User city hint: ${context.city}.`;
    if (context?.season)
        base += ` Season: ${context.season}.`;
    if (closet?.length) {
        const lines = closet
            .map((c) => `- ${c.name} (${c.category})${c.color ? ` color:${c.color}` : ""}${c.brand ? ` brand:${c.brand}` : ""}${c.occasions?.length ? ` occasions:${c.occasions.join(",")}` : ""}${c.hasImage ? " hasImage:true" : ""}`)
            .join("\n");
        base += `\n\nUser's digital closet:\n${lines}`;
    }
    else {
        base +=
            "\n\nNo closet items were sent; give general advice and ask what they own if needed.";
    }
    base += "\n\nNote: No image analysis available; use text descriptions only.";
    return base;
}
export async function runFashionChat(req, apiKey) {
    const system = buildSystemPrompt(req.closet, req.context);
    const model = process.env.GROQ_MODEL || "llama3.1-8b-instant";
    // Build OpenAI-compatible messages
    const messages = [{ role: "system", content: system }];
    // Add conversation, ignoring images (Groq text-only)
    for (const m of req.messages.filter((m) => m.role !== "system")) {
        messages.push({
            role: m.role,
            content: m.content,
        });
    }
    const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
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
    });
    if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        throw new Error(`Groq API error (${response.status}): ${errBody || "request failed"}`);
    }
    const data = (await response.json());
    const reply = data.choices[0]?.message?.content?.trim() || "";
    return { reply, model: `groq-${model}` };
}
