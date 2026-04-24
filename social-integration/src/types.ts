export interface SocialPost {
  id: string;
  platform: "facebook" | "instagram";
  caption: string | null;
  mediaUrl: string | null;
  permalink: string | null;
  createdAt: string;
  raw?: Record<string, unknown>;
}

export interface ProductDraftFromPost {
  title: string;
  description: string;
  sourcePostId: string;
  platform: SocialPost["platform"];
  suggestedPrice?: number;
  imageUrls: string[];
}
