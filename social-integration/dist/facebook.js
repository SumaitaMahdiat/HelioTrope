const DUMMYJSON = "https://dummyjson.com";
// Fetch Facebook page posts from demo source and transform to SocialPost format
export async function fetchFacebookPagePosts(options) {
    const { limit = 25 } = options;
    try {
        // Fetch posts, users, and products in parallel from demo API
        const [postsRes, usersRes, productsRes] = await Promise.all([
            fetch(`${DUMMYJSON}/posts?limit=${limit}`),
            fetch(`${DUMMYJSON}/users?limit=${limit}`),
            fetch(`${DUMMYJSON}/products?limit=${limit}`),
        ]);
        const [postsData, usersData, productsData] = (await Promise.all([
            postsRes.json(),
            usersRes.json(),
            productsRes.json(),
        ]));
        // Map demo data to SocialPost format
        const posts = postsData.posts.map((post, idx) => {
            const user = usersData.users[idx % usersData.users.length];
            const product = productsData.products[idx % productsData.products.length];
            return {
                id: `fb_${post.id}`,
                platform: "facebook",
                // Combine user name and post content, truncate to 280 chars
                caption: `${user.firstName} ${user.lastName}: ${post.title} — ${post.body}`.slice(0, 280),
                mediaUrl: product.thumbnail || null,
                permalink: `https://facebook.com/demo/post/${post.id}`,
                // Simulate different post times (1 hour apart)
                createdAt: new Date(Date.now() - idx * 3600000).toISOString(),
                raw: post,
            };
        });
        return { posts };
    }
    catch (err) {
        return {
            posts: [],
            error: `Failed to fetch: ${err instanceof Error ? err.message : "Unknown error"}`,
        };
    }
}
// Build Facebook OAuth authorization URL for app flow
export function facebookOAuthAuthorizeUrl(params) {
    const u = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    u.searchParams.set("client_id", params.appId);
    u.searchParams.set("redirect_uri", params.redirectUri);
    u.searchParams.set("state", params.state);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", params.scopes.join(","));
    return u.toString();
}
