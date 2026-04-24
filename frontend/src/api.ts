import axios from "axios";

// API configuration - use env variable or default to localhost
export const API_ORIGIN =
  import.meta.env.VITE_API_URL || "http://localhost:5001";
const API_BASE = `${API_ORIGIN}/api/closet`;

const withAuthHeader = (config: { headers?: unknown }) => {
  const token = localStorage.getItem("token");
  if (!token) {
    return config;
  }

  config.headers = {
    ...(typeof config.headers === "object" && config.headers
      ? config.headers
      : {}),
    Authorization: `Bearer ${token}`,
  };
  return config;
};

const createAuthedApi = (baseURL: string) => {
  const instance = axios.create({ baseURL });
  instance.interceptors.request.use(withAuthHeader);
  return instance;
};

// Axios instance for closet API calls
export const api = createAuthedApi(API_BASE);

// Closet item type union
export type ClosetItemType =
  | "clothes"
  | "accessories"
  | "bags"
  | "glasses"
  | "shoes"
  | "makeup";

// Closet item data model
export interface ClosetItem {
  _id: string;
  name: string;
  type: ClosetItemType;
  colors: string[];
  brand?: string;
  occasions: string[];
  imageUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Social import fields
  sourcePostId?: string;
  platform?: "facebook" | "instagram";
  sourcePermalink?: string;
}

// Resolve image URL (handle both relative and absolute URLs)
export const getImageUrl = (imageUrl?: string) => {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  return `${API_ORIGIN}${imageUrl}`;
};

// Fetch closet items with optional type filter
export const getItems = async (type?: string) => {
  const response = await api.get<{ items: ClosetItem[] }>("/items", {
    params: { type },
  });
  return response.data.items;
};

// Create new closet item with image upload
export const createItem = async (formData: FormData) => {
  const response = await api.post<{ item: ClosetItem }>("/items", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data.item;
};

// Create closet item from social media post draft
export const createSocialItem = async (draft: Partial<ClosetItem>) => {
  const formData = new FormData();
  formData.append("name", draft.name || "Social Import");
  formData.append("type", draft.type || "clothes");
  formData.append("imageUrl", draft.imageUrl || "");
  formData.append("notes", draft.notes || "");
  if (draft.sourcePostId) formData.append("sourcePostId", draft.sourcePostId);
  if (draft.platform) formData.append("platform", draft.platform);
  if (draft.sourcePermalink)
    formData.append("sourcePermalink", draft.sourcePermalink);
  const response = await api.post<{ item: ClosetItem }>("/items", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data.item;
};

// Update closet item with optional image upload
export const updateItem = async (id: string, formData: FormData) => {
  const response = await api.patch<{ item: ClosetItem }>(
    `/items/${id}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data.item;
};

// Delete closet item
export const deleteItem = async (id: string) => {
  await api.delete(`/items/${id}`);
};

// Social integration API setup
const SOCIAL_BASE = `${API_ORIGIN}/api/social`;
const socialApi = createAuthedApi(SOCIAL_BASE);

// Get available social media connection options for user
export const getSocialConnectionOptions = async () => {
  return socialApi.get("/connections/options");
};

// Connect to demo social media accounts (testing only)
export const connectSocialDemo = async (
  platform: "facebook" | "instagram" | "both",
) => {
  return socialApi.post("/demo/connect", { platform });
};

// Fetch all social posts from connected accounts
export const getSocialPosts = async (forceRefresh = false) => {
  return socialApi.get("/import/all", {
    params: forceRefresh ? { _t: Date.now() } : undefined,
  });
};

// Fetch Facebook page posts with optional credentials
export const getFacebookPosts = async (
  pageId?: string,
  accessToken?: string,
) => {
  return socialApi.get("/facebook/posts", {
    params: { page_id: pageId, access_token: accessToken },
  });
};

// Fetch Instagram media with optional credentials
export const getInstagramMedia = async (
  igUserId?: string,
  accessToken?: string,
) => {
  return socialApi.get("/instagram/media", {
    params: { ig_user_id: igUserId, access_token: accessToken },
  });
};

// Convert single social post to product draft
export const convertSocialPost = async (post: unknown) => {
  return socialApi.post("/import/convert", { post });
};

// Convert multiple social posts to product drafts
export const convertManySocialPosts = async (posts: unknown[]) => {
  return socialApi.post("/import/convert-many", { posts });
};

// Commerce API setup
const COMMERCE_BASE = `${API_ORIGIN}/api/commerce`;
const commerceApi = createAuthedApi(COMMERCE_BASE);

export interface MarketplaceProduct {
  id: string;
  sellerId: string;
  sellerName: string;
  name: string;
  type: ClosetItemType;
  colors: string[];
  brand: string | null;
  occasions: string[];
  imageUrl: string | null;
  notes: string | null;
  platform: "facebook" | "instagram" | null;
  sourcePermalink: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CartLine {
  product: MarketplaceProduct;
  quantity: number;
  addedAt: string | null;
}

export interface CartSnapshot {
  items: CartLine[];
  totalItems: number;
}

export interface MarketplaceProductsResponse {
  products: MarketplaceProduct[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface ProductSuggestionResponse {
  selectedProduct: { id: string; name: string };
  recommendation: { assistant: string | null; model: string | null };
  relatedClosetProducts: MarketplaceProduct[];
  relatedMarketplaceProducts: MarketplaceProduct[];
  outfits: Array<{
    items: Array<{ id: string; name: string; category: string; color: string }>;
    score: number;
    ruleNotes: string[];
  }>;
  bestOutfit: {
    items: Array<{
      id: string;
      name: string;
      category: string;
      color: string;
    }>;
    score: number;
    ruleNotes: string[];
  } | null;
  ai: {
    explanation: string | null;
    closetBasedSuggestion?: string | null;
    enabled?: boolean;
  } | null;
  source: {
    closetCount: number;
    shopCount: number;
  };
}

export const getMarketplaceProducts = async (params?: {
  q?: string;
  type?: ClosetItemType;
  category?: string;
  limit?: number;
  page?: number;
}) => {
  const response = await commerceApi.get<MarketplaceProductsResponse>(
    "/products",
    {
      params: {
        ...params,
        category: params?.category,
      },
    },
  );
  return response.data;
};

export const getCart = async () => {
  const response = await commerceApi.get<CartSnapshot>("/cart");
  return response.data;
};

export const addToCart = async (productId: string, quantity = 1) => {
  const response = await commerceApi.post<CartSnapshot>("/cart", {
    productId,
    quantity,
  });
  return response.data;
};

export const removeCartItem = async (productId: string) => {
  const response = await commerceApi.delete<CartSnapshot>(`/cart/${productId}`);
  return response.data;
};

export const checkoutCart = async () => {
  const response = await commerceApi.post<{
    success: boolean;
    message: string;
    purchasedCount: number;
  }>("/checkout");
  return response.data;
};

export const getProductSuggestions = async (
  productId: string,
  payload?: {
    occasion?: string;
    style?: "classic" | "clueless";
    useAI?: boolean;
    context?: { city?: string; season?: string };
  },
) => {
  const response = await commerceApi.post<ProductSuggestionResponse>(
    `/products/${productId}/suggestions`,
    payload || {},
  );
  return response.data;
};
