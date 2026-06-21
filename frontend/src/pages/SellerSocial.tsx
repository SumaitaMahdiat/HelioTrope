import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCcw,
  Link2,
  Wand2,
  CheckCircle2,
  PlusCircle,
} from "lucide-react";
import {
  connectSocialDemo,
  convertSocialPost,
  getSocialConnectionOptions,
  getSocialPosts,
  createSocialItem,
} from "../api";
import axios from "axios";

interface SocialOption {
  platform: string;
  action: string;
  oauthUrl?: string | null;
  status: string;
  note?: string;
}

interface SocialPost {
  id: string;
  platform: string;
  caption: string | null;
  mediaUrl: string;
  permalink: string | null;
  createdAt: string;
}

interface ConvertedDraft {
  name: string;
  type: "clothes";
  imageUrl: string;
  notes: string;
  sourcePostId: string;
  platform: "facebook" | "instagram";
  sourcePermalink: string | null;
}

const SellerSocial: React.FC = () => {
  const navigate = useNavigate();
  const [options, setOptions] = useState<SocialOption[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingPostId, setConvertingPostId] = useState<string | null>(null);
  const [savingPostId, setSavingPostId] = useState<string | null>(null);
  const [convertedDrafts, setConvertedDrafts] = useState<
    Record<string, ConvertedDraft>
  >({});
  const [savedItems, setSavedItems] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(
    null,
  );

  // Load connection options and social posts
  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    setError("");
    setInfo("");

    if (forceRefresh) {
      setConvertedDrafts({});
      setSavedItems({});
    }

    try {
      const [optionsResp, postsResp] = await Promise.all([
        getSocialConnectionOptions(),
        getSocialPosts(forceRefresh),
      ]);
      setOptions(optionsResp.data.options ?? []);
      setPosts(postsResp.data.posts ?? []);
      if (postsResp.data?.message) {
        setInfo(String(postsResp.data.message));
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const apiMessage =
          (
            err.response?.data as
              | { error?: string; message?: string }
              | undefined
          )?.error ||
          (
            err.response?.data as
              | { error?: string; message?: string }
              | undefined
          )?.message;
        setError(apiMessage || "Could not load social integration content.");
        return;
      }
      setError("Could not load social integration content.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Connect to demo Facebook/Instagram account
  const handleDemoConnect = async (platform: "facebook" | "instagram") => {
    try {
      setConnectingPlatform(platform);
      setError("");
      await connectSocialDemo(platform);
      await loadData(true);
      setInfo(`Demo ${platform} account connected.`);
    } catch {
      setError(`Could not connect demo ${platform} account.`);
    } finally {
      setConnectingPlatform(null);
    }
  };

  // Convert social post to product draft
  const handleConvertPost = async (post: SocialPost) => {
    try {
      setConvertingPostId(post.id);
      setError("");
      const response = await convertSocialPost(post);
      const draft = response?.data?.draft;
      if (!draft?.name) {
        throw new Error("Invalid conversion response");
      }
      setConvertedDrafts((prev) => ({ ...prev, [post.id]: draft }));
    } catch {
      setError("Could not convert the selected post into a draft.");
    } finally {
      setConvertingPostId(null);
    }
  };

  // Save converted draft as new storefront item
  const handleSaveDraft = async (post: SocialPost, draft: ConvertedDraft) => {
    try {
      setSavingPostId(post.id);
      setError("");
      const saveDraft = {
        ...draft,
        sourcePermalink: draft.sourcePermalink || undefined,
      };
      const newItem = await createSocialItem(saveDraft);
      setSavedItems((prev) => ({ ...prev, [post.id]: true }));
      setError(`Saved as "${newItem.name}" to your storefront!`);
    } catch {
      setError("Failed to save item to storefront. Please try again.");
    } finally {
      setSavingPostId(null);
    }
  };

  return (
    <div className="min-h-screen p-6 animate-slide-in">
      <div className="max-w-6xl mx-auto">
        {/* Header with back button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">
              Social Integration
            </h1>
            <p className="mt-2 text-gray-600">
              Connect your seller channels and import social posts as product
              drafts to your storefront.
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Error and info messages */}
        {error && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-700 mb-6">
            {error}
          </div>
        )}
        {!error && info && (
          <div className="rounded-2xl border border-blue-300 bg-blue-50 p-4 text-blue-800 mb-6">
            {info}
          </div>
        )}

        {/* Connection options and quick actions section */}
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] mb-10">
          {/* Connection options card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  Connection options
                </h2>
                <p className="mt-1 text-gray-600">
                  Available seller social actions and setup status.
                </p>
              </div>
              <RefreshCcw className="w-5 h-5 text-gray-500" />
            </div>

            {loading ? (
              <div className="space-y-4 py-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={`option-skeleton-${index}`}
                    className="skeleton h-28 rounded-2xl"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {options.map((option) => (
                  <div
                    key={option.platform}
                    className="glass p-5 rounded-2xl mb-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.25em] text-purple-600">
                          {option.platform}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-gray-900">
                          {option.action}
                        </h3>
                        <p className="mt-2 text-gray-600">{option.note}</p>
                      </div>
                      {/* Status badge */}
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            option.status === "connected"
                              ? "bg-green-100 text-green-800"
                              : option.status === "ready"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {option.status}
                        </span>
                      </div>
                    </div>
                    {/* OAuth or demo connection button */}
                    {option.oauthUrl ? (
                      <a
                        href={option.oauthUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 btn-primary inline-flex items-center text-sm"
                      >
                        Open Connection
                      </a>
                    ) : option.status === "ready" &&
                      (option.platform === "facebook" ||
                        option.platform === "instagram") ? (
                      <button
                        onClick={() =>
                          handleDemoConnect(
                            option.platform as "facebook" | "instagram",
                          )
                        }
                        disabled={connectingPlatform === option.platform}
                        className="mt-4 btn-primary inline-flex items-center text-sm disabled:opacity-70"
                      >
                        {connectingPlatform === option.platform
                          ? "Connecting..."
                          : `Connect ${option.platform} (Demo)`}
                      </button>
                    ) : (
                      <div className="mt-4 rounded-2xl bg-purple-50 px-4 py-3 text-sm text-purple-700">
                        {option.status === "needs_config"
                          ? "Configure provider keys in .env"
                          : "Provider is ready in demo mode. Refresh posts to load content."}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions sidebar */}
          <div className="card p-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Quick actions
            </h2>
            <p className="mt-2 text-gray-600">
              Import posts and convert them into structured product listings.
            </p>
            <div className="mt-6 space-y-4">
              <button
                onClick={() => navigate("/seller")}
                className="w-full rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-800 hover:bg-purple-100 transition-colors"
              >
                Storefront Dashboard
              </button>
              <button
                onClick={() => {
                  void loadData(true);
                }}
                className="w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-white transition-colors"
              >
                Refresh Posts
              </button>
            </div>
          </div>
        </section>

        {/* Social posts list section */}
        <section className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Recent Social Posts
              </h2>
              <p className="mt-1 text-gray-600">
                Select posts to convert → draft → save as structured listings.
              </p>
            </div>
            <button
              onClick={() => {
                void loadData(true);
              }}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`post-skeleton-${index}`}
                  className="card p-4 skeleton-item"
                >
                  <div className="skeleton skeleton-image" />
                  <div className="skeleton skeleton-text large" />
                  <div className="skeleton skeleton-text" />
                  <div className="skeleton skeleton-text small" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {posts.map((post) => (
                <article key={post.id} className="card bg-white">
                  {/* Post image with platform badge */}
                  <div className="relative h-64 overflow-hidden bg-slate-100">
                    <img
                      src={post.mediaUrl}
                      alt={post.caption || post.id}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src =
                          "https://placehold.co/800x800/png?text=Image+Unavailable";
                      }}
                    />
                    <span className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white">
                      {post.platform.toUpperCase()}
                    </span>
                  </div>
                  <div className="p-5">
                    {/* Post meta and caption */}
                    <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-gray-500">
                      <span>{post.platform}</span>
                      <Link2 className="h-4 w-4 text-gray-500" />
                    </div>
                    <p className="line-clamp-2 text-sm text-gray-700 mb-3">
                      {post.caption}
                    </p>
                    {post.permalink && (
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="mb-4 inline-flex items-center text-xs font-semibold text-purple-700 hover:text-purple-900"
                      >
                        → View original post
                      </a>
                    )}
                    {/* Convert and save buttons */}
                    <div className="space-y-2">
                      <button
                        onClick={() => handleConvertPost(post)}
                        disabled={
                          convertingPostId === post.id ||
                          !!convertedDrafts[post.id]
                        }
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                      >
                        <Wand2 className="h-4 w-4" />
                        {convertingPostId === post.id
                          ? "Converting..."
                          : "Generate Draft"}
                      </button>
                      {/* Draft preview and save section */}
                      {convertedDrafts[post.id] && (
                        <div className="space-y-2 pt-2 border-t">
                          <div className="text-xs text-green-800 bg-green-50 p-2 rounded-lg">
                            <strong>Draft Title:</strong>{" "}
                            {convertedDrafts[post.id].name}
                          </div>
                          {!savedItems[post.id] ? (
                            <button
                              onClick={() =>
                                handleSaveDraft(post, convertedDrafts[post.id])
                              }
                              disabled={savingPostId === post.id}
                              className="w-full btn-success flex items-center gap-2 text-sm disabled:opacity-70"
                            >
                              <PlusCircle className="h-4 w-4" />
                              {savingPostId === post.id
                                ? "Saving..."
                                : "Save to Storefront"}
                            </button>
                          ) : (
                            <div className="text-xs text-green-700 bg-green-50 p-2 rounded-lg text-center font-semibold flex items-center justify-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              Saved to your listings!
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {posts.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">
              No recent posts. Connect your pages to import content.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SellerSocial;