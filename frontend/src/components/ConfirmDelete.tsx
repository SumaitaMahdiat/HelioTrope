import { X, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

interface ConfirmDeleteProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
}

const ConfirmDelete = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
}: ConfirmDeleteProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="glass w-full max-w-md p-8 rounded-3xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dialog header with icon */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Delete Item?</h3>
              <p className="text-gray-600">This action cannot be undone.</p>
            </div>
          </div>
          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-xl transition-all"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Confirmation message with item name */}
        <p className="text-gray-700 mb-8 text-center">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-gray-900">
            "{itemName || "this item"}"
          </span>
          ?
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 justify-end">
          {/* Cancel button */}
          <button
            onClick={onClose}
            className="px-6 py-2 btn-secondary rounded-2xl flex-1 text-sm"
          >
            Cancel
          </button>
          {/* Delete button */}
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-linear-to-r from-red-500 to-red-600 text-white rounded-2xl flex-1 font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ConfirmDelete;
