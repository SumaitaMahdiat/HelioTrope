import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ArrowRight, Share2, Pencil, Trash2, RefreshCcw } from "lucide-react";
import { deleteItem, getImageUrl, getItems, updateItem } from "../api";
import type { ClosetItem, ClosetItemType } from "../api";

const SellerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [storeItems, setStoreItems] = useState<ClosetItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState("");
  const [itemsInfo, setItemsInfo] = useState("");
  const [itemActionLoadingId, setItemActionLoadingId] = useState<string | null>(
    null,
  );

  const allowedTypes: ClosetItemType[] = [
    "clothes",
    "accessories",
    "bags",
    "glasses",
    "shoes",
    "makeup",
  ];

  // Fetch all items from closet
  const loadStoreItems = async () => {
    try {
      setLoadingItems(true);
      setItemsError("");
      const items = await getItems();
      setStoreItems(items);
    } catch {
      setItemsError("Could not load your storefront items.");
    } finally {
      setLoadingItems(false);
    }
  };

  // Delete item after confirmation
  const handleDeleteItem = async (item: ClosetItem) => {
    const confirmed = window.confirm(
      `Delete "${item.name}" from your storefront?`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setItemActionLoadingId(item._id);
      setItemsError("");
      setItemsInfo("");
      await deleteItem(item._id);
      setStoreItems((prev) => prev.filter((x) => x._id !== item._id));
      setItemsInfo(`Deleted "${item.name}".`);
    } catch {
      setItemsError("Could not delete that item. Please try again.");
    } finally {
      setItemActionLoadingId(null);
    }
  };

  // Quick edit item name and type via prompts
  const handleQuickEditItem = async (item: ClosetItem) => {
    const nextNameRaw = window.prompt("Edit product name", item.name);
    if (nextNameRaw == null) {
      return;
    }
    const nextName = nextNameRaw.trim();
    if (!nextName) {
      setItemsError("Product name cannot be empty.");
      return;
    }

    const nextTypeRaw = window.prompt(
      "Edit type (clothes, accessories, bags, glasses, shoes, makeup)",
      item.type,
    );
    if (nextTypeRaw == null) {
      return;
    }
    const nextType = nextTypeRaw.trim().toLowerCase() as ClosetItemType;
    if (!allowedTypes.includes(nextType)) {
      setItemsError(
        "Invalid type. Use one of: clothes, accessories, bags, glasses, shoes, makeup.",
      );
      return;
    }

    try {
      setItemActionLoadingId(item._id);
      setItemsError("");
      setItemsInfo("");

      const formData = new FormData();
      formData.append("name", nextName);
      formData.append("type", nextType);

      const updatedItem = await updateItem(item._id, formData);
      setStoreItems((prev) =>
        prev.map((x) => (x._id === item._id ? updatedItem : x)),
      );
      setItemsInfo(`Updated "${updatedItem.name}".`);
    } catch {
      setItemsError("Could not update that item. Please try again.");
    } finally {
      setItemActionLoadingId(null);
    }
  };

  useEffect(() => {
    void loadStoreItems();
  }, []);

  return (
    <div className="min-h-screen p-6 animate-slide-in">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-12 glass p-8 rounded-3xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Seller Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Welcome back, {user?.name}. Manage your social listings and seller
            tools here.
          </p>
        </div>

        {/* Quick access cards */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Social integration card */}
          <Link
            to="/seller/social"
            className="group glass p-8 rounded-3xl border border-white/50 hover:border-white transition-all hover:shadow-lg hover:-translate-y-1"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-purple-600 font-semibold">
                  Social Integration
                </p>
                <h2 className="mt-4 text-2xl font-bold text-gray-900">
                  Connect social posts
                </h2>
              </div>
              <div className="p-3 bg-purple-100 rounded-2xl group-hover:scale-110 transition-transform">
                <Share2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Import your Facebook and Instagram posts and convert them into
              sales-ready product listings.
            </p>
            <div className="inline-flex items-center gap-2 text-purple-700 font-semibold group-hover:translate-x-1 transition-transform">
              Open social tools
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          {/* Quick actions info card */}
          <div className="glass p-8 rounded-3xl border border-white/50">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Seller quick actions
            </h2>
            <p className="text-gray-600 mb-6">
              Use this dashboard to connect pages, review imported posts, and
              prepare new listings for your store.
            </p>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-purple-600 font-bold mt-0.5">•</span>
                <span>Connect Facebook and Instagram business feeds</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-600 font-bold mt-0.5">•</span>
                <span>Review social post drafts</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-600 font-bold mt-0.5">•</span>
                <span>Convert posts into product listings</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-600 font-bold mt-0.5">•</span>
                <span>Track social listings in one place</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Storefront items section */}
        <section className="mt-10 glass p-8 rounded-3xl border border-white/50">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Your Storefront Items
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Products saved from social posts will appear here.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Reload button */}
              <button
                onClick={() => {
                  void loadStoreItems();
                }}
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                <RefreshCcw className="h-4 w-4" />
                Reload Items
              </button>
              {/* Link to social imports */}
              <Link
                to="/seller/social"
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                Manage Social Imports
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Error message */}
          {itemsError && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
              {itemsError}
            </div>
          )}
          {/* Success message */}
          {!itemsError && itemsInfo && (
            <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 mb-4">
              {itemsInfo}
            </div>
          )}

          {/* Items grid or skeleton loader */}
          {loadingItems ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`seller-item-skeleton-${index}`}
                  className="card p-4 skeleton-item"
                >
                  <div className="skeleton skeleton-image" />
                  <div className="skeleton skeleton-text large" />
                  <div className="skeleton skeleton-text" />
                </div>
              ))}
            </div>
          ) : storeItems.length === 0 ? (
            <div className="rounded-2xl border border-purple-100 bg-purple-50 p-5 text-sm text-purple-800">
              No storefront items yet. Save a converted social post to see it
              here.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {storeItems.slice(0, 9).map((item) => (
                <article
                  key={item._id}
                  className="card bg-white overflow-hidden"
                >
                  {/* Item image */}
                  <div className="h-44 bg-slate-100">
                    {item.imageUrl ? (
                      <img
                        src={getImageUrl(item.imageUrl)}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-sm text-gray-500">
                        No image
                      </div>
                    )}
                  </div>
                  {/* Item info and actions */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 capitalize">
                      {item.type}
                      {item.platform ? ` • from ${item.platform}` : ""}
                    </p>
                    {/* Edit and delete buttons */}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          void handleQuickEditItem(item);
                        }}
                        disabled={itemActionLoadingId === item._id}
                        className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 inline-flex items-center justify-center gap-1"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          void handleDeleteItem(item);
                        }}
                        disabled={itemActionLoadingId === item._id}
                        className="flex-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 inline-flex items-center justify-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SellerDashboard;
