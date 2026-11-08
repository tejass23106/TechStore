import { createContext } from "react";

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

export type CartContextType = {
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

export const CartContext =
  createContext<CartContextType | null>(null);