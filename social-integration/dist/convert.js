export function postToProductDraft(post) {
    const titleBase = post.caption
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
