const DUMMYJSON = "https://dummyjson.com";

export interface FetchInstagramMediaOptions {
  igUserId: string;
  accessToken: string;
  limit?: number;
}

export async function fetchInstagramMedia(
  options: FetchInstagramMediaOptions,
): Promise<{ posts: import("./types.js").SocialPost[]; error?: string }> {
  const { limit = 25 } = options;

  try {
    const [postsRes, usersRes, productsRes] = await Promise.all([
      fetch(`${DUMMYJSON}/posts?limit=${limit}`),
      fetch(`${DUMMYJSON}/users?limit=${limit}`),
      fetch(`${DUMMYJSON}/products?limit=${limit}`),
    ]);
    const [postsData, usersData, productsData] = (await Promise.all([
      postsRes.json(),
      usersRes.json(),
      productsRes.json(),
    ])) as [
      { posts: Array<{ id: number; title: string; body: string }> },
      { users: Array<{ firstName: string; lastName: string }> },
      {
        products: Array<{
          images: string[];
          title: string;
          thumbnail?: string;
        }>;
      },
    ];

    const posts: import("./types.js").SocialPost[] = postsData.posts.map(
      (post, idx) => {
        const user = usersData.users[idx % usersData.users.length];
        const product =
          productsData.products[idx % productsData.products.length];
        return {
          id: `ig_${post.id}`,
          platform: "instagram" as const,
          caption: `${user.firstName} ${user.lastName} posted about ${product.title}. ${post.body.slice(0, 200)} #fashion`,
          mediaUrl: product.images?.[0] || product.thumbnail || null,
          permalink: `https://instagram.com/p/demo_${post.id}`,
          createdAt: new Date(Date.now() - idx * 3600000).toISOString(),
          raw: post,
        };
      },
    );

    return { posts };
  } catch (err) {
    return {
      posts: [],
      error: `Failed to fetch: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}
