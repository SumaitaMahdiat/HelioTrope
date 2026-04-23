import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

export type CartItem = {
  productId: string;
  sellerId: string;
  name: string;
  price: number;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  clear: () => void;
  total: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);
const KEY = 'heliotrope_cart';

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) setItems(JSON.parse(raw));
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.productId === item.productId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + quantity };
        return copy;
      }
      return [...prev, { ...item, quantity }];
    });
  };

  const clear = () => setItems([]);

  const total = useMemo(() => items.reduce((sum, it) => sum + it.price * it.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, clear, total }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};