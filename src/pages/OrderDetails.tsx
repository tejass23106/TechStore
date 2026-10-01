import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getOrder, type ApiOrder } from "../lib/api";

export default function OrderDetails() {
  const { id } = useParams();

  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrder() {
      if (!id) {
        setError("Invalid order ID");
        setLoading(false);
        return;
      }

      try {
        const data = await getOrder(id);
        setOrder(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load order"
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-center">
        <p className="text-gray-500">
          Loading order details...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Order Not Found
        </h1>

        <p className="mt-3 text-red-500">
          {error || "Unable to find this order."}
        </p>

        <Link
          to="/orders"
          className="mt-6 inline-block rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/orders"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back to Orders
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Order #{order.id}
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Placed on{" "}
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="flex gap-2">
            <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
              {order.status}
            </span>

            <span
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                order.paymentStatus === "PAID"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {order.paymentStatus}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Order Information */}
        <div className="space-y-6 lg:col-span-2">
          {/* Products */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              Items
            </h2>

            <div className="mt-5 divide-y divide-gray-100">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 py-5 first:pt-0 last:pb-0"
                >
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="h-20 w-20 rounded-lg object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900">
                      {item.product.name}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {item.product.category}
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      Quantity: {item.quantity}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      ₹
                      {item.unitPrice.toLocaleString(
                        "en-IN"
                      )}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      ₹
                      {(
                        item.unitPrice * item.quantity
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Shipping Address */}
          {order.address && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">
                Shipping Address
              </h2>

              <div className="mt-4 text-gray-600">
                <p className="font-medium text-gray-900">
                  {order.address.firstName}{" "}
                  {order.address.lastName}
                </p>

                <p className="mt-2">
                  {order.address.addressLine}
                </p>

                <p>
                  {order.address.city},{" "}
                  {order.address.state} -{" "}
                  {order.address.pincode}
                </p>

                <p className="mt-2">
                  Phone: {order.address.phone}
                </p>
              </div>
            </section>
          )}

          {/* Payment Information */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              Payment Information
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">
                  Payment Status
                </span>

                <span className="font-medium text-gray-900">
                  {order.paymentStatus}
                </span>
              </div>

              {order.razorpayOrderId && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">
                    Razorpay Order ID
                  </span>

                  <span className="break-all text-right font-medium text-gray-900">
                    {order.razorpayOrderId}
                  </span>
                </div>
              )}

              {order.razorpayPaymentId && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">
                    Razorpay Payment ID
                  </span>

                  <span className="break-all text-right font-medium text-gray-900">
                    {order.razorpayPaymentId}
                  </span>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Order Summary */}
        <div>
          <section className="sticky top-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              Order Summary
            </h2>

            <div className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">
                  Subtotal
                </span>

                <span className="font-medium text-gray-900">
                  ₹{order.subtotal.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">
                  Delivery Fee
                </span>

                <span className="font-medium text-gray-900">
                  {order.deliveryFee === 0
                    ? "FREE"
                    : `₹${order.deliveryFee.toLocaleString(
                        "en-IN"
                      )}`}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between">
                  <span className="text-base font-semibold text-gray-900">
                    Total
                  </span>

                  <span className="text-xl font-bold text-gray-900">
                    ₹{order.total.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            <Link
              to="/products"
              className="mt-6 block rounded-lg bg-black px-5 py-3 text-center font-medium text-white hover:bg-gray-800"
            >
              Continue Shopping
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}