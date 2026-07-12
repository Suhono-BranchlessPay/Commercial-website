import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import type { MenuItem } from "../api/client";

export type CartLine = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  specialInstructions?: string;
};

type CartContextValue = {
  lines: CartLine[];
  addItem: (item: MenuItem, qty?: number, note?: string) => void;
  setQty: (menuItemId: string, quantity: number) => void;
  remove: (menuItemId: string) => void;
  clear: () => void;
  subtotal: number;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const addItem = useCallback((item: MenuItem, qty = 1, note?: string) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.menuItemId === item.id && !note);
      if (i >= 0 && !note) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + qty };
        return next;
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          unitPrice: item.price,
          quantity: qty,
          specialInstructions: note,
        },
      ];
    });
  }, []);

  const setQty = useCallback((menuItemId: string, quantity: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.menuItemId === menuItemId ? { ...l, quantity } : l))
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const remove = useCallback((menuItemId: string) => {
    setLines((prev) => prev.filter((l) => l.menuItemId !== menuItemId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    return { lines, addItem, setQty, remove, clear, subtotal, count };
  }, [lines, addItem, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart requires CartProvider");
  return ctx;
}
