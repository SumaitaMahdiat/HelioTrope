// Environment and dependencies
import "dotenv/config";
import cors from "cors";
import express from "express";
import { randomUUID } from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import {
  fetchFacebookPagePosts,
  facebookOAuthAuthorizeUrl,
} from "./facebook.js";
import { fetchInstagramMedia } from "./instagram.js";
import { postToProductDraft } from "./convert.js";
import type { SocialPost } from "./types.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "..", "public")));

const PORT = Number(process.env.PORT) || 3003;
type UserRole = "buyer" | "seller";
// In-memory session store (token -> user info)
const sessions = new Map<string, { role: UserRole; displayName: string }>();

// Demo posts for testing without real API credentials
const demoPosts: SocialPost[] = [
  {
    id: "demo_fb_1",
    platform: "facebook",
    caption: "New embroidered kurti — DM for price #dhaka #handmade",
    mediaUrl: "https://placehold.co/600x800/png?text=FB+Post",
    permalink: "https://facebook.com/example",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo_ig_1",
    platform: "instagram",
    caption: "Restock: linen pants — link in bio",
    mediaUrl: "https://placehold.co/600x800/png?text=IG+Post",
    permalink: "https://instagram.com/p/example",
    createdAt: new Date().toISOString(),
  },
];

// Extract session token from Authorization header or custom header
function readSessionToken(req: express.Request) {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice("Bearer ".length).trim()
    : null;
  const headerToken = (
    req.headers["x-session-token"] as string | undefined
  )?.trim();
  return bearer || headerToken || null;
}

// Validate session and return user info, or send 401 response
function requireSession(req: express.Request, res: express.Response) {
  const token = readSessionToken(req);
  if (!token) {
    res.status(401).json({ error: "Missing session token. Login first." });
    return null;
  }
  const session = sessions.get(token);
  if (!session) {
    res.status(401).json({ error: "Invalid session token. Login again." });
    return null;
  }
  return { token, session };
}

// POST login - create a session for buyer or seller
app.post("/api/auth/login", (req, res) => {
  const role = req.body?.role as UserRole | undefined;
  const displayNameRaw = req.body?.displayName as string | undefined;
  const displayName = displayNameRaw?.trim() || "Demo User";
  // Validate role
  if (role !== "buyer" && role !== "seller") {
    res.status(400).json({ error: "role must be 'buyer' or 'seller'." });
    return;
  }

  // Generate session token and store user info
  const token = randomUUID();
  sessions.set(token, { role, displayName });
  res.json({
    token,
    user: { role, displayName },
    next:
      role === "seller"
        ? "Show connection options for Facebook/Instagram."
        : "Buyer login successful. Social connection options are seller-only.",
  });
});

// GET connection options - show available OAuth flows (sellers only)
app.get("/api/social/connections/options", (req, res) => {
  const auth = requireSession(req, res);
  if (!auth) return;

  const { session } = auth;
  // Restrict to sellers
  if (session.role !== "seller") {
    res.json({
      role: session.role,
      canConnectSocial: false,
      options: [],
      message: "Only sellers can connect Facebook/Instagram pages.",
    });
    return;
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
  const canGenerateOAuth = Boolean(appId && redirectUri);
  const oauthState = randomUUID();
  // Generate Facebook OAuth URL if configured
  const facebookOauthUrl = canGenerateOAuth
    ? facebookOAuthAuthorizeUrl({
        appId: String(appId),
        redirectUri: String(redirectUri),
        state: oauthState,
        scopes: ["pages_show_list", "pages_read_engagement", "instagram_basic"],
      })
    : null;

  res.json({
    role: "seller",
    canConnectSocial: true,
    options: [
      {
        platform: "facebook",
        action: "Connect Facebook Page",
        oauthUrl: facebookOauthUrl,
        status: canGenerateOAuth ? "ready" : "needs_config",
      },
      {
        platform: "instagram",
        action: "Connect Instagram Business Account",
        oauthUrl: facebookOauthUrl,
        status: canGenerateOAuth ? "ready" : "needs_config",
        note: "Instagram Business connection is completed through Meta/Facebook OAuth.",
      },
    ],
    config: {
      facebookAppConfigured: Boolean(appId),
      facebookRedirectConfigured: Boolean(redirectUri),
    },
  });
});

// GET Facebook OAuth URL - public endpoint to generate authorization link
app.get("/api/social/oauth/facebook/url", (req, res) => {
  const appId = process.env.FACEBOOK_APP_ID;
  const redirectUri =
    (req.query.redirect_uri as string) || process.env.FACEBOOK_REDIRECT_URI;
  // Require app credentials
  if (!appId || !redirectUri) {
    res.status(503).json({
      error:
        "Set FACEBOOK_APP_ID and FACEBOOK_REDIRECT_URI (or pass redirect_uri).",
    });
    return;
  }
  const state = (req.query.state as string) || randomUUID();
  const url = facebookOAuthAuthorizeUrl({
    appId,
    redirectUri,
    state,
    scopes: ["pages_show_list", "pages_read_engagement", "instagram_basic"],
  });
  res.json({ url, state });
});

// GET Facebook posts - fetch from official API or demo source
app.get("/api/social/facebook/posts", async (req, res) => {
  try {
    const pageId = req.query.page_id as string | undefined;
    const token = req.query.access_token as string | undefined;

    // Use real credentials if provided, otherwise fallback to demo
    if (pageId && token) {
      const result = await fetchFacebookPagePosts({
        pageId,
        accessToken: token,
      });
      if (result.error) {
        res.status(502).json({ error: result.error, posts: [] });
        return;
      }
      res.json({ posts: result.posts, demo: false });
    } else {
      // Call fetch function to get demo data from JSONPlaceholder
      const result = await fetchFacebookPagePosts({
        pageId: "demo",
        accessToken: "demo_token",
      });
      res.json({ posts: result.posts, demo: true });
    }
  } catch (error) {
    console.error("GET /api/social/facebook/posts failed:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch Facebook posts.", posts: [] });
  }
});

