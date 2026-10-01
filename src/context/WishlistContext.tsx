import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "./AuthContext";

import {
  addWishlistItem,
  getWishlist,
  removeWishlistItem,
  type ApiWishlistItem,
} from "../lib/api";

export type WishlistProduct = {
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

export type WishlistItem = WishlistProduct & {
  wishlistItemId: number;
  createdAt: string;
};

type WishlistContextType = {
  items: WishlistItem[];
  loading: boolean;
  isInWishlist: (productId: number) => boolean;
  addToWishlist: (product: WishlistProduct) => Promise<void>;
  removeFromWishlist: (productId: number) => Promise<void>;
  toggleWishlist: (product: WishlistProduct) => Promise<void>;
};

const WishlistContext =
  createContext<WishlistContextType | null>(null);

function convertApiWishlist(
  wishlistItems: ApiWishlistItem[]
): WishlistItem[] {
  return wishlistItems.map((item) => ({
    ...item.product,
    wishlistItemId: item.id,
    createdAt: item.createdAt,
  }));
}

export function WishlistProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let cancelled = false;

    async function loadWishlist() {
      setLoading(true);

      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        const wishlist = await getWishlist();

        if (!cancelled) {
          setItems(convertApiWishlist(wishlist.items));
        }
      } catch (error) {
        console.error("Load wishlist error:", error);

        if (!cancelled) {
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadWishlist();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  function isInWishlist(productId: number) {
    return items.some(
      (item) => item.id === productId
    );
  }

  async function addToWishlist(
    product: WishlistProduct
  ) {
    if (!user) {
      throw new Error(
        "Please log in to use the wishlist"
      );
    }

    try {
      await addWishlistItem(product.id);

      const wishlist = await getWishlist();

      setItems(
        convertApiWishlist(wishlist.items)
      );
    } catch (error) {
      console.error(
        "Add to wishlist error:",
        error
      );

      throw error;
    }
  }

  async function removeFromWishlist(
    productId: number
  ) {
    if (!user) {
      throw new Error(
        "Please log in to use the wishlist"
      );
    }

    try {
      await removeWishlistItem(productId);

      setItems((currentItems) =>
        currentItems.filter(
          (item) => item.id !== productId
        )
      );
    } catch (error) {
      console.error(
        "Remove from wishlist error:",
        error
      );

      throw error;
    }
  }

  async function toggleWishlist(
    product: WishlistProduct
  ) {
    if (isInWishlist(product.id)) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(product);
    }
  }

  return (
    <WishlistContext.Provider
      value={{
        items,
        loading,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error(
      "useWishlist must be used inside WishlistProvider"
    );
  }

  return context;
}