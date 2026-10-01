import {
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  CheckCircle,
  Lock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type CreatedOrder = {
  id: number;
  status: string;
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
};

type RazorpayCreateResponse = {
  message: string;
  orderId: number;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
};

type RazorpayPaymentResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount?: number;
  subscription_id?: string;
  currency?: string;
  name: string;
  description: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: {
    [key: string]: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayPaymentResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
};

type RazorpayConstructor = new (
  options: RazorpayOptions
) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay: RazorpayConstructor;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () =>
        resolve(true)
      );
      existingScript.addEventListener("error", () =>
        resolve(false)
      );
      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";

    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const {
    items,
    subtotal,
    clearCart,
  } = useCart();

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderId, setOrderId] = useState<number | null>(
    null
  );

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentProcessing, setPaymentProcessing] =
    useState(false);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const startPayment = async (
    createdOrder: CreatedOrder
  ) => {
    setPaymentProcessing(true);
    setError("");

    try {
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error(
          "Unable to load Razorpay Checkout. Please check your internet connection and try again."
        );
      }

      const paymentOrderResponse = await fetch(
        `${API_URL}/payments/create`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: createdOrder.id,
          }),
        }
      );

      const paymentOrderData: RazorpayCreateResponse =
        await paymentOrderResponse.json();

      if (!paymentOrderResponse.ok) {
        throw new Error(
          paymentOrderData.message ||
            "Failed to create payment"
        );
      }

      const razorpayOptions: RazorpayOptions = {
        key: paymentOrderData.keyId,
        amount: paymentOrderData.amount,
        currency: paymentOrderData.currency,
        name: "TechStore",
        description: `TechStore Order #${createdOrder.id}`,
        order_id: paymentOrderData.razorpayOrderId,

        prefill: {
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email,
          contact: form.phone,
        },

        notes: {
          techstoreOrderId: String(createdOrder.id),
        },

        theme: {
          color: "#000000",
        },

        handler: async (
          response: RazorpayPaymentResponse
        ) => {
          try {
            setPaymentProcessing(true);
            setError("");

            const verifyResponse = await fetch(
              `${API_URL}/payments/verify`,
              {
                method: "POST",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  orderId: createdOrder.id,
                  razorpayOrderId:
                    response.razorpay_order_id,
                  razorpayPaymentId:
                    response.razorpay_payment_id,
                  razorpaySignature:
                    response.razorpay_signature,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
              throw new Error(
                verifyData.message ||
                  "Payment verification failed"
              );
            }

            // Backend has verified the Razorpay signature,
            // verified the payment/order,
            // marked the order as PAID,
            // confirmed the order,
            // deducted inventory,
            // and cleared the database cart.
            //
            // Clear the React cart state as well.
            await clearCart();

            setOrderPlaced(true);
            setOrderId(createdOrder.id);
            setOrderTotal(createdOrder.total);
          } catch (error) {
            console.error(
              "Payment verification error:",
              error
            );

            setError(
              error instanceof Error
                ? error.message
                : "Payment verification failed. Please contact support."
            );
          } finally {
            setPaymentProcessing(false);
            setSubmitting(false);
          }
        },

        modal: {
          ondismiss: () => {
            setPaymentProcessing(false);
            setSubmitting(false);

            setError(
              "Payment was cancelled. Your order is still pending and you can try again."
            );
          },
        },
      };

      const razorpay = new window.Razorpay(
        razorpayOptions
      );

      razorpay.open();
    } catch (error) {
      console.error("Payment error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to start payment"
      );

      setPaymentProcessing(false);
      setSubmitting(false);
    }
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.address.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.pincode.trim()
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);

    try {
      // If an order was already created but payment was
      // cancelled, reuse that pending order instead of
      // creating duplicate orders.
      if (orderId !== null) {
        const existingOrder: CreatedOrder = {
          id: orderId,
          status: "PENDING",
          paymentStatus: "PENDING",
          subtotal,
          deliveryFee: 0,
          total: orderTotal,
        };

        await startPayment(existingOrder);
        return;
      }

      // Step 1:
      // Create the TechStore order.
      const response = await fetch(
        `${API_URL}/orders`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone,
            address: form.address,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create order"
        );
      }

      const order: CreatedOrder = data.order;

      setOrderId(order.id);
      setOrderTotal(order.total);

      // Step 2:
      // Create Razorpay order and open Checkout.
      await startPayment(order);
    } catch (error) {
      console.error("Checkout error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to create order"
      );

      setSubmitting(false);
    }
  };

  if (orderPlaced) {
    return (
      <main className="flex min-h-[75vh] items-center justify-center px-6">
        <div className="max-w-xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle
              size={40}
              className="text-green-600"
            />
          </div>

          <h1 className="mt-8 text-4xl font-black">
            Payment successful!
          </h1>

          <p className="mt-4 leading-7 text-gray-500">
            Your payment has been verified and your order
            has been confirmed.
          </p>

          <div className="mt-8 rounded-2xl bg-gray-50 p-6 text-left">
            <p className="text-sm text-gray-500">
              Order ID
            </p>

            <p className="mt-1 font-semibold">
              #{orderId}
            </p>

            <p className="mt-5 text-sm text-gray-500">
              Order status
            </p>

            <p className="mt-1 font-semibold text-green-600">
              Confirmed
            </p>

            <p className="mt-5 text-sm text-gray-500">
              Payment status
            </p>

            <p className="mt-1 font-semibold text-green-600">
              Paid
            </p>

            <p className="mt-5 text-sm text-gray-500">
              Total
            </p>

            <p className="mt-1 text-xl font-bold">
              ₹{orderTotal.toLocaleString("en-IN")}
            </p>
          </div>

          <Link
            to="/products"
            className="mt-8 inline-flex rounded-full bg-black px-7 py-3.5 font-semibold text-white"
          >
            Continue shopping
          </Link>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-4xl font-black">
            Your cart is empty
          </h1>

          <p className="mt-4 text-gray-500">
            Add some products before checking out.
          </p>

          <Link
            to="/products"
            className="mt-7 inline-flex rounded-full bg-black px-7 py-3.5 font-semibold text-white"
          >
            Browse products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-black"
        >
          <ArrowLeft size={16} />
          Back to cart
        </Link>

        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">
            Checkout
          </p>

          <h1 className="mt-3 text-5xl font-black tracking-tight">
            Complete your order.
          </h1>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_380px]">
          <form
            onSubmit={handleSubmit}
            className="space-y-8"
          >
            <section className="rounded-3xl border border-gray-200 p-7">
              <h2 className="text-xl font-bold">
                Contact information
              </h2>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <input
                  name="firstName"
                  placeholder="First name *"
                  value={form.firstName}
                  onChange={handleChange}
                  disabled={submitting}
                  className="rounded-2xl border border-gray-200 px-5 py-3.5 outline-none focus:border-black"
                />

                <input
                  name="lastName"
                  placeholder="Last name *"
                  value={form.lastName}
                  onChange={handleChange}
                  disabled={submitting}
                  className="rounded-2xl border border-gray-200 px-5 py-3.5 outline-none focus:border-black"
                />

                <input
                  type="email"
                  name="email"
                  placeholder="Email address *"
                  value={form.email}
                  onChange={handleChange}
                  disabled={submitting}
                  className="rounded-2xl border border-gray-200 px-5 py-3.5 outline-none focus:border-black sm:col-span-2"
                />

                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone number *"
                  value={form.phone}
                  onChange={handleChange}
                  disabled={submitting}
                  className="rounded-2xl border border-gray-200 px-5 py-3.5 outline-none focus:border-black sm:col-span-2"
                />
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 p-7">
              <h2 className="text-xl font-bold">
                Shipping address
              </h2>

              <div className="mt-6 space-y-5">
                <input
                  name="address"
                  placeholder="Street address *"
                  value={form.address}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 outline-none focus:border-black"
                />

                <div className="grid gap-5 sm:grid-cols-3">
                  <input
                    name="city"
                    placeholder="City *"
                    value={form.city}
                    onChange={handleChange}
                    disabled={submitting}
                    className="rounded-2xl border border-gray-200 px-5 py-3.5 outline-none focus:border-black"
                  />

                  <input
                    name="state"
                    placeholder="State *"
                    value={form.state}
                    onChange={handleChange}
                    disabled={submitting}
                    className="rounded-2xl border border-gray-200 px-5 py-3.5 outline-none focus:border-black"
                  />

                  <input
                    name="pincode"
                    placeholder="PIN code *"
                    value={form.pincode}
                    onChange={handleChange}
                    disabled={submitting}
                    className="rounded-2xl border border-gray-200 px-5 py-3.5 outline-none focus:border-black"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 p-7">
              <div className="flex items-center gap-3">
                <Lock size={20} />

                <div>
                  <h2 className="font-bold">
                    Secure payment
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Your payment information is securely
                    processed by Razorpay.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-gray-50 p-5">
                <p className="text-sm font-semibold">
                  Payment gateway
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  You will be redirected to Razorpay
                  Checkout after placing your order.
                </p>
              </div>
            </section>

            {error && (
              <div className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={
                submitting || paymentProcessing
              }
              className="w-full rounded-full bg-black px-7 py-4 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paymentProcessing
                ? "Processing payment..."
                : submitting
                  ? "Creating order..."
                  : "Place order & Pay"}
            </button>
          </form>

          <aside className="h-fit rounded-3xl bg-gray-50 p-7">
            <h2 className="text-xl font-bold">
              Order summary
            </h2>

            <div className="mt-7 space-y-5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-20 w-20 rounded-2xl object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {item.name}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Qty: {item.quantity}
                    </p>

                    <p className="mt-2 text-sm font-semibold">
                      ₹
                      {(
                        item.price * item.quantity
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 border-t pt-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  Subtotal
                </span>

                <span className="font-semibold">
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="mt-4 flex justify-between text-sm">
                <span className="text-gray-500">
                  Delivery
                </span>

                <span className="font-semibold">
                  FREE
                </span>
              </div>

              <div className="mt-5 border-t pt-5">
                <div className="flex justify-between">
                  <span className="font-bold">
                    Total
                  </span>

                  <span className="text-xl font-black">
                    ₹{subtotal.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

