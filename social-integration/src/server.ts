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
const sessions = new Map<string, { role: UserRole; displayName: string }>();

/** In-memory demo store when APIs are not called */
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

function readSessionToken(req: express.Request) {
  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice("Bearer ".length).trim()
    : null;
  const headerToken = (
    req.headers["x-session-token"] as string | undefined
  )?.trim();
  return bearer || headerToken || null;
}

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

app.post("/api/auth/login", (req, res) => {
  const role = req.body?.role as UserRole | undefined;
  const displayNameRaw = req.body?.displayName as string | undefined;
  const displayName = displayNameRaw?.trim() || "Demo User";
  if (role !== "buyer" && role !== "seller") {
    res.status(400).json({ error: "role must be 'buyer' or 'seller'." });
    return;
  }

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

app.get("/api/social/connections/options", (req, res) => {
  const auth = requireSession(req, res);
  if (!auth) return;

  const { session } = auth;
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

app.get("/api/social/oauth/facebook/url", (req, res) => {
  const appId = process.env.FACEBOOK_APP_ID;
  const redirectUri =
    (req.query.redirect_uri as string) || process.env.FACEBOOK_REDIRECT_URI;
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

app.get("/api/social/facebook/posts", async (req, res) => {
  try {
    const pageId = req.query.page_id as string | undefined;
    const token = req.query.access_token as string | undefined;

    // If credentials provided, try official API; otherwise use JSONPlaceholder
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
      // Always call fetch function for demo (uses JSONPlaceholder)
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

app.get("/api/social/instagram/media", async (req, res) => {
  try {
    const igUserId = req.query.ig_user_id as string | undefined;
    const token = req.query.access_token as string | undefined;

    // If credentials provided, try official API; otherwise use Ayrshare
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
      // Always call fetch function for demo (uses Ayrshare)
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

app.post("/api/social/import/convert", (req, res) => {
  const post = req.body?.post as SocialPost | undefined;
  if (!post?.id || !post.platform) {
    res.status(400).json({ error: "Expected body.post with id and platform." });
    return;
  }
  const draft = postToProductDraft(post);
  res.json({ draft });
});

app.post("/api/social/import/convert-many", (req, res) => {
  const posts = req.body?.posts as SocialPost[] | undefined;
  if (!Array.isArray(posts)) {
    res.status(400).json({ error: "Expected body.posts as an array." });
    return;
  }
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

app.get("/api/social/import/all", async (req, res) => {
  try {
    const pageId = req.query.page_id as string | undefined;
    const fbToken = req.query.fb_access_token as string | undefined;
    const igUserId = req.query.ig_user_id as string | undefined;
    const igToken = req.query.ig_access_token as string | undefined;

    const includeFacebook = req.query.include_facebook !== "false";
    const includeInstagram = req.query.include_instagram !== "false";

    let facebookPosts: SocialPost[] = [];
    let instagramPosts: SocialPost[] = [];
    let facebookDemo = false;
    let instagramDemo = false;

    if (includeFacebook) {
      if (!pageId || !fbToken) {
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

    if (includeInstagram) {
      if (!igUserId || !igToken) {
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

app.get("/health", (_req, res) => {
  res.json({ ok: true, feature: "social-integration" });
});

app.get("/", (_req, res) => {
  res.redirect("/demo.html");
});

app.listen(PORT, () => {
  console.log(`[social-integration] http://localhost:${PORT}`);
});
