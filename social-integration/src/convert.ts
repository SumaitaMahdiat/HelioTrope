import type { ProductDraftFromPost, SocialPost } from "./types.js";

/** Heuristic draft for turning a social post into a product listing (seller review required). */
export function postToProductDraft(post: SocialPost): ProductDraftFromPost {
  const titleBase =
    post.caption?.split(/\n|\.|\#/)[0]?.trim().slice(0, 80) || "Listing from social post";
  const title = titleBase.length < 3 ? `Item from ${post.platform}` : titleBase;

  return {
    title,
    description: post.caption ?? "",
    sourcePostId: post.id,
    platform: post.platform,
    imageUrls: post.mediaUrl ? [post.mediaUrl] : [],
  };
}
