import { ShoppingBag, X } from "lucide-react";
import type { CartSnapshot } from "../api";
import { getImageUrl } from "../api";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartSnapshot;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
  cartLoading: boolean;
}

const CartDrawer = ({
  isOpen,
  onClose,
  cart,
  onRemoveItem,
  onCheckout,
  cartLoading,
}: CartDrawerProps) => {
  const handleCheckoutClick = () => {
    onClose();
    onCheckout();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-screen w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 z-50 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-orange-100">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-(--primary)" />
            <h2 className="text-xl font-bold text-gray-900">Your Cart</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-6">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="w-16 h-16 text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium">Your cart is empty</p>
              <p className="text-sm text-gray-500 mt-1">
                Start shopping to add items
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.items.map((line) => (
                <div
                  key={line.product.id}
                  className="rounded-lg border border-orange-100 p-3 hover:border-orange-300 transition-colors"
                >
                  {/* Product Image */}
                  {line.product.imageUrl && (
                    <img
                      src={getImageUrl(line.product.imageUrl)}
                      alt={line.product.name}
                      className="w-full h-32 object-cover rounded-md mb-2"
                    />
                  )}

                  {/* Product Info */}
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">
                    {line.product.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {line.product.sellerName}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs bg-orange-100 text-orange-900 px-2 py-1 rounded">
                      Qty: {line.quantity}
                    </span>
                    <button
                      onClick={() => onRemoveItem(line.product.id)}
                      disabled={cartLoading}
                      className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.items.length > 0 && (
          <div className="border-t border-orange-100 p-6 space-y-3">
            <div className="text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Items:</span>
                <span className="font-semibold text-gray-900">
                  {cart.totalItems}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900">Total:</span>
                <span className="text-orange-600">
                  ${(cart.totalItems * 45).toFixed(2)}
                </span>
              </div>
            </div>
            <button
              onClick={handleCheckoutClick}
              disabled={cartLoading}
              className="w-full bg-linear-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-60"
            >
              {cartLoading ? "Processing..." : "Go to Checkout"}
            </button>
            <button
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-900 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
