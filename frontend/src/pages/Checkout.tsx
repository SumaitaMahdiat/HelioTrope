import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, ArrowLeft, Check } from "lucide-react";
import { getImageUrl } from "../api";
import { useCart } from "../context/CartContext";

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, isLoading, checkout } = useCart();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderPlaced, setOrderPlaced] = useState(false);

  const handleCheckout = async () => {
    try {
      setCheckoutLoading(true);
      setError("");
      await checkout();
      setOrderPlaced(true);
      setTimeout(() => {
        navigate("/closet");
      }, 2000);
    } catch {
      setError("Checkout failed. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-linear-to-b from-green-50 to-emerald-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-green-100 p-6">
              <Check className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Order Placed!
          </h1>
          <p className="text-gray-600 mb-6">
            Your items have been successfully added to your closet.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to closet in a moment...
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && !cart) {
    return (
      <div className="min-h-screen bg-linear-to-b from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-amber-50 via-orange-50 to-rose-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/marketplace")}
            className="flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shopping
          </button>
          <h1 className="text-4xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-2">
            Review and complete your purchase
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Items */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Order Items ({cart?.totalItems || 0})
              </h2>

              {(cart?.items || []).length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(cart?.items || []).map((line) => (
                    <div
                      key={line.product.id}
                      className="rounded-lg border border-orange-100 p-4 hover:border-orange-300 transition-colors flex gap-4"
                    >
                      {/* Image */}
                      {line.product.imageUrl && (
                        <div className="w-24 h-24 shrink-0">
                          <img
                            src={getImageUrl(line.product.imageUrl)}
                            alt={line.product.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      )}

                      {/* Details */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {line.product.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {line.product.sellerName}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                          Quantity: {line.quantity}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-600">
                          ${(line.quantity * 45).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Billing Details */}
            <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm mt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Shipping Address
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Your name"
                    className="w-full rounded-lg border border-orange-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    placeholder="Street address"
                    className="w-full rounded-lg border border-orange-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="City"
                      className="w-full rounded-lg border border-orange-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      placeholder="ZIP"
                      className="w-full rounded-lg border border-orange-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sticky top-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">
                Order Summary
              </h2>

              <div className="space-y-3 pb-6 border-b border-orange-100">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold text-gray-900">
                    ${((cart?.totalItems || 0) * 45).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-semibold text-gray-900">$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-semibold text-gray-900">
                    ${((cart?.totalItems || 0) * 45 * 0.15).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-6 mb-6">
                <div className="flex justify-between items-baseline">
                  <span className="text-gray-900 font-medium">Total</span>
                  <span className="text-3xl font-bold text-orange-600">
                    ${((cart?.totalItems || 0) * 45 * 1.15).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={
                  checkoutLoading ||
                  (cart?.items || []).length === 0 ||
                  !cart?.totalItems
                }
                className="w-full bg-linear-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-bold hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {checkoutLoading ? "Processing..." : "Place Order"}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Items will be added to your closet after payment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
