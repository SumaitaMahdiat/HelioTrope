import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMarketplaceProducts,
  getImageUrl,
  getProductSuggestions,
  createItem,
  type MarketplaceProduct,
  type ProductSuggestionResponse,
} from "../api";

const Marketplace = () => {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [closetLoadingId, setClosetLoadingId] = useState<string | null>(null);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [suggestions, setSuggestions] =
    useState<ProductSuggestionResponse | null>(null);
  const [suggestionLoadingId, setSuggestionLoadingId] = useState<string | null>(
    null,
  );
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef(1);
  const pageSize = 24;

  const CATEGORIES = [
    { value: "", label: "All Categories" },
    { value: "smartphones", label: "Smartphones" },
    { value: "laptops", label: "Laptops" },
    { value: "fragrances", label: "Fragrances" },
    { value: "groceries", label: "Groceries (Food)" },
  ] as const;

  const getApiErrorMessage = (err: any, fallback: string) => {
    const apiError = err.response?.data?.error;
    if (typeof apiError === "string" && apiError.trim()) {
      return apiError;
    }
    if (typeof err.message === "string" && err.message.trim()) {
      return err.message;
    }
    return fallback;
  };

  const refreshMarketplace = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setAddedProductId(null);
      pageRef.current = 1;
      setProducts([]);
      const listing = await getMarketplaceProducts({
        q: search || undefined,
        category: category || undefined,
        limit: pageSize,
        page: 1,
      });

      setProducts(listing.products);
      setHasMore(listing.pagination.hasMore);
    } catch {
      setError("Could not load marketplace data.");
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  const loadMoreProducts = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = pageRef.current + 1;
      const listing = await getMarketplaceProducts({
        q: search || undefined,
        category: category || undefined,
        limit: pageSize,
        page: nextPage,
      });

      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const uniqueIncoming = listing.products.filter(
          (p: MarketplaceProduct) => !seen.has(p.id),
        );

        return [...prev, ...uniqueIncoming];
      });
      setHasMore(listing.pagination.hasMore);
      pageRef.current = nextPage;
    } catch {
      setError("Could not load more marketplace products.");
    } finally {
      setLoadingMore(false);
    }
  }, [category, hasMore, loading, loadingMore, search]);

  useEffect(() => {
    void refreshMarketplace();
  }, [search, category]);

  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          void loadMoreProducts();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(loader);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMoreProducts]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await refreshMarketplace();
  };

  const handleAddToCloset = async (product: MarketplaceProduct) => {
    try {
      setClosetLoadingId(product.id);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("name", product.name);
      formData.append("type", product.type);
      product.colors.forEach((color) => formData.append("colors", color));
      if (product.brand) formData.append("brand", product.brand);
      product.occasions.forEach((occasion) =>
        formData.append("occasions", occasion),
      );
      if (product.imageUrl) formData.append("imageUrl", product.imageUrl);
      formData.append("notes", `${product.name} (Added from Marketplace)`);

      await createItem(formData);
      setAddedProductId(product.id);
      setSuccess(`${product.name} added to your closet.`);
    } catch (err) {
      if (err && typeof err === "object" && "response" in err) {
        const response = (
          err as { response?: { status?: number; data?: { error?: string } } }
        ).response;
        if (response?.status === 409) {
          setAddedProductId(product.id);
          setSuccess(`${product.name} is already in your closet.`);
          return;
        }
      }
      const errMsg = getApiErrorMessage(err, "Could not add item to closet.");
      setError(errMsg);
    } finally {
      setClosetLoadingId(null);
    }
  };

  const handleSuggest = async (product: MarketplaceProduct) => {
    try {
      setSuggestionLoadingId(product.id);
      setError("");
      console.log("[Marketplace] Getting suggestions for:", {
        productId: product.id,
        name: product.name,
        type: product.type,
      });
      const data = await getProductSuggestions(product.id, {
        style: "clueless",
        useAI: true,
        context: { city: "Dhaka", season: "summer" },
      });
      console.log("[Marketplace] Suggestions received:", data);
      console.log("[Marketplace] Suggestions breakdown:", {
        selectedProduct: data.selectedProduct,
        hasAI: !!data.ai,
        aiExplanation: data.ai?.explanation ? "Yes" : "No",
        hasRecommendation: !!data.recommendation,
        recommendationAssistant: data.recommendation?.assistant ? "Yes" : "No",
        hasBestOutfit: !!data.bestOutfit,
        outfitsCount: data.outfits?.length || 0,
      });
      setSuggestions(data);
    } catch (err) {
      const errMsg = getApiErrorMessage(
        err,
        "Could not generate suggestions for this product.",
      );
      console.error("[Marketplace] Suggestions error:", errMsg, err);
      setError(errMsg);
    } finally {
      setSuggestionLoadingId(null);
    }
  };

  //
  return (
    <div className="min-h-screen bg-linear-to-b from-amber-50 via-orange-50 to-rose-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Marketplace</h1>
            <p className="text-gray-600 mt-2">
              Browse seller products, add to closet directly, and get styling
              suggestions.
            </p>
          </div>
          {/* Cart functionality replaced with direct closet add */}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-1 gap-6">
          <section className="lg:col-span-1">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, brand, notes"
                  className="flex-1 rounded-xl border border-orange-200 px-4 py-3 bg-white/90"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-orange-600 text-white px-5 py-3 font-semibold whitespace-nowrap"
                >
                  Search
                </button>
              </form>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl border border-orange-200 px-4 py-3 bg-white/90 min-w-40 text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="text-gray-600">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="rounded-xl border border-orange-200 bg-white/80 p-6 text-gray-700">
                No products found.
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <article
                      key={product.id}
                      className="rounded-2xl border border-orange-100 bg-white shadow-sm overflow-hidden"
                    >
                      <div className="h-48 bg-orange-50">
                        {product.imageUrl ? (
                          <img
                            src={getImageUrl(product.imageUrl)}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-orange-400">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 line-clamp-1">
                          {product.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Seller: {product.sellerName}
                        </p>
                        <p className="text-xs text-gray-500 capitalize mt-1">
                          {product.type}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {product.colors.slice(0, 3).map((c) => (
                            <span
                              key={`${product.id}-${c}`}
                              className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-900"
                            >
                              {c}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => {
                              void handleAddToCloset(product);
                            }}
                            disabled={closetLoadingId === product.id}
                            className="flex-1 rounded-xl bg-emerald-600 text-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
                          >
                            {addedProductId === product.id
                              ? "Added ✓"
                              : closetLoadingId === product.id
                                ? "Adding..."
                                : "Add to Closet"}
                          </button>

                          <button
                            onClick={() => {
                              void handleSuggest(product);
                            }}
                            disabled={suggestionLoadingId === product.id}
                            className="flex-1 rounded-xl bg-orange-600 text-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
                          >
                            {suggestionLoadingId === product.id
                              ? "Thinking..."
                              : "Suggest with this"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div ref={loaderRef} className="h-8" />
                {loadingMore && (
                  <p className="mt-3 text-sm text-gray-600">
                    Loading more products...
                  </p>
                )}
              </>
            )}
          </section>
        </div>

        {suggestions && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
            style={{ zIndex: 9999 }}
          >
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">
                      ✨ AI Styling Suggestion
                    </h2>
                    <p className="text-orange-600 font-medium mt-1">
                      {suggestions.selectedProduct?.name || "Unknown Product"}
                    </p>
                  </div>
                  <button
                    onClick={() => setSuggestions(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {suggestions.ai?.explanation && (
                  <div className="mb-8 bg-orange-50 rounded-2xl p-6 border border-orange-100">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Styling Suggestion
                    </h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {suggestions.ai.explanation}
                    </p>
                  </div>
                )}

                {!suggestions.ai?.explanation &&
                  suggestions.ai?.closetBasedSuggestion && (
                    <div className="mb-8 bg-orange-50 rounded-2xl p-6 border border-orange-100">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Closet-Based Suggestion
                      </h3>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {suggestions.ai.closetBasedSuggestion}
                      </p>
                    </div>
                  )}

                {suggestions.recommendation?.assistant && (
                  <div className="mb-8 bg-blue-50 rounded-2xl p-6 border border-blue-100">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      AI Recommendation
                    </h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {suggestions.recommendation.assistant}
                    </p>
                  </div>
                )}

                {(suggestions.relatedClosetProducts?.length > 0 ||
                  suggestions.relatedMarketplaceProducts?.length > 0) && (
                  <div className="mb-8">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Same-Category Suggestions
                    </h3>
                    {suggestions.relatedClosetProducts?.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-emerald-700 mb-2">
                          From your closet
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {suggestions.relatedClosetProducts.map((product) => (
                            <div
                              key={`closet-${product.id}`}
                              className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"
                            >
                              <p className="font-medium text-gray-900 line-clamp-1">
                                {product.name}
                              </p>
                              <p className="text-xs text-gray-600 capitalize mt-1">
                                {product.type}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {suggestions.relatedMarketplaceProducts?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-orange-700 mb-2">
                          Marketplace picks
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {suggestions.relatedMarketplaceProducts.map(
                            (product) => (
                              <div
                                key={`market-${product.id}`}
                                className="rounded-xl border border-orange-100 bg-orange-50 p-3"
                              >
                                <p className="font-medium text-gray-900 line-clamp-1">
                                  {product.name}
                                </p>
                                <p className="text-xs text-gray-600 capitalize mt-1">
                                  {product.type}
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {suggestions.bestOutfit &&
                  suggestions.bestOutfit.items.length > 0 && (
                    <div className="mb-8">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-2xl">👗</span> Best Outfit Mix
                        (Score:{" "}
                        {Math.round(suggestions.bestOutfit.score * 100) / 100})
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {suggestions.bestOutfit.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-linear-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-orange-100"
                          >
                            <p className="font-semibold text-gray-900">
                              {item.name}
                            </p>
                            <p className="text-sm text-gray-600 capitalize">
                              {item.category}
                            </p>
                            {item.color && (
                              <p className="text-sm text-orange-700 mt-2">
                                Color:{" "}
                                <span className="font-medium">
                                  {item.color}
                                </span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      {suggestions.bestOutfit.ruleNotes &&
                        suggestions.bestOutfit.ruleNotes.length > 0 && (
                          <div className="mt-4 text-sm text-gray-600">
                            <p className="font-medium text-gray-700 mb-2">
                              Why this works:
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                              {suggestions.bestOutfit.ruleNotes.map(
                                (note, idx) => (
                                  <li key={idx}>{note}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}
                    </div>
                  )}

                {suggestions.outfits && suggestions.outfits.length > 1 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Alternative Combinations
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {suggestions.outfits.slice(1, 4).map((outfit, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                        >
                          <p className="text-sm font-medium text-gray-900">
                            Option {idx + 2}:{" "}
                            {outfit.items.map((i) => i.name).join(" + ")}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Score: {Math.round(outfit.score * 100) / 100}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-100 border border-blue-300 rounded-xl p-4 mt-8">
                  <p className="text-sm text-blue-900">
                    This suggestion combines items from your closet (
                    {suggestions.source?.closetCount || 0}) and the marketplace
                    ({suggestions.source?.shopCount || 0} items available).
                  </p>
                </div>

                {!suggestions.ai && !suggestions.recommendation?.assistant && (
                  <div className="bg-yellow-100 border border-yellow-300 rounded-xl p-4 mt-4">
                    <p className="text-xs text-yellow-900 font-mono">
                      Debug:{" "}
                      {JSON.stringify({
                        outfitCount: suggestions.outfits?.length,
                        hasBestOutfit: !!suggestions.bestOutfit,
                      })}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setSuggestions(null)}
                  className="w-full mt-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {success && (
        <div className="fixed top-4 right-4 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 max-w-sm">
          {success}
          <button
            onClick={() => setSuccess("")}
            className="ml-4 text-white/80 hover:text-white text-xl leading-none"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
