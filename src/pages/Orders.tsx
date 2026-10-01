import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getOrders, type ApiOrder } from "../lib/api";

export default function Orders() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrders() {
      try {
        const data = await getOrders();
        setOrders(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load orders"
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-center">
        <p className="text-gray-500">Loading your orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Orders
        </h1>

        <p className="mt-4 text-red-500">{error}</p>

        <Link
          to="/products"
          className="mt-6 inline-block rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          My Orders
        </h1>

        <p className="mt-2 text-gray-500">
          View your order history and order details.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            No orders yet
          </h2>

          <p className="mt-2 text-gray-500">
            Your completed orders will appear here.
          </p>

          <Link
            to="/products"
            className="mt-6 inline-block rounded-lg bg-black px-6 py-3 text-white hover:bg-gray-800"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm text-gray-500">
                    Order #{order.id}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    {order.status}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      order.paymentStatus === "PAID"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="mt-5 border-t border-gray-100 pt-5">
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="h-16 w-16 rounded-lg object-cover"
                        />

                        <div>
                          <p className="font-medium text-gray-900">
                            {item.product.name}
                          </p>

                          <p className="text-sm text-gray-500">
                            Qty: {item.quantity}
                          </p>
                        </div>
                      </div>

                      <p className="font-medium text-gray-900">
                        ₹
                        {(
                          item.unitPrice * item.quantity
                        ).toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-col justify-between gap-4 border-t border-gray-100 pt-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm text-gray-500">
                    Total
                  </p>

                  <p className="text-xl font-bold text-gray-900">
                    ₹{order.total.toLocaleString("en-IN")}
                  </p>
                </div>

                <Link
                  to={`/orders/${order.id}`}
                  className="rounded-lg bg-black px-5 py-3 text-center text-sm font-medium text-white hover:bg-gray-800"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}