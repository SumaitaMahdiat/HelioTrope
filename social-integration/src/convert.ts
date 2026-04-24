import type { ProductDraftFromPost, SocialPost } from "./types.js";

// Convert social media post to product draft for listing
export function postToProductDraft(post: SocialPost): ProductDraftFromPost {
  // Extract title from first line of caption, fallback to platform-based default
  const titleBase =
    post.caption
      ?.split(/\n|\.|\#/)[0]
      ?.trim()
      .slice(0, 80) || "Listing from social post";
  const title = titleBase.length < 3 ? `Item from ${post.platform}` : titleBase;

  return {
    title,
    description: post.caption ?? "",
    sourcePostId: post.id,
    platform: post.platform,
    imageUrls: post.mediaUrl ? [post.mediaUrl] : [],
  };
}
