import { createContext } from "react";

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

export type WishlistContextType = {
  items: WishlistItem[];
  loading: boolean;
  isInWishlist: (productId: number) => boolean;
  addToWishlist: (
    product: WishlistProduct
  ) => Promise<void>;
  removeFromWishlist: (productId: number) => Promise<void>;
  toggleWishlist: (
    product: WishlistProduct
  ) => Promise<void>;
};

export const WishlistContext =
  createContext<WishlistContextType | null>(null);