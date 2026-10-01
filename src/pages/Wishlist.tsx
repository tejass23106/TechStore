import {
  ArrowRight,
  Heart,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

export default function Wishlist() {
  const { user, loading: authLoading } = useAuth();

  const { addToCart } = useCart();

  const {
    items,
    loading,
    removeFromWishlist,
  } = useWishlist();

  if (authLoading || loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-6">
        <p className="text-gray-500">
          Loading wishlist...
        </p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (items.length === 0) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <Heart size={32} />
          </div>

          <h1 className="mt-7 text-4xl font-black">
            Your wishlist is empty
          </h1>

          <p className="mt-4 text-gray-500">
            Save products you love and come back to
            them later.
          </p>

          <Link
            to="/products"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-black px-7 py-3.5 font-semibold text-white"
          >
            Browse products
            <ArrowRight size={18} />
          </Link>
        </div>
      </main>
    );
  }

  async function handleAddToCart(
    productId: number
  ) {
    const item = items.find(
      (wishlistItem) => wishlistItem.id === productId
    );

    if (!item) {
      return;
    }

    if (item.stock <= 0) {
      return;
    }

    try {
      await addToCart(item);
    } catch (error) {
      console.error(
        "Add wishlist item to cart error:",
        error
      );
    }
  }

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">
            Saved products
          </p>

          <h1 className="mt-3 text-5xl font-black tracking-tight">
            Your wishlist.
          </h1>

          <p className="mt-4 text-gray-500">
            {items.length}{" "}
            {items.length === 1
              ? "product"
              : "products"}{" "}
            saved.
          </p>
        </div>

        <div className="mt-12 space-y-5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-5 rounded-3xl border border-gray-200 p-5 sm:flex-row sm:items-center"
            >
              <Link
                to={`/products/${item.id}`}
                className="shrink-0"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-32 w-full rounded-2xl object-cover sm:h-32 sm:w-32"
                />
              </Link>

              <div className="flex-1">
                <p className="text-sm text-gray-500">
                  {item.category}
                </p>

                <Link
                  to={`/products/${item.id}`}
                  className="mt-1 block text-lg font-bold hover:underline"
                >
                  {item.name}
                </Link>

                <div className="mt-2 flex items-center gap-3">
                  <p className="font-semibold">
                    ₹{item.price.toLocaleString("en-IN")}
                  </p>

                  <span className="text-sm text-gray-500">
                    ★ {item.rating}
                  </span>
                </div>

                <p
                  className={`mt-2 text-sm font-medium ${
                    item.stock > 0
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {item.stock > 0
                    ? `${item.stock} units available`
                    : "Out of stock"}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:w-48">
                <button
                  type="button"
                  onClick={() =>
                    handleAddToCart(item.id)
                  }
                  disabled={item.stock <= 0}
                  className={`flex items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold text-white ${
                    item.stock <= 0
                      ? "cursor-not-allowed bg-gray-400"
                      : "bg-black hover:bg-gray-800"
                  }`}
                >
                  <ShoppingCart size={18} />
                  Add to cart
                </button>

                <button
                  type="button"
                  onClick={() =>
                    removeFromWishlist(item.id)
                  }
                  className="flex items-center justify-center gap-2 rounded-full border border-gray-200 px-5 py-3 font-semibold text-gray-600 hover:bg-gray-100 hover:text-black"
                >
                  <Trash2 size={18} />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}