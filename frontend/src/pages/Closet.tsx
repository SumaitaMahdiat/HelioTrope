import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Trash2, Edit3, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { getItems, deleteItem, getImageUrl } from "../api";
import type { ClosetItem, ClosetItemType } from "../api";
import AddItemModal from "../components/AddItemModal";
import ConfirmDelete from "../components/ConfirmDelete";

const CLOSET_ITEM_TYPES: ClosetItemType[] = [
  "clothes",
  "accessories",
  "bags",
  "glasses",
  "shoes",
  "makeup",
];

function Closet() {
  const { user } = useAuth();
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | undefined>(); // Filter by item type
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClosetItem | null>(null);
  const [searchText, setSearchText] = useState(""); // Search by name, brand, color, or occasion
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    itemId?: string;
    itemName?: string;
  }>({ isOpen: false });

  // Fetch items from API, re-fetch when type filter changes
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getItems(selectedType);
      setItems(data);
    } catch {
      setError("Could not load closet items.");
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Delete item after confirmation
  const handleDeleteConfirm = async () => {
    if (deleteConfirm.itemId) {
      try {
        await deleteItem(deleteConfirm.itemId);
        setItems(items.filter((i) => i._id !== deleteConfirm.itemId));
        setDeleteConfirm({ isOpen: false });
      } catch {
        setError("Failed to delete item.");
        setDeleteConfirm({ isOpen: false });
      }
    }
  };

  // Show delete confirmation dialog
  const handleDelete = (id: string, name: string) => {
    setDeleteConfirm({ isOpen: true, itemId: id, itemName: name });
  };

  // Filter items by search text across multiple fields
  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.colors.some((color) =>
        color.toLowerCase().includes(searchText.toLowerCase()),
      ) ||
      item.occasions.some((occasion) =>
        occasion.toLowerCase().includes(searchText.toLowerCase()),
      ),
  );

  return (
    <div className="min-h-screen p-6 animate-slide-in">
      <div className="max-w-7xl mx-auto">
        {/* Page title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
            <ShoppingBag className="w-12 h-12 text-(--primary) animate-float" />
            Digital Closet
          </h1>
          <p className="text-gray-600">
            Organize and manage your fashion collection
          </p>
          <p className="text-sm text-gray-500 mt-2">Welcome, {user?.name}!</p>
        </motion.div>

        {/* Search and filter controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-8 mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
            {/* Search box */}
            <div className="flex items-center gap-2 flex-1 max-w-md bg-white/70 p-1 rounded-full border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-(--primary) transition-all">
              <Search className="w-5 h-5 text-gray-400 ml-3" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="flex-1 px-3 py-2 bg-transparent focus:outline-none"
              />
            </div>
            {/* Add item button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          {/* Type filter buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedType(undefined)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedType === undefined
                  ? "btn-primary scale-105"
                  : "bg-white/60 text-gray-700 hover:bg-white"
              }`}
            >
              All
            </button>
            {CLOSET_ITEM_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                  selectedType === type
                    ? "btn-primary scale-105"
                    : "bg-white/60 text-gray-700 hover:bg-white"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6"
          >
            {error}
          </motion.div>
        )}

        {/* Items grid or loading skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`closet-skeleton-${index}`}
                className="card p-4 skeleton-item"
              >
                <div className="skeleton skeleton-image" />
                <div className="skeleton skeleton-text large" />
                <div className="skeleton skeleton-text" />
                <div className="skeleton skeleton-text small" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence>
              {filteredItems.map((item) => (
                <motion.div
                  key={item._id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="card"
                >
                  {/* Item image */}
                  <div className="aspect-square bg-gray-50 relative overflow-hidden group">
                    {item.imageUrl ? (
                      <img
                        src={getImageUrl(item.imageUrl)}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder-image.png";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ShoppingBag className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  {/* Item details */}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-gray-800 mb-1">
                      {item.name}
                    </h3>
                    {item.brand && (
                      <p className="text-sm text-gray-600 mb-2">{item.brand}</p>
                    )}
                    {/* Color tags */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.colors.map((color) => (
                        <span
                          key={color}
                          className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                        >
                          {color}
                        </span>
                      ))}
                    </div>
                    {/* Occasion tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.occasions.map((occasion) => (
                        <span
                          key={occasion}
                          className="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full"
                        >
                          {occasion}
                        </span>
                      ))}
                    </div>
                    {/* Item type and action buttons */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 capitalize">
                        {item.type}
                      </span>
                      <div className="flex gap-2">
                        {/* Edit button */}
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setIsModalOpen(true);
                          }}
                          className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {/* Delete button */}
                        <button
                          onClick={() => handleDelete(item._id, item.name)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Empty state message */}
        {!loading && filteredItems.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 glass"
          >
            <ShoppingBag className="w-20 h-20 text-(--primary) mx-auto mb-6 animate-float opacity-50" />
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">
              No items found
            </h3>
            <p className="text-gray-500">
              {searchText
                ? "Try adjusting your search or filters"
                : "Start building your digital closet by adding your first item"}
            </p>
          </motion.div>
        )}
      </div>

      {/* Add/Edit item modal */}
      {isModalOpen && (
        <AddItemModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingItem(null);
          }}
          onSuccess={fetchItems}
          editItem={editingItem || undefined}
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDelete
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false })}
        onConfirm={handleDeleteConfirm}
        itemName={deleteConfirm.itemName}
      />
    </div>
  );
}

export default Closet;
