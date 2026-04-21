import { useEffect, useMemo, useRef, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  getMarketplaceProducts,
  getImageUrl,
  getProductSuggestions,
  type MarketplaceProduct,
  type ProductSuggestionResponse,
} from "../api";
import CartDrawer from "../components/CartDrawer";
import { useCart } from "../context/CartContext";

const Marketplace = () => {
  const navigate = useNavigate();
  const { cart, totalItems, addToCart, removeFromCart } = useCart();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [cartLoading, setCartLoading] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [suggestions, setSuggestions] =
    useState<ProductSuggestionResponse | null>(null);
  const [suggestionLoadingId, setSuggestionLoadingId] = useState<string | null>(
    null,
  );
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const pageSize = 24;

  const getApiErrorMessage = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
      const apiError = err.response?.data?.error;
      if (typeof apiError === "string" && apiError.trim()) {
        return apiError;
      }
      if (typeof err.message === "string" && err.message.trim()) {
        return err.message;
      }
    }
    return fallback;
  };

  const refreshMarketplace = async () => {
    try {
      setLoading(true);
      setError("");
      const listing = await getMarketplaceProducts({
        q: search || undefined,
        limit: pageSize,
        page: 1,
      });

      setProducts(listing.products);
      setHasMore(listing.pagination.hasMore);
      setPage(1);
    } catch {
      setError("Could not load marketplace data.");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreProducts = async () => {
    if (loading || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const listing = await getMarketplaceProducts({
        q: search || undefined,
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
      setPage(nextPage);
    } catch {
      setError("Could not load more marketplace products.");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void refreshMarketplace();
  }, []);

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
  }, [hasMore, loading, loadingMore, page, search]);

  const cartProductIds = useMemo(
    () => new Set((cart?.items || []).map((line) => line.product.id)),
    [cart],
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await refreshMarketplace();
  };

  const handleAddToCart = async (product: MarketplaceProduct) => {
    try {
      setCartLoading(true);
      setError("");
      console.log("[Marketplace] Adding to cart:", {
        productId: product.id,
        name: product.name,
      });
      await addToCart(product.id, 1);
      console.log("[Marketplace] Successfully added to cart");
    } catch (err) {
      const errMsg = getApiErrorMessage(err, "Could not add item to cart.");
      console.error("[Marketplace] Add to cart error:", errMsg, err);
      setError(errMsg);
    } finally {
      setCartLoading(false);
    }
  };

  const handleRemoveCartItem = async (productId: string) => {
    try {
      setCartLoading(true);
      setError("");
      await removeFromCart(productId);
    } catch {
      setError("Could not remove cart item.");
    } finally {
      setCartLoading(false);
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

  return (
    <div className="min-h-screen bg-linear-to-b from-amber-50 via-orange-50 to-rose-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Marketplace</h1>
            <p className="text-gray-600 mt-2">
              Browse seller products, add to cart, and get styling suggestions.
            </p>
          </div>
          <button
            onClick={() => setCartDrawerOpen(true)}
            className="relative rounded-full bg-orange-500 hover:bg-orange-600 text-white p-4 shadow-lg transition-all"
          >
            <ShoppingCart className="w-6 h-6" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-1 gap-6">
          <section className="lg:col-span-1">
            <form onSubmit={handleSearch} className="mb-4 flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, brand, notes"
                className="w-full rounded-xl border border-orange-200 px-4 py-3 bg-white/90"
              />
              <button
                type="submit"
                className="rounded-xl bg-orange-600 text-white px-5 py-3 font-semibold"
              >
                Search
              </button>
            </form>

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
                              void handleAddToCart(product);
                            }}
                            disabled={cartLoading}
                            className="flex-1 rounded-xl bg-emerald-600 text-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
                          >
                            {cartProductIds.has(product.id)
                              ? "In Cart"
                              : "Add to Cart"}
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
                {!hasMore && products.length > 0 && (
                  <p className="mt-3 text-sm text-gray-500">
                    You reached the end of listings.
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
                    💡 This suggestion combines items from your closet (
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

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        cart={cart || { items: [], totalItems: 0 }}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={() => {
          setCartDrawerOpen(false);
          navigate("/checkout");
        }}
        cartLoading={cartLoading}
      />
    </div>
  );
};

export default Marketplace;
