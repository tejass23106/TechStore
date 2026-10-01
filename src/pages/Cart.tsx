import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import { Link } from "react-router-dom";

import { useCart } from "../context/CartContext";

export default function Cart() {
  const {
    items,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    subtotal,
    clearCart,
  } = useCart();

  if (items.length === 0) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-6">

        <div className="text-center">

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <ShoppingBag size={32} />
          </div>

          <h1 className="mt-7 text-4xl font-black">
            Your cart is empty
          </h1>

          <p className="mt-4 text-gray-500">
            Looks like you haven't added anything yet.
          </p>

          <Link
            to="/products"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-black px-7 py-3.5 font-semibold text-white"
          >
            Start shopping
            <ArrowRight size={18} />
          </Link>

        </div>

      </main>
    );
  }

  return (
    <main className="px-6 py-16">

      <div className="mx-auto max-w-7xl">

        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

          <div>

            <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">
              Shopping bag
            </p>

            <h1 className="mt-3 text-5xl font-black tracking-tight">
              Your cart.
            </h1>

          </div>

          <button
            onClick={clearCart}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-black"
          >
            <Trash2 size={16} />
            Clear cart
          </button>

        </div>


        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_380px]">

          {/* ITEMS */}

          <div className="space-y-5">

            {items.map((item) => (

              <div
                key={item.id}
                className="flex flex-col gap-5 rounded-3xl border border-gray-200 p-5 sm:flex-row sm:items-center"
              >

                <img
                  src={item.image}
                  alt={item.name}
                  className="h-32 w-full rounded-2xl object-cover sm:h-32 sm:w-32"
                />

                <div className="flex-1">

                  <p className="text-sm text-gray-500">
                    {item.category}
                  </p>

                  <h2 className="mt-1 text-lg font-bold">
                    {item.name}
                  </h2>

                  <p className="mt-2 font-semibold">
                    ₹{item.price.toLocaleString("en-IN")}
                  </p>

                </div>


                {/* QUANTITY */}

                <div className="flex items-center gap-3">

                  <button
                    onClick={() =>
                      decreaseQuantity(item.id)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                  >
                    <Minus size={16} />
                  </button>

                  <span className="w-6 text-center font-semibold">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() =>
                      increaseQuantity(item.id)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                  >
                    <Plus size={16} />
                  </button>

                </div>


                <button
                  onClick={() =>
                    removeFromCart(item.id)
                  }
                  aria-label={`Remove ${item.name}`}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-black"
                >
                  <Trash2 size={18} />
                </button>

              </div>

            ))}

          </div>


          {/* SUMMARY */}

          <aside className="h-fit rounded-3xl bg-gray-50 p-7">

            <h2 className="text-xl font-bold">
              Order summary
            </h2>

            <div className="mt-7 space-y-4 text-sm">

              <div className="flex justify-between">
                <span className="text-gray-500">
                  Subtotal
                </span>

                <span className="font-semibold">
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">
                  Delivery
                </span>

                <span className="font-semibold">
                  FREE
                </span>
              </div>

              <div className="border-t pt-4">

                <div className="flex justify-between text-base">

                  <span className="font-bold">
                    Total
                  </span>

                  <span className="font-bold">
                    ₹{subtotal.toLocaleString("en-IN")}
                  </span>

                </div>

              </div>

            </div>

            <Link
              to="/checkout"
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-black px-6 py-4 font-semibold text-white hover:bg-gray-800"
            >
              Checkout
              <ArrowRight size={18} />
            </Link>

          </aside>

        </div>

      </div>

    </main>
  );
}