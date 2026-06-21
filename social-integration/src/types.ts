export interface SocialPost {
  id: string;
  platform: "facebook" | "instagram";
  caption: string | null;
  mediaUrl: string | null;
  permalink: string | null;
  createdAt: string;
  raw?: Record<string, unknown>; // Original API response
}

export interface ProductDraftFromPost {
  title: string;
  description: string;
  sourcePostId: string; // Reference to original social post
  platform: SocialPost["platform"];
  suggestedPrice?: number;
  imageUrls: string[];
}
