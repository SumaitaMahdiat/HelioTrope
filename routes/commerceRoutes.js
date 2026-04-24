import express from "express";
import mongoose from "mongoose";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { authenticate } from "./authRoutes.js";
import { ClosetItemModel } from "../models/ClosetItem.js";
import { UserModel } from "../models/User.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadRoot = path.join(__dirname, "..", "uploads");
const MAX_VISION_ITEMS = Number(process.env.AI_VISION_ITEMS || 4);
const MAX_IMAGE_BYTES = Number(
  process.env.AI_VISION_MAX_IMAGE_BYTES || 2_000_000,
);
const DUMMYJSON_URL = "https://dummyjson.com";

const dummyJsonCache = new Map();

async function fetchDummyJsonProducts({ category, q, limit = 24, skip = 0 }) {
  const cacheKey = JSON.stringify({ category, q, limit, skip });
  if (dummyJsonCache.has(cacheKey)) {
    return dummyJsonCache.get(cacheKey);
  }

  const searchParams = new URLSearchParams();
  if (q) searchParams.set("q", q);
  searchParams.set("limit", limit.toString());
  searchParams.set("skip", skip.toString());

  let url;
  if (category) {
    url = `${DUMMYJSON_URL}/products/category/${category}?${searchParams}`;
  } else if (q) {
    url = `${DUMMYJSON_URL}/products/search?${searchParams}`;
  } else {
    url = `${DUMMYJSON_URL}/products?${searchParams}`;
  }

  const response = await fetch(url);
  const data = await response.json();

  let products = data.products || [];

  // Food filtering: if category=groceries, include; else exclude groceries
  if (category !== "groceries") {
    products = products.filter((p) => p.category !== "groceries");
  }

  const mapped = products
    .map((p) => ({
      _id: `dummy_${p.id}`,
      id: `dummy_${p.id}`,
      name: p.title,
      type: "clothes",
      colors: [],
      brand: p.brand || null,
      occasions: [],
      imageUrl: p.images?.[0] || p.thumbnail,
      notes: p.description,
      userId: "dummyjson",
      sellerName: "DummyJSON Marketplace",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
    .map(toPublicProduct); // Reuse existing mapper

  dummyJsonCache.set(cacheKey, mapped);
  setTimeout(() => dummyJsonCache.delete(cacheKey), 5 * 60 * 1000); // 5min TTL

  return mapped;
}
const demoCartStore = new Map();
const VALID_OCCASIONS = new Set([
  "casual",
  "work",
  "formal",
  "party",
  "wedding",
  "eid",
  "sports",
  "travel",
]);

function buildFashionSystemPrompt(closet = [], context = {}) {
  let base =
    "You are Heliotrope's AI fashion assistant for buyers in Bangladesh. " +
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
    const textSummary =
      "Closet images were provided for context. Use these visuals to infer colors, fabrics, and style formality before suggesting outfits. Item references: " +
      closetImages
        .map((image) => `${image.name} (id:${image.itemId})`)
        .join(", ");
    const content = [
      {
        type: "text",
        text: textSummary,
      },
      ...closetImages.map((image) => ({
        type: "image_url",
        image_url: {
          url: `data:${image.mimeType};base64,${image.dataBase64}`,
        },
      })),
    ];
    conversation.push({
      role: "user",
      content,
    });
  }
  return conversation;
}

function buildSuggestionFallbackReply(
  selectedName,
  occasion,
  userCloset,
  shopOptions,
) {
  const closetNames = userCloset
    .slice(0, 4)
    .map((item) => item.name)
    .join(", ");
  const shopNames = shopOptions
    .slice(0, 3)
    .map((item) => item.name)
    .join(", ");

  return [
    `For ${selectedName}, I’d keep the outfit balanced and let the product be the focus.`,
    closetNames
      ? `Start with your closet items first: ${closetNames}.`
      : "Use a neutral base from your closet if possible.",
    shopNames
      ? `If you need to buy one extra piece, check these shop items: ${shopNames}.`
      : "",
    occasion
      ? `For ${occasion}, lean a little more polished and coordinated.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildRateLimitFallbackReply(messages) {
  const lastUser =
    [...messages]
      .reverse()
      .find((m) => m?.role === "user" && typeof m.content === "string")
      ?.content || "";

  return {
    assistant:
      lastUser ||
      "I’m rate-limited right now, but I can still help you style this item by combining it with neutral basics and one accent piece.",
    model: "fallback",
  };
}

async function runGeminiText({
  messages,
  closet = [],
  closetImages = [],
  context = {},
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      assistant:
        "OPENROUTER_API_KEY is not configured. Add it to the server environment to enable live fashion suggestions.",
      model: "demo",
    };
  }

  const defaultModel =
    process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct";
  const visionModel = process.env.OPENROUTER_VISION_MODEL || defaultModel;

  const buildBody = (modelName, includeImages) => ({
    model: modelName,
    messages: [
      {
        role: "system",
        content: buildFashionSystemPrompt(closet, context),
      },
      ...toOpenRouterMessages(messages, includeImages ? closetImages : []),
    ],
    temperature: 0.75,
    max_tokens: 600,
  });

  const runCompletion = (body) =>
    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

  let usedVisionInput = Boolean(closetImages?.length);
  let model = usedVisionInput ? visionModel : defaultModel;
  let response = await runCompletion(buildBody(model, usedVisionInput));

  if (!response.ok && usedVisionInput) {
    const errBody = await response.text().catch(() => "");
    const imageNotSupported =
      response.status === 404 &&
      /no endpoints found that support image input|support image input/i.test(
        errBody,
      );

    if (imageNotSupported) {
      usedVisionInput = false;
      model = defaultModel;
      response = await runCompletion(buildBody(model, false));
    } else {
      if (response.status === 429) {
        return buildRateLimitFallbackReply(messages);
      }

      throw new Error(
        `OpenRouter API error (${response.status}): ${errBody || "request failed"}`,
      );
    }
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    if (response.status === 429) {
      return buildRateLimitFallbackReply(messages);
    }

    throw new Error(
      `OpenRouter API error (${response.status}): ${errBody || "request failed"}`,
    );
  }

  const data = await response.json();
  const assistant = data?.choices?.[0]?.message?.content?.trim() || "";

  return { assistant, model };
}

function normalizeColor(color) {
  return String(color || "")
    .toLowerCase()
    .trim();
}

function isDummyJsonProductId(productId) {
  return !mongoose.isValidObjectId(productId);
}

async function fetchDummyJsonProduct(productId) {
  const response = await fetch(
    `${DUMMYJSON_URL}/products/${encodeURIComponent(productId)}`,
  );
  if (!response.ok) {
    return null;
  }

  const product = await response.json();
  if (!product || typeof product !== "object" || !product.id) {
    return null;
  }

  return {
    _id: String(product.id),
    name: String(product.title || "Untitled Product"),
    type: "clothes",
    colors: [],
    brand: product.brand || "DummyJSON",
    occasions: [],
    imageUrl:
      Array.isArray(product.images) && product.images.length
        ? product.images[0]
        : product.thumbnail || "",
    notes: product.description || "",
    userId: "dummyjson",
    sellerName: "DummyJSON",
  };
}

async function resolveCartProduct(productId) {
  if (!productId) return null;

  if (!isDummyJsonProductId(productId)) {
    const product = await ClosetItemModel.findById(productId)
      .select("name type colors brand occasions imageUrl notes userId")
      .lean();
    if (!product) return null;
    return product;
  }

  return fetchDummyJsonProduct(productId);
}

async function resolveCartProducts(productIds) {
  const uniqueIds = Array.from(new Set(productIds.map((id) => String(id))));
  const records = await Promise.all(
    uniqueIds.map((id) => resolveCartProduct(id)),
  );
  return new Map(
    records.filter(Boolean).map((product) => [String(product._id), product]),
  );
}

function buildClosetItemFromProduct(product, userId) {
  return {
    userId: String(userId),
    name: product.name,
    type: product.type || "clothes",
    colors: Array.isArray(product.colors) ? product.colors : [],
    brand: product.brand || undefined,
    occasions: Array.isArray(product.occasions) ? product.occasions : [],
    imageUrl: product.imageUrl || undefined,
    notes: product.notes
      ? `${product.notes} (Purchased item)`
      : "Purchased item",
  };
}

function occasionBoost(item, occasion) {
  if (!occasion || !Array.isArray(item?.occasions)) return 0;
  return item.occasions.includes(occasion) ? 12 : -4;
}

function styleRank(selected, candidate, occasion) {
  let score = 0;
  const selectedColor = normalizeColor(selected.colors?.[0] || "neutral");
  const candidateColor = normalizeColor(candidate.colors?.[0] || "neutral");
  const neutrals = new Set([
    "black",
    "white",
    "gray",
    "grey",
    "beige",
    "cream",
    "tan",
    "navy",
  ]);

  if (selectedColor === candidateColor) score += 18;
  if (neutrals.has(selectedColor) || neutrals.has(candidateColor)) score += 9;
  if (candidate.brand && selected.brand && candidate.brand === selected.brand) {
    score += 5;
  }
  score += occasionBoost(candidate, occasion);
  return score;
}

function pickBestByCategory(pool, category, selected, occasion) {
  const matches = pool.filter((item) => toOutfitCategory(item) === category);
  if (!matches.length) return null;
  matches.sort(
    (a, b) =>
      styleRank(selected, b, occasion) - styleRank(selected, a, occasion),
  );
  return matches[0];
}

function simpleOutfitChoice(
  selected,
  userCloset,
  shopOptions,
  occasion,
  style = "classic",
) {
  const selectedCategory = toOutfitCategory(selected);
  const pool = [...userCloset, ...shopOptions];
  const pieces = [selected];
  const pickedIds = new Set([String(selected._id)]);
  const notes = [
    "Selected product anchored the outfit.",
    "Closet-first picks were prioritized before marketplace additions.",
  ];

  const tryAdd = (category) => {
    const best = pickBestByCategory(
      pool.filter((item) => !pickedIds.has(String(item._id))),
      category,
      selected,
      occasion,
    );
    if (!best) return;
    pieces.push(best);
    pickedIds.add(String(best._id));
  };

  if (selectedCategory === "dress") {
    tryAdd("outerwear");
    tryAdd("shoes");
    tryAdd(style === "clueless" ? "bag" : "accessories");
  } else {
    if (selectedCategory !== "top") tryAdd("top");
    if (selectedCategory !== "bottom") tryAdd("bottom");
    tryAdd("outerwear");
    tryAdd("shoes");
    tryAdd(style === "clueless" ? "bag" : "accessories");
  }

  const categories = new Set(pieces.map((item) => toOutfitCategory(item)));
  let score = 78;

  if (
    categories.has("dress") ||
    (categories.has("top") && categories.has("bottom"))
  ) {
    score += 14;
    notes.push(
      "Look structure completed: dress or top/bottom pairing present.",
    );
  }
  if (categories.has("shoes")) score += 8;
  if (categories.has("outerwear")) score += 7;
  if (style === "clueless") {
    if (categories.has("bag")) score += 6;
    notes.push(
      "Clueless mode: polished, coordinated layering was prioritized.",
    );
  }

  return {
    items: pieces.map((item) => ({
      id: String(item._id),
      name: item.name,
      category: toOutfitCategory(item) || item.type,
      color: item.colors?.[0] || "neutral",
    })),
    score,
    ruleNotes: notes,
  };
}

function toPublicProduct(doc, sellerMap = new Map()) {
  return {
    id: String(doc._id),
    sellerId: String(doc.userId),
    sellerName: doc.sellerName || sellerMap.get(String(doc.userId)) || "Seller",
    name: doc.name,
    type: doc.type,
    colors: Array.isArray(doc.colors) ? doc.colors : [],
    brand: doc.brand || null,
    occasions: Array.isArray(doc.occasions) ? doc.occasions : [],
    imageUrl: doc.imageUrl || null,
    notes: doc.notes || null,
    platform: doc.platform || null,
    sourcePermalink: doc.sourcePermalink || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

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

function mimeFromFileName(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

async function buildVisionImages(items) {
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
      if (file.length > MAX_IMAGE_BYTES) continue;
      results.push({
        itemId: String(item._id),
        name: item.name,
        mimeType: mimeFromFileName(fileName),
        dataBase64: file.toString("base64"),
      });
    } catch {
      // Ignore unreadable image files and continue.
    }
  }
  return results;
}

async function getBuyerCartSnapshot(userId) {
  const id = String(userId);
  let cart = [];

  if (mongoose.isValidObjectId(id)) {
    const user = await UserModel.findById(id).select("cart").lean();
    cart = Array.isArray(user?.cart) ? user.cart : [];
  } else {
    cart = Array.isArray(demoCartStore.get(id)) ? demoCartStore.get(id) : [];
  }

  const productMap = await resolveCartProducts(
    cart.map((line) => line.productId),
  );
  const sellerIds = Array.from(
    new Set(
      Array.from(productMap.values())
        .map((p) => p.userId)
        .filter((id) => id && id !== "dummyjson")
        .map((id) => String(id)),
    ),
  );
  const sellers = sellerIds.length
    ? await UserModel.find({ _id: { $in: sellerIds } })
        .select("name")
        .lean()
    : [];
  const sellerMap = new Map(sellers.map((s) => [String(s._id), s.name]));

  const items = cart
    .map((line) => {
      const product = productMap.get(String(line.productId));
      if (!product) return null;
      return {
        product: toPublicProduct(product, sellerMap),
        quantity: Math.max(1, Number(line.quantity) || 1),
        addedAt: line.addedAt || null,
      };
    })
    .filter(Boolean);

  return {
    items,
    totalItems: items.reduce((sum, row) => sum + row.quantity, 0),
  };
}

router.use(authenticate);

router.get("/products", async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      res.status(403).json({ error: "Marketplace is buyer-only." });
      return;
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;
    const type = req.query.type ? String(req.query.type) : null;
    const category = req.query.category
      ? String(req.query.category).toLowerCase().trim()
      : null;
    const q = req.query.q ? String(req.query.q).trim() : "";

    // Seller products filter (existing)
    const sellerFilter = { userId: { $ne: req.user.id } };
    if (type) sellerFilter.type = type;
    if (q) {
      sellerFilter.$or = [
        { name: { $regex: q, $options: "i" } },
        { brand: { $regex: q, $options: "i" } },
        { notes: { $regex: q, $options: "i" } },
      ];
    }

    // Fetch seller + DummyJSON in parallel
    const [sellerDocs, dummyProds] = await Promise.all([
      ClosetItemModel.find(sellerFilter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      fetchDummyJsonProducts({ category, q, limit, skip }),
    ]);

    const sellerIds = Array.from(
      new Set(sellerDocs.map((p) => String(p.userId))),
    );
    const sellers = sellerIds.length
      ? await UserModel.find({ _id: { $in: sellerIds } })
          .select("name")
          .lean()
      : [];
    const sellerMap = new Map(sellers.map((s) => [String(s._id), s.name]));

    const sellerProds = sellerDocs.map((p) => toPublicProduct(p, sellerMap));

    // Merge seller first, then DummyJSON
    const allProducts = [...sellerProds, ...dummyProds];

    res.json({
      products: allProducts.slice(0, limit), // Ensure total limit
      pagination: {
        page,
        limit,
        hasMore: allProducts.length === limit || dummyProds.length === limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load marketplace products." });
  }
});

router.get("/cart", async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      res.status(403).json({ error: "Cart is buyer-only." });
      return;
    }
    const snapshot = await getBuyerCartSnapshot(req.user.id);
    // Cart must always reflect latest mutations (add/remove/checkout).
    res.setHeader("Cache-Control", "no-store");
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ error: "Failed to load cart." });
  }
});

router.post("/cart", async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      res.status(403).json({ error: "Cart is buyer-only." });
      return;
    }

    const productId = String(req.body?.productId || "").trim();
    const quantity = Math.max(1, Number(req.body?.quantity) || 1);
    if (!productId) {
      res.status(400).json({ error: "productId is required." });
      return;
    }

    const product = await resolveCartProduct(productId);
    if (!product || String(product.userId) === String(req.user.id)) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    const buyerId = String(req.user.id);
    if (mongoose.isValidObjectId(buyerId)) {
      await UserModel.updateOne(
        { _id: buyerId, "cart.productId": productId },
        {
          $set: {
            "cart.$.quantity": quantity,
            "cart.$.addedAt": new Date(),
          },
        },
      );

      const userAfterFirstUpdate = await UserModel.findById(buyerId)
        .select("cart")
        .lean();
      const exists = Array.isArray(userAfterFirstUpdate?.cart)
        ? userAfterFirstUpdate.cart.some(
            (line) => String(line.productId) === productId,
          )
        : false;

      if (!exists) {
        await UserModel.updateOne(
          { _id: buyerId },
          {
            $push: {
              cart: {
                productId,
                quantity,
                addedAt: new Date(),
              },
            },
          },
        );
      }
    } else {
      const existing = Array.isArray(demoCartStore.get(buyerId))
        ? demoCartStore.get(buyerId)
        : [];
      const idx = existing.findIndex(
        (line) => String(line.productId) === productId,
      );
      if (idx >= 0) {
        existing[idx] = {
          ...existing[idx],
          quantity,
          addedAt: new Date(),
        };
      } else {
        existing.push({
          productId,
          quantity,
          addedAt: new Date(),
        });
      }
      demoCartStore.set(buyerId, existing);
    }

    const snapshot = await getBuyerCartSnapshot(req.user.id);
    res.status(201).json(snapshot);
  } catch (error) {
    res.status(500).json({ error: "Failed to update cart." });
  }
});

router.delete("/cart/:productId", async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      res.status(403).json({ error: "Cart is buyer-only." });
      return;
    }

    const buyerId = String(req.user.id);
    if (mongoose.isValidObjectId(buyerId)) {
      await UserModel.updateOne(
        { _id: buyerId },
        { $pull: { cart: { productId: req.params.productId } } },
      );
    } else {
      const existing = Array.isArray(demoCartStore.get(buyerId))
        ? demoCartStore.get(buyerId)
        : [];
      const filtered = existing.filter(
        (line) => String(line.productId) !== String(req.params.productId),
      );
      demoCartStore.set(buyerId, filtered);
    }

    const snapshot = await getBuyerCartSnapshot(req.user.id);
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ error: "Failed to remove cart item." });
  }
});

router.post("/checkout", async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      res.status(403).json({ error: "Checkout is buyer-only." });
      return;
    }

    const buyerId = String(req.user.id);
    let cart = [];
    if (mongoose.isValidObjectId(buyerId)) {
      const user = await UserModel.findById(buyerId).select("cart").lean();
      cart = Array.isArray(user?.cart) ? user.cart : [];
    } else {
      cart = Array.isArray(demoCartStore.get(buyerId))
        ? demoCartStore.get(buyerId)
        : [];
    }
    if (!cart.length) {
      res.status(400).json({ error: "Cart is empty." });
      return;
    }

    const productMap = await resolveCartProducts(
      cart.map((line) => line.productId),
    );
    const purchaseRecords = [];
    const closetDocs = [];

    for (const line of cart) {
      const product = productMap.get(String(line.productId));
      if (!product) continue;
      const qty = Math.max(1, Number(line.quantity) || 1);

      purchaseRecords.push({
        productId: String(product._id),
        quantity: qty,
        purchasedAt: new Date(),
      });

      for (let i = 0; i < qty; i += 1) {
        closetDocs.push(buildClosetItemFromProduct(product, buyerId));
      }
    }

    if (closetDocs.length) {
      await ClosetItemModel.insertMany(closetDocs);
    }

    if (mongoose.isValidObjectId(buyerId)) {
      await UserModel.updateOne(
        { _id: buyerId },
        {
          $set: { cart: [] },
          $push: { purchaseHistory: { $each: purchaseRecords } },
        },
      );
    } else {
      demoCartStore.set(buyerId, []);
    }

    res.json({
      success: true,
      message:
        "Checkout complete. Purchased products were added to your digital closet.",
      purchasedCount: purchaseRecords.reduce((sum, p) => sum + p.quantity, 0),
    });
  } catch (error) {
    res.status(500).json({ error: "Checkout failed." });
  }
});

router.post("/products/:productId/suggestions", async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      res.status(403).json({ error: "Suggestions are buyer-only." });
      return;
    }

    const selected = await resolveCartProduct(req.params.productId);
    if (!selected) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    if (
      String(selected.userId || "") !== "dummyjson" &&
      String(selected.userId) === String(req.user.id)
    ) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    const userCloset = await ClosetItemModel.find({ userId: req.user.id })
      .select("name type colors brand occasions imageUrl notes")
      .lean();

    const shopFilter = {
      userId: { $ne: req.user.id },
    };
    if (mongoose.isValidObjectId(String(selected._id))) {
      shopFilter._id = { $ne: selected._id };
    }

    const shopOptions = await ClosetItemModel.find(shopFilter)
      .select("name type colors brand occasions imageUrl notes")
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean();

    const selectedAsCloset = {
      _id: selected._id,
      name: selected.name,
      type: selected.type,
      colors: selected.colors,
      brand: selected.brand,
      occasions: selected.occasions,
      imageUrl: selected.imageUrl,
      notes: selected.notes,
    };

    const selectedCategory = toOutfitCategory(selected);
    const sameCategoryCloset = selectedCategory
      ? userCloset.filter((item) => toOutfitCategory(item) === selectedCategory)
      : [];
    const sameCategoryShop = selectedCategory
      ? shopOptions.filter(
          (item) => toOutfitCategory(item) === selectedCategory,
        )
      : shopOptions;
    const hasClosetMatches = sameCategoryCloset.length > 0;

    const allVisionCandidates = [
      selectedAsCloset,
      ...userCloset,
      ...shopOptions,
    ];
    const closetImages = await buildVisionImages(allVisionCandidates);

    const toOutfitItems = (items) =>
      items
        .map((item) => {
          const category = toOutfitCategory(item);
          if (!category) return null;
          return {
            id: String(item._id),
            name: item.name,
            category,
            color: item.colors?.[0] || "neutral",
            occasions: Array.isArray(item.occasions)
              ? item.occasions.filter((o) => VALID_OCCASIONS.has(String(o)))
              : [],
            brand: item.brand || undefined,
          };
        })
        .filter(Boolean);

    const occasion = req.body?.occasion ? String(req.body.occasion) : undefined;
    const style = req.body?.style === "clueless" ? "clueless" : "classic";

    const bestOutfit = simpleOutfitChoice(
      selected,
      userCloset,
      shopOptions,
      occasion,
      style,
    );

    const outfitData = {
      outfits: [bestOutfit],
      best: bestOutfit,
      ai: {
        explanation: null,
        closetBasedSuggestion: null,
        enabled: false,
      },
    };

    const suggestionMessages = [
      {
        role: "user",
        content: `Suggest how to style this product for ${occasion || "a general day"}: ${selected.name}. Keep this selected product as the anchor of Primary Look. If you mention another base garment, move it to Alternative Look instead of combining them. Prefer same-category suggestions. If I have matching category items in my closet, include them first and then add marketplace recs from the same category; otherwise use marketplace recs only. Style mode: ${style === "clueless" ? "Clueless-inspired polished coordination" : "classic balanced styling"}.`,
      },
    ];
    const assistantData = await runGeminiText({
      messages: suggestionMessages,
      closet: [selectedAsCloset, ...sameCategoryCloset].map((item) => ({
        id: String(item._id),
        name: item.name,
        category: item.type,
        color: item.colors?.[0] || undefined,
        brand: item.brand,
        occasions: item.occasions || [],
        hasImage: Boolean(item.imageUrl),
      })),
      closetImages,
      context: req.body?.context || { season: "summer" },
    });

    res.json({
      selectedProduct: {
        id: String(selected._id),
        name: selected.name,
      },
      recommendation: {
        assistant: assistantData?.assistant || null,
        model: assistantData?.model || null,
      },
      outfits: outfitData?.outfits || [],
      bestOutfit: outfitData?.best || null,
      ai: outfitData?.ai || null,
      relatedClosetProducts: hasClosetMatches
        ? sameCategoryCloset.map((item) => toPublicProduct(item))
        : [],
      relatedMarketplaceProducts: sameCategoryShop.map((item) =>
        toPublicProduct(item),
      ),
      source: {
        closetCount: sameCategoryCloset.length,
        shopCount: sameCategoryShop.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate product suggestions." });
  }
});

export default router;
