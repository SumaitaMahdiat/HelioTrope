import axios from "axios";

const API_ORIGIN = import.meta.env.VITE_API_URL || "http://localhost:5001";
const API_BASE = `${API_ORIGIN}/api/closet`;

export const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type ClosetItemType =
  | "clothes"
  | "accessories"
  | "bags"
  | "glasses"
  | "shoes"
  | "makeup";

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
  // Social fields
  sourcePostId?: string;
  platform?: "facebook" | "instagram";
  sourcePermalink?: string;
}

export const getImageUrl = (imageUrl?: string) => {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  return `${API_ORIGIN}${imageUrl}`;
};

export const getItems = async (type?: string) => {
  const response = await api.get<{ items: ClosetItem[] }>("/items", {
    params: { type },
  });
  return response.data.items;
};

export const createItem = async (formData: FormData) => {
  const response = await api.post<{ item: ClosetItem }>("/items", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data.item;
};

// New: Create social item from draft (uses /items FormData)
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

export const deleteItem = async (id: string) => {
  await api.delete(`/items/${id}`);
};

const SOCIAL_BASE = `${API_ORIGIN}/api/social`;
const socialApi = axios.create({
  baseURL: SOCIAL_BASE,
});

socialApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getSocialConnectionOptions = async () => {
  return socialApi.get("/connections/options");
};

export const connectSocialDemo = async (
  platform: "facebook" | "instagram" | "both",
) => {
  return socialApi.post("/demo/connect", { platform });
};

export const getSocialPosts = async (forceRefresh = false) => {
  return socialApi.get("/import/all", {
    params: forceRefresh ? { _t: Date.now() } : undefined,
  });
};

export const getFacebookPosts = async (
  pageId?: string,
  accessToken?: string,
) => {
  return socialApi.get("/facebook/posts", {
    params: { page_id: pageId, access_token: accessToken },
  });
};

export const getInstagramMedia = async (
  igUserId?: string,
  accessToken?: string,
) => {
  return socialApi.get("/instagram/media", {
    params: { ig_user_id: igUserId, access_token: accessToken },
  });
};

export const convertSocialPost = async (post: unknown) => {
  return socialApi.post("/import/convert", { post });
};

export const convertManySocialPosts = async (posts: unknown[]) => {
  return socialApi.post("/import/convert-many", { posts });
};

// DummyJSON Auth helpers
export const loginDemo = async (email: string, password: string) => {
  const response = await axios.post(`${API_ORIGIN}/api/auth/login?demo=true`, {
    email,
    password,
  });
  return response.data;
};

export const getDummyUsers = async () => {
  const response = await axios.get("https://dummyjson.com/users?limit=5");
  return response.data.users;
};
