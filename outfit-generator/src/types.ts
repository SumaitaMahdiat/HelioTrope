export type WardrobeCategory =
  | "top"
  | "bottom"
  | "dress"
  | "outerwear"
  | "shoes"
  | "accessories"
  | "bag"
  | "glasses"
  | "makeup";

export type OccasionTag =
  | "casual"
  | "work"
  | "formal"
  | "party"
  | "wedding"
  | "eid"
  | "sports"
  | "travel";

export type OutfitStyle = "classic" | "clueless";

export interface ClosetItemInput {
  id: string;
  name: string;
  category: WardrobeCategory;
  /** Normalized color label, e.g. "navy", "black", "cream" */
  color: string;
  /** Optional occasion hints for this item */
  occasions?: OccasionTag[];
  brand?: string;
}

export interface ClosetImageInput {
  itemId: string;
  name: string;
  mimeType: string;
  dataBase64: string;
}

export interface GeneratedOutfit {
  items: ClosetItemInput[];
  score: number;
  ruleNotes: string[];
}

export interface GenerateRequest {
  closet: ClosetItemInput[];
  occasion?: OccasionTag;
  /** Optional style mode for ranking outfits */
  style?: OutfitStyle;
  /** Optional inline images for visual analysis of closet items */
  closetImages?: ClosetImageInput[];
  /** When true and OPENROUTER_API_KEY is set, adds AI explanation */
  useAI?: boolean;
}
