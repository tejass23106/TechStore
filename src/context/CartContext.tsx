import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "./AuthContext";

import {
  addCartItem,
  clearCartApi,
  getCart,
  removeCartItem,
  updateCartItem,
  type ApiCart,
} from "../lib/api";

export type Product = {
  id: number;
  name: string;
  price: number;
  category: string;
  rating: number;
  reviews: number;
  stock: number;
  image: string;
  description: string;
};

export type CartItem = Product & {
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  loading: boolean;
  addToCart: (product: Product) => Promise<void>;
  increaseQuantity: (id: number) => Promise<void>;
  decreaseQuantity: (id: number) => Promise<void>;
  removeFromCart: (id: number) => Promise<void>;
  clearCart: () => Promise<void>;
};

const CartContext =
  createContext<CartContextType | null>(null);

const STORAGE_KEY = "techstore-cart";

function loadGuestCart(): CartItem[] {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveGuestCart(items: CartItem[]) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(items)
  );
}

function clearGuestCart() {
  localStorage.removeItem(STORAGE_KEY);
}

function convertApiCart(cart: ApiCart): CartItem[] {
  return cart.items.map((item) => ({
    ...item.product,
    quantity: item.quantity,
  }));
}

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  /*
   * Load the correct cart whenever authentication
   * state changes.
   */
  useEffect(() => {
    if (authLoading) {
      return;
    }

    let cancelled = false;

    async function loadCart() {
      setLoading(true);

      try {
        if (!user) {
          const guestItems = loadGuestCart();

          if (!cancelled) {
            setItems(guestItems);
          }

          return;
        }

        /*
         * User is logged in.
         *
         * First load the guest cart.
         */
        const guestItems = loadGuestCart();

        /*
         * Fetch the user's database cart.
         */
        const databaseCart = await getCart();

        if (cancelled) {
          return;
        }

        /*
         * Merge guest cart into database cart.
         */
        for (const guestItem of guestItems) {
          try {
            await addCartItem(
              guestItem.id,
              guestItem.quantity
            );
          } catch (error) {
            console.error(
              `Failed to merge product ${guestItem.id}:`,
              error
            );
          }
        }

        /*
         * If there was a guest cart, fetch the database
         * cart again after merging.
         */
        const finalCart =
          guestItems.length > 0
            ? await getCart()
            : databaseCart;

        if (!cancelled) {
          setItems(convertApiCart(finalCart));
          clearGuestCart();
        }
      } catch (error) {
        console.error("Load cart error:", error);

        /*
         * If the database cart fails, keep the guest
         * cart available instead of losing it.
         */
        if (!cancelled) {
          setItems(loadGuestCart());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCart();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  /*
   * Keep guest cart in localStorage.
   *
   * We only save to localStorage when the user is NOT
   * logged in.
   */
  useEffect(() => {
    if (authLoading || user) {
      return;
    }

    saveGuestCart(items);
  }, [items, user, authLoading]);

  async function addToCart(product: Product) {
    if (!user) {
      setItems((currentItems) => {
        const existingItem = currentItems.find(
          (item) => item.id === product.id
        );

        if (existingItem) {
          return currentItems.map((item) =>
            item.id === product.id
              ? {
                  ...item,
                  quantity: Math.min(
                    item.quantity + 1,
                    item.stock
                  ),
                }
              : item
          );
        }

        return [
          ...currentItems,
          {
            ...product,
            quantity: 1,
          },
        ];
      });

      return;
    }

    try {
      await addCartItem(product.id, 1);

      const cart = await getCart();

      setItems(convertApiCart(cart));
    } catch (error) {
      console.error("Add to cart error:", error);
      throw error;
    }
  }

  async function increaseQuantity(id: number) {
    const item = items.find(
      (currentItem) => currentItem.id === id
    );

    if (!item) {
      return;
    }

    if (item.quantity >= item.stock) {
      return;
    }

    const newQuantity = item.quantity + 1;

    if (!user) {
      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === id
            ? {
                ...currentItem,
                quantity: newQuantity,
              }
            : currentItem
        )
      );

      return;
    }

    try {
      await updateCartItem(id, newQuantity);

      const cart = await getCart();

      setItems(convertApiCart(cart));
    } catch (error) {
      console.error(
        "Increase cart quantity error:",
        error
      );
    }
  }

  async function decreaseQuantity(id: number) {
    const item = items.find(
      (currentItem) => currentItem.id === id
    );

    if (!item) {
      return;
    }

    const newQuantity = item.quantity - 1;

    if (!user) {
      setItems((currentItems) =>
        currentItems
          .map((currentItem) =>
            currentItem.id === id
              ? {
                  ...currentItem,
                  quantity: newQuantity,
                }
              : currentItem
          )
          .filter(
            (currentItem) => currentItem.quantity > 0
          )
      );

      return;
    }

    if (newQuantity <= 0) {
      await removeFromCart(id);
      return;
    }

    try {
      await updateCartItem(id, newQuantity);

      const cart = await getCart();

      setItems(convertApiCart(cart));
    } catch (error) {
      console.error(
        "Decrease cart quantity error:",
        error
      );
    }
  }

  async function removeFromCart(id: number) {
    if (!user) {
      setItems((currentItems) =>
        currentItems.filter(
          (item) => item.id !== id
        )
      );

      return;
    }

    try {
      await removeCartItem(id);

      const cart = await getCart();

      setItems(convertApiCart(cart));
    } catch (error) {
      console.error("Remove cart item error:", error);
    }
  }

  async function clearCart() {
    if (!user) {
      setItems([]);
      clearGuestCart();
      return;
    }

    try {
      await clearCartApi();

      setItems([]);
    } catch (error) {
      console.error("Clear cart error:", error);
    }
  }

  const totalItems = items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const subtotal = items.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        subtotal,
        loading,
        addToCart,
        increaseQuantity,
        decreaseQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  return context;
}

