import express from "express";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/User.js";
import { ClosetItemModel } from "../models/ClosetItem.js";
import { authenticate } from "./authRoutes.js";
import mongoose from "mongoose";

const router = express.Router();
const GRAPH = "https://graph.facebook.com/v21.0";
const DUMMYJSON = "https://dummyjson.com";
const IMAGE_FALLBACK = "https://placehold.co/800x800/png?text=Social+Post";

// Types
const SocialPost = {
  id: "string",
  platform: "facebook|instagram",
  caption: "string|null",
  mediaUrl: "string|null",
  permalink: "string|null",
  createdAt: "string",
};

function postToProductDraft(post) {
  const titleBase =
    post.caption
      ?.split(/\n|\.|\#/)[0]
      ?.trim()
      .slice(0, 80) || "Listing from social post";
  const title = titleBase.length < 3 ? `Item from ${post.platform}` : titleBase;
  return {
    name: title,
    type: "clothes", // Default; UI can override
    imageUrl: post.mediaUrl || "",
    notes: `Imported from ${post.platform.toUpperCase()} post: ${post.permalink || post.id}. Caption: ${post.caption || "No caption"}`,
    sourcePostId: post.id,
    platform: post.platform,
    sourcePermalink: post.permalink,
    colors: [],
    occasions: [],
    brand: "",
  };
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function resolveMediaUrl(candidate, fallback = IMAGE_FALLBACK) {
  return isHttpUrl(candidate) ? candidate : fallback;
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json();
  return { response, data };
}

function pickUserDisplayName(user, fallback) {
  return user?.firstName || user?.displayName || user?.username || fallback;
}

function hasValidUserId(id) {
  return typeof id === "string" && mongoose.Types.ObjectId.isValid(id);
}

function toPositiveInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.abs(parsed);
}

function getRotatingSkip({ refreshKey, total, limit }) {
  const safeTotal = Math.max(total, 1);
  const safeLimit = Math.max(Math.min(limit, safeTotal), 1);
  const maxSkip = Math.max(safeTotal - safeLimit, 0);
  if (maxSkip === 0) {
    return 0;
  }
  return toPositiveInt(refreshKey, Date.now()) % (maxSkip + 1);
}

async function fetchFacebookPagePosts({
  pageId,
  accessToken,
  limit = 25,
  refreshKey,
}) {
  try {
    const postsSkip = getRotatingSkip({
      refreshKey,
      total: 250,
      limit,
    });
    const usersSkip = getRotatingSkip({
      refreshKey,
      total: 200,
      limit,
    });
    const productsSkip = getRotatingSkip({
      refreshKey,
      total: 194,
      limit,
    });

    const [postsResult, usersResult, productsResult] = await Promise.all([
      fetchJson(`${DUMMYJSON}/posts?limit=${limit}&skip=${postsSkip}`),
      fetchJson(`${DUMMYJSON}/users?limit=${limit}&skip=${usersSkip}`),
      fetchJson(`${DUMMYJSON}/products?limit=${limit}&skip=${productsSkip}`),
    ]);

    if (!postsResult.response.ok || !Array.isArray(postsResult.data?.posts)) {
      return { posts: [], error: `HTTP ${postsResult.response.status}` };
    }

    if (!usersResult.response.ok || !Array.isArray(usersResult.data?.users)) {
      return { posts: [], error: `HTTP ${usersResult.response.status}` };
    }

    if (
      !productsResult.response.ok ||
      !Array.isArray(productsResult.data?.products)
    ) {
      return { posts: [], error: `HTTP ${productsResult.response.status}` };
    }

    const posts = postsResult.data.posts.map((row, idx) => {
      const user = usersResult.data.users[idx % usersResult.data.users.length];
      const product =
        productsResult.data.products[idx % productsResult.data.products.length];
      const author = pickUserDisplayName(user, `Creator ${idx + 1}`);

      return {
        id: `fb_${String(row.id)}`,
        platform: "facebook",
        caption:
          `${author}: ${String(row.title || "")} ${String(row.body || "")}`.trim() ||
          null,
        mediaUrl: resolveMediaUrl(product?.thumbnail),
        permalink: `https://facebook.com/demo/post/${String(row.id)}`,
        createdAt: new Date(Date.now() - idx * 3600000).toISOString(),
      };
    });
    return { posts };
  } catch (err) {
    return { posts: [], error: err.message };
  }
}

async function fetchInstagramDemoPosts(limit = 25, refreshKey) {
  try {
    const postsSkip = getRotatingSkip({
      refreshKey,
      total: 250,
      limit,
    });
    const usersSkip = getRotatingSkip({
      refreshKey,
      total: 200,
      limit,
    });
    const productsSkip = getRotatingSkip({
      refreshKey,
      total: 194,
      limit,
    });

    const [postsResult, usersResult, productsResult] = await Promise.all([
      fetchJson(`${DUMMYJSON}/posts?limit=${limit}&skip=${postsSkip}`),
      fetchJson(`${DUMMYJSON}/users?limit=${limit}&skip=${usersSkip}`),
      fetchJson(`${DUMMYJSON}/products?limit=${limit}&skip=${productsSkip}`),
    ]);

    if (!postsResult.response.ok || !Array.isArray(postsResult.data?.posts)) {
      return { posts: [], error: `HTTP ${postsResult.response.status}` };
    }

    if (!usersResult.response.ok || !Array.isArray(usersResult.data?.users)) {
      return { posts: [], error: `HTTP ${usersResult.response.status}` };
    }

    if (
      !productsResult.response.ok ||
      !Array.isArray(productsResult.data?.products)
    ) {
      return { posts: [], error: `HTTP ${productsResult.response.status}` };
    }

    const posts = postsResult.data.posts.map((row, idx) => {
      const user = usersResult.data.users[idx % usersResult.data.users.length];
      const product =
        productsResult.data.products[idx % productsResult.data.products.length];
      const author = pickUserDisplayName(user, `Creator ${idx + 1}`);
      const productName = product?.title || product?.name || "Styled look";

      return {
        id: `ig_${String(row.id)}`,
        platform: "instagram",
        caption:
          `${author} shared ${productName}. ${String(row.body || row.title || "")}`.trim() ||
          null,
        mediaUrl: resolveMediaUrl(product?.images?.[0] || product?.thumbnail),
        permalink: `https://instagram.com/p/demo_${String(row.id)}`,
        createdAt: new Date(Date.now() - idx * 3600000).toISOString(),
      };
    });

    return { posts };
  } catch (err) {
    return { posts: [], error: err.message };
  }
}

async function fetchInstagramMedia({
  igUserId,
  accessToken,
  limit = 25,
  refreshKey,
}) {
  try {
    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) {
      return fetchInstagramDemoPosts(limit, refreshKey);
    }

    const res = await fetch("https://api.ayrshare.com/analytics/social", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    if (!res.ok || data?.error) {
      // Fall back to demo provider if Ayrshare rejects the key or is unavailable.
      return fetchInstagramDemoPosts(limit, refreshKey);
    }

    const source = Array.isArray(data?.posts)
      ? data.posts
      : Array.isArray(data?.data)
        ? data.data
        : [];

    const posts = source
      .filter((row) => {
        const platform = String(
          row?.platform || row?.socialNetwork || "",
        ).toLowerCase();
        return platform.includes("instagram") || platform === "ig";
      })
      .slice(0, limit)
      .map((row, idx) => ({
        id: `ig_${String(row.id || row.postId || idx)}`,
        platform: "instagram",
        caption: String(row.caption || row.text || row.post || "") || null,
        mediaUrl: resolveMediaUrl(
          row.mediaUrl || row.imageUrl || row.image || row.thumbnailUrl,
        ),
        permalink: isHttpUrl(row.postUrl)
          ? row.postUrl
          : isHttpUrl(row.url)
            ? row.url
            : `https://instagram.com/p/${String(row.id || row.postId || "demo")}`,
        createdAt: String(
          row.createdAt ||
            row.created ||
            row.timestamp ||
            new Date().toISOString(),
        ),
      }));

    return { posts };
  } catch (err) {
    return fetchInstagramDemoPosts(limit, refreshKey);
  }
}

router.post("/demo/connect", authenticate, async (req, res) => {
  if (req.user.role !== "seller") {
    return res.status(403).json({ error: "Seller only" });
  }

  const platform = String(req.body?.platform || "").toLowerCase();
  if (!["facebook", "instagram", "both"].includes(platform)) {
    return res
      .status(400)
      .json({ error: "platform must be facebook, instagram, or both" });
  }

  const setFields = {};
  if (platform === "facebook" || platform === "both") {
    setFields["sellerSocial.fbPageId"] = "demo_fb_page";
    setFields["sellerSocial.fbAccessToken"] = "demo_fb_token";
  }
  if (platform === "instagram" || platform === "both") {
    setFields["sellerSocial.igUserId"] = "demo_ig_user";
    setFields["sellerSocial.igAccessToken"] = "demo_ig_token";
  }

  await UserModel.updateOne({ _id: req.user.id }, { $set: setFields });
  res.json({
    success: true,
    connected: {
      facebook: platform === "facebook" || platform === "both",
      instagram: platform === "instagram" || platform === "both",
    },
  });
});

function facebookOAuthAuthorizeUrl({ appId, redirectUri, state, scopes }) {
  const u = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  u.searchParams.set("client_id", appId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", scopes.join(","));
  return u.toString();
}

// Connections options
router.get("/connections/options", authenticate, async (req, res) => {
  if (!hasValidUserId(req.user?.id)) {
    return res.status(401).json({
      error: "Invalid session user. Please sign in again.",
    });
  }

  if (req.user.role !== "seller") {
    return res.status(403).json({
      error: "Only sellers can access social features.",
      role: req.user.role,
    });
  }
  const appId = process.env.FACEBOOK_APP_ID;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
  const canGenerateOAuth = Boolean(appId && redirectUri);
  const instagramProviderReady = Boolean(process.env.AYRSHARE_API_KEY);
  const facebookProviderReady = true; // JSONPlaceholder demo provider
  const user = await UserModel.findById(req.user.id).select("+sellerSocial");
  if (!user) {
    return res.status(404).json({
      error: "Seller account not found. Please sign in again.",
    });
  }
  const facebookConnected = Boolean(user?.sellerSocial?.fbPageId);
  const instagramConnected = Boolean(user?.sellerSocial?.igUserId);
  const state = `seller_${req.user.id}`;
  const scopes = [
    "pages_show_list",
    "pages_read_engagement",
    "instagram_basic",
  ];
  const oauthUrl = canGenerateOAuth
    ? facebookOAuthAuthorizeUrl({ appId, redirectUri, state, scopes })
    : null;
  res.json({
    role: "seller",
    canConnectSocial: true,
    options: [
      {
        platform: "facebook",
        action: "Facebook Feed",
        oauthUrl: canGenerateOAuth ? oauthUrl : null,
        status: facebookConnected
          ? "connected"
          : facebookProviderReady
            ? "ready"
            : "needs_config",
        note: canGenerateOAuth
          ? "Use Meta OAuth to connect a real Facebook Page."
          : "Using JSONPlaceholder demo feed. No Facebook app setup required.",
      },
      {
        platform: "instagram",
        action: "Instagram Feed",
        oauthUrl: canGenerateOAuth ? oauthUrl : null,
        status: instagramConnected
          ? "connected"
          : instagramProviderReady || canGenerateOAuth
            ? "ready"
            : "needs_config",
        note: canGenerateOAuth
          ? "Via Meta/Facebook OAuth for real account connection."
          : instagramProviderReady
            ? "Using Ayrshare feed. No Meta app setup required."
            : "Set AYRSHARE_API_KEY in .env or configure Meta OAuth.",
      },
    ],
    config: {
      facebookAppConfigured: Boolean(appId),
      facebookRedirectConfigured: Boolean(redirectUri),
    },
  });
});

// OAuth callback (call from frontend after redirect)
router.get("/oauth/facebook/callback", authenticate, async (req, res) => {
  if (req.user.role !== "seller")
    return res.status(403).json({ error: "Seller only" });
  const code = req.query.code;
  const state = req.query.state;
  if (!code || state !== `seller_${req.user.id}`)
    return res.status(400).json({ error: "Invalid callback" });
  try {
    // Exchange code for token (simplified; prod needs APP_SECRET for long-lived)
    const tokenUrl = `${GRAPH}oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&redirect_uri=${process.env.FACEBOOK_REDIRECT_URI}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error.message);
    const shortToken = tokenData.access_token;
    // Get pages/IG users (simplified; use /me/accounts for pages, /me?fields=instagram_business_account)
    const pagesUrl = `${GRAPH}me/accounts?access_token=${shortToken}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();
    if (pagesData.error) throw new Error(pagesData.error.message);
    const page = pagesData.data[0]; // First page
    const igUrl = `${GRAPH}${page.id}?fields=instagram_business_account&access_token=${shortToken}`;
    const igRes = await fetch(igUrl);
    const igData = await igRes.json();
    const igAccount = igData.instagram_business_account;
    // Save to user (populate .select('+sellerSocial.fbAccessToken...') but for update no need
    await UserModel.updateOne(
      { _id: req.user.id },
      {
        $set: {
          "sellerSocial.fbPageId": page.id,
          "sellerSocial.fbAccessToken": shortToken,
          ...(igAccount && {
            "sellerSocial.igUserId": igAccount.id,
            "sellerSocial.igAccessToken": shortToken, // Same token
          }),
        },
      },
    );
    res.json({ success: true, pageId: page.id, igUserId: igAccount?.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Facebook posts
router.get("/facebook/posts", authenticate, async (req, res) => {
  if (req.user.role !== "seller")
    return res.status(403).json({ error: "Seller only" });
  const user = await UserModel.findById(req.user.id).select(
    "+sellerSocial.fbAccessToken",
  );
  if (!user.sellerSocial?.fbPageId || !user.sellerSocial.fbAccessToken) {
    return res.json({
      posts: [],
      demo: false,
      connected: false,
      message: "Connect Facebook first to load posts.",
    });
  }
  const result = await fetchFacebookPagePosts({
    pageId: user.sellerSocial.fbPageId,
    accessToken: user.sellerSocial.fbAccessToken,
    refreshKey: req.query._t,
  });
  if (result.error)
    return res.status(502).json({ error: result.error, posts: [] });
  res.json({ posts: result.posts, demo: false });
});

// Get Instagram media
router.get("/instagram/media", authenticate, async (req, res) => {
  if (req.user.role !== "seller")
    return res.status(403).json({ error: "Seller only" });
  const user = await UserModel.findById(req.user.id).select("+sellerSocial");
  if (!user.sellerSocial?.igUserId) {
    return res.json({
      posts: [],
      demo: false,
      connected: false,
      message: "Connect Instagram first to load posts.",
    });
  }
  const result = await fetchInstagramMedia({
    igUserId: user.sellerSocial.igUserId,
    accessToken: user.sellerSocial.igAccessToken,
    refreshKey: req.query._t,
  });
  if (result.error)
    return res.status(502).json({ error: result.error, posts: [] });
  res.json({ posts: result.posts, demo: false });
});

// Import all
router.get("/import/all", authenticate, async (req, res) => {
  if (!hasValidUserId(req.user?.id)) {
    return res.status(401).json({
      error: "Invalid session user. Please sign in again.",
    });
  }

  if (req.user.role !== "seller")
    return res.status(403).json({ error: "Seller only" });
  const user = await UserModel.findById(req.user.id).select("+sellerSocial");
  if (!user) {
    return res.status(404).json({
      error: "Seller account not found. Please sign in again.",
    });
  }
  const includeFB = req.query.include_facebook !== "false";
  const includeIG = req.query.include_instagram !== "false";
  const refreshKey = req.query._t;
  let fbPosts = [],
    igPosts = [],
    fbDemo = false,
    igDemo = false;
  if (includeFB) {
    if (user.sellerSocial?.fbPageId) {
      const result = await fetchFacebookPagePosts({
        pageId: user.sellerSocial.fbPageId,
        accessToken: user.sellerSocial.fbAccessToken,
        refreshKey,
      });
      if (result.error)
        return res.status(502).json({ error: `Facebook: ${result.error}` });
      fbPosts = result.posts;
    } else {
      fbDemo = false;
    }
  }
  if (includeIG) {
    if (user.sellerSocial?.igUserId) {
      const result = await fetchInstagramMedia({
        igUserId: user.sellerSocial.igUserId,
        accessToken: user.sellerSocial.igAccessToken,
        refreshKey,
      });
      if (result.error)
        return res.status(502).json({ error: `Instagram: ${result.error}` });
      igPosts = result.posts;
    } else {
      igDemo = false;
    }
  }
  const posts = [...fbPosts, ...igPosts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  res.json({
    posts,
    count: posts.length,
    demo: fbDemo || igDemo,
    connected: {
      facebook: Boolean(user.sellerSocial?.fbPageId),
      instagram: Boolean(user.sellerSocial?.igUserId),
    },
    message:
      posts.length === 0
        ? "No connected social accounts yet. Connect Facebook or Instagram to load posts."
        : undefined,
    sources: { facebook: includeFB, instagram: includeIG, fbDemo, igDemo },
  });
});

// Convert single
router.post("/import/convert", authenticate, (req, res) => {
  if (req.user.role !== "seller")
    return res.status(403).json({ error: "Seller only" });
  const post = req.body?.post;
  if (!post?.id || !["facebook", "instagram"].includes(post.platform))
    return res.status(400).json({ error: "Invalid post" });
  const draft = postToProductDraft(post);
  res.json({ draft });
});

// Convert many
router.post("/import/convert-many", authenticate, (req, res) => {
  if (req.user.role !== "seller")
    return res.status(403).json({ error: "Seller only" });
  const posts = Array.isArray(req.body?.posts) ? req.body.posts : [];
  const validPosts = posts.filter(
    (p) => p?.id && ["facebook", "instagram"].includes(p.platform),
  );
  const drafts = validPosts.map(postToProductDraft);
  res.json({
    drafts,
    accepted: drafts.length,
    rejected: posts.length - validPosts.length,
  });
});

export default router;