// GET Instagram media - fetch from official API or demo source
app.get("/api/social/instagram/media", async (req, res) => {
  try {
    const igUserId = req.query.ig_user_id as string | undefined;
    const token = req.query.access_token as string | undefined;

    // Use real credentials if provided, otherwise fallback to demo
    if (igUserId && token) {
      const result = await fetchInstagramMedia({
        igUserId,
        accessToken: token,
      });
      if (result.error) {
        res.status(502).json({ error: result.error, posts: [] });
        return;
      }
      res.json({ posts: result.posts, demo: false });
    } else {
      // Call fetch function to get demo data from JSONPlaceholder
      const result = await fetchInstagramMedia({
        igUserId: "demo",
        accessToken: "demo_token",
      });
      res.json({ posts: result.posts, demo: true });
    }
  } catch (error) {
    console.error("GET /api/social/instagram/media failed:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch Instagram media.", posts: [] });
  }
});

// POST convert single social post to product draft
app.post("/api/social/import/convert", (req, res) => {
  const post = req.body?.post as SocialPost | undefined;
  if (!post?.id || !post.platform) {
    res.status(400).json({ error: "Expected body.post with id and platform." });
    return;
  }
  const draft = postToProductDraft(post);
  res.json({ draft });
});

// POST convert multiple social posts to product drafts
app.post("/api/social/import/convert-many", (req, res) => {
  const posts = req.body?.posts as SocialPost[] | undefined;
  if (!Array.isArray(posts)) {
    res.status(400).json({ error: "Expected body.posts as an array." });
    return;
  }
  // Filter to valid posts only
  const validPosts = posts.filter(
    (p) => p?.id && (p?.platform === "facebook" || p?.platform === "instagram"),
  );
  const drafts = validPosts.map(postToProductDraft);
  res.json({
    drafts,
    accepted: drafts.length,
    rejected: posts.length - drafts.length,
  });
});

// GET all social posts from Facebook and/or Instagram with optional filtering
app.get("/api/social/import/all", async (req, res) => {
  try {
    const pageId = req.query.page_id as string | undefined;
    const fbToken = req.query.fb_access_token as string | undefined;
    const igUserId = req.query.ig_user_id as string | undefined;
    const igToken = req.query.ig_access_token as string | undefined;

    // Allow opt-out of each platform (default: include both)
    const includeFacebook = req.query.include_facebook !== "false";
    const includeInstagram = req.query.include_instagram !== "false";

    let facebookPosts: SocialPost[] = [];
    let instagramPosts: SocialPost[] = [];
    let facebookDemo = false;
    let instagramDemo = false;

    // Fetch Facebook posts if enabled
    if (includeFacebook) {
      if (!pageId || !fbToken) {
        // Use demo posts if no credentials
        facebookPosts = demoPosts.filter((p) => p.platform === "facebook");
        facebookDemo = true;
      } else {
        const result = await fetchFacebookPagePosts({
          pageId,
          accessToken: fbToken,
        });
        if (result.error) {
          res.status(502).json({ error: `Facebook: ${result.error}` });
          return;
        }
        facebookPosts = result.posts;
      }
    }

    // Fetch Instagram posts if enabled
    if (includeInstagram) {
      if (!igUserId || !igToken) {
        // Use demo posts if no credentials
        instagramPosts = demoPosts.filter((p) => p.platform === "instagram");
        instagramDemo = true;
      } else {
        const result = await fetchInstagramMedia({
          igUserId,
          accessToken: igToken,
        });
        if (result.error) {
          res.status(502).json({ error: `Instagram: ${result.error}` });
          return;
        }
        instagramPosts = result.posts;
      }
    }

    // Combine and sort by date (most recent first)
    const posts = [...facebookPosts, ...instagramPosts].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    res.json({
      posts,
      count: posts.length,
      demo: facebookDemo || instagramDemo,
      sources: {
        facebook: includeFacebook,
        instagram: includeInstagram,
        facebookDemo,
        instagramDemo,
      },
    });
  } catch (error) {
    console.error("GET /api/social/import/all failed:", error);
    res.status(500).json({ error: "Failed to import posts." });
  }
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ ok: true, feature: "social-integration" });
});

// Redirect root to demo page
app.get("/", (_req, res) => {
  res.redirect("/demo.html");
});

app.listen(PORT, () => {
  console.log(`[social-integration] http://localhost:${PORT}`);
});
