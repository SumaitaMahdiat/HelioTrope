export interface ClosetSummaryItem {
  id: string;
  name: string;
  category: string;
  color?: string;
  brand?: string;
  occasions?: string[];
  hasImage?: boolean;
}

export interface ClosetImageInput {
  itemId: string;
  name: string;
  mimeType: string;
  dataBase64: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  /** Optional snapshot of the user's digital closet for personalization */
  closet?: ClosetSummaryItem[];
  /** Optional image inputs for visual analysis of closet items */
  closetImages?: ClosetImageInput[];
  /** User locale or city for context */
  context?: { city?: string; season?: string };
}
