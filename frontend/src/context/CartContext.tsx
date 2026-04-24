import React, { createContext, useContext, useCallback } from "react";
import type { ReactNode } from "react";
import useSWR from "swr";
import { getCart, addToCart, removeCartItem, checkoutCart } from "../api";
import type { CartSnapshot } from "../api";

interface CartContextValue {
  cart: CartSnapshot | undefined;
  isLoading: boolean;
  error: Error | undefined;
  totalItems: number;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  checkout: () => Promise<{
    success: boolean;
    message: string;
    purchasedCount: number;
  }>;
  refreshCart: () => Promise<void>;
}

const defaultCartContext: CartContextValue = {
  cart: undefined,
  isLoading: false,
  error: undefined,
  totalItems: 0,
  addToCart: async () => undefined,
  removeFromCart: async () => undefined,
  checkout: async () => ({
    success: false,
    message: "",
    purchasedCount: 0,
  }),
  refreshCart: async () => undefined,
};

const CartContext = createContext<CartContextValue>(defaultCartContext);

export const useCart = () => {
  return useContext(CartContext);
};

interface CartProviderProps {
  children: ReactNode;
}

const CART_KEY = "/api/commerce/cart";

async function cartFetcher() {
  return getCart();
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  // Always attempt to fetch cart - API will return 401 if not authenticated
  const {
    data: cart,
    error,
    isLoading,
    mutate: mutateCart,
  } = useSWR<CartSnapshot>(CART_KEY, cartFetcher, {
    dedupingInterval: 30000, // 30s min refetch
    revalidateOnFocus: false, // No auto-refetch on tab focus
    revalidateOnReconnect: true,
    refreshInterval: 0, // Disable polling
    // Silently handle 401 auth errors for non-buyers
    onError: (err) => {
      if (err instanceof Error && !err.message.includes("401")) {
        console.error("CartProvider: Cart fetch error", err);
      }
    },
  });

  const totalItems = cart?.totalItems || 0;

  const optimisticAdd = useCallback(
    async (productId: string, quantity = 1) => {
      console.log("[CartContext] Adding to cart:", {
        productId,
        quantity,
        userId: "check-localStorage",
      });
      await addToCart(productId, quantity);
      console.log("[CartContext] Added successfully, refreshing cart");
      await mutateCart();
    },
    [mutateCart],
  );

  const optimisticRemove = useCallback(
    async (productId: string) => {
      await removeCartItem(productId);
      await mutateCart();
    },
    [mutateCart],
  );

  const handleCheckout = useCallback(async () => {
    const result = await checkoutCart();
    await mutateCart();
    return result;
  }, [mutateCart]);

  const refresh = useCallback(async () => {
    await mutateCart();
  }, [mutateCart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        error,
        totalItems,
        addToCart: optimisticAdd,
        removeFromCart: optimisticRemove,
        checkout: handleCheckout,
        refreshCart: refresh,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
