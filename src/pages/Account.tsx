import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  Crown,
  LogOut,
  Package,
  Sparkles,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type SubscriptionStatus = {
  id: number | null;
  plan: "FREE" | "PRO";
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  startDate: string | null;
  endDate: string | null;
  isPro: boolean;
};

type ProRecommendationResponse = {
  recommendations: string;
  products: Array<{
    id: number;
    name: string;
    description: string;
    category: string;
    price: number;
    stock: number;
    rating: number;
    reviewCount: number;
  }>;
};

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [subscription, setSubscription] =
    useState<SubscriptionStatus | null>(null);

  const [subscriptionLoading, setSubscriptionLoading] =
    useState(true);

  const [checkoutLoading, setCheckoutLoading] =
    useState(false);

  const [subscriptionError, setSubscriptionError] =
    useState("");

  const [proQuery, setProQuery] = useState("");
  const [proBudget, setProBudget] = useState("");
  const [proLoading, setProLoading] = useState(false);
  const [proError, setProError] = useState("");
  const [proRecommendations, setProRecommendations] =
    useState("");

  const loadSubscriptionStatus = async () => {
    try {
      setSubscriptionLoading(true);
      setSubscriptionError("");

      const response = await fetch(
        `${API_URL}/subscription/status`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load subscription status"
        );
      }

      setSubscription(data);
    } catch (error) {
      console.error(
        "Subscription status error:",
        error
      );

      setSubscriptionError(
        error instanceof Error
          ? error.message
          : "Failed to load subscription status"
      );
    } finally {
      setSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadSubscriptionStatus();
    } else {
      setSubscriptionLoading(false);
    }
  }, [user]);

  const loadRazorpayScript = (): Promise<boolean> => {
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
  };

  const handleUpgradeToPro = async () => {
    if (!user) {
      return;
    }

    setCheckoutLoading(true);
    setSubscriptionError("");

    try {
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error(
          "Unable to load Razorpay Checkout. Please check your internet connection and try again."
        );
      }

      const response = await fetch(
        `${API_URL}/subscription/create`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create Pro subscription"
        );
      }

      if (!data.subscriptionId || !data.keyId) {
        throw new Error(
          "Razorpay subscription information is incomplete."
        );
      }

      const razorpay = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "TechStore",
        description: "TechStore Pro - ₹199/month",
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#111827",
        },
        handler: async (_response) => {
          try {
            setCheckoutLoading(true);
            setSubscriptionError("");

            /*
             * Razorpay webhook is the source of truth
             * for subscription activation.
             *
             * The checkout handler only tells us that
             * Razorpay completed its client-side flow.
             */
            await new Promise((resolve) =>
              setTimeout(resolve, 2000)
            );

            await loadSubscriptionStatus();
          } catch (error) {
            console.error(
              "Subscription refresh error:",
              error
            );

            setSubscriptionError(
              error instanceof Error
                ? error.message
                : "Unable to refresh subscription status"
            );
          } finally {
            setCheckoutLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setCheckoutLoading(false);
          },
        },
      });

      razorpay.open();
    } catch (error) {
      console.error(
        "Pro subscription error:",
        error
      );

      setSubscriptionError(
        error instanceof Error
          ? error.message
          : "Failed to start Pro subscription"
      );

      setCheckoutLoading(false);
    }
  };

  const handleProRecommendation = async () => {
    if (!proQuery.trim()) {
      setProError(
        "Tell TechStore Pro AI what you are looking for."
      );
      return;
    }

    setProLoading(true);
    setProError("");
    setProRecommendations("");

    try {
      const response = await fetch(
        `${API_URL}/pro/recommendations`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: proQuery.trim(),
            ...(proBudget.trim()
              ? {
                  budget: Number(proBudget),
                }
              : {}),
          }),
        }
      );

      const data =
        (await response.json()) as
          | ProRecommendationResponse
          | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in data && data.message
            ? data.message
            : "Unable to generate Pro recommendations"
        );
      }

      setProRecommendations(
        (data as ProRecommendationResponse)
          .recommendations
      );
    } catch (error) {
      console.error(
        "Pro recommendation error:",
        error
      );

      setProError(
        error instanceof Error
          ? error.message
          : "Unable to generate Pro recommendations"
      );
    } finally {
      setProLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!user) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-4xl font-black">
            Please log in
          </h1>

          <p className="mt-4 text-gray-500">
            You need to be logged in to access your
            account.
          </p>

          <Link
            to="/login"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-black px-7 py-3.5 font-semibold text-white"
          >
            Login
            <ArrowRight size={17} />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">
            Account
          </p>

          <h1 className="mt-3 text-5xl font-black tracking-tight">
            Welcome, {user.name}.
          </h1>

          <p className="mt-4 text-gray-500">
            Manage your TechStore account and orders.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            {/* Profile */}
            <section className="rounded-3xl border border-gray-200 p-7">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <User size={22} />
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    Profile
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Your account information
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">
                    Name
                  </p>

                  <p className="mt-1 font-semibold">
                    {user.name}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Email
                  </p>

                  <p className="mt-1 font-semibold">
                    {user.email}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Account type
                  </p>

                  <p className="mt-1 font-semibold">
                    {user.role === "ADMIN"
                      ? "Administrator"
                      : "Customer"}
                  </p>
                </div>
              </div>
            </section>

            {/* Orders */}
            <section className="rounded-3xl border border-gray-200 p-7">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <Package size={22} />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold">
                      Orders
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      View your order history
                    </p>
                  </div>
                </div>

                <Link
                  to="/orders"
                  className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
                >
                  View orders
                  <ArrowRight size={16} />
                </Link>
              </div>
            </section>

            ```
        {/* Subscription */}
        <section className="overflow-hidden rounded-3xl border border-gray-200">
          <div className="bg-black p-7 text-white">
            <div className="flex items-start justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                  <Crown size={23} />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">
                      TechStore Pro
                    </h2>

                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-black">
                      {subscriptionLoading ? "..." : subscription?.isPro ? "PRO" : "FREE"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-gray-300">
                    Premium shopping features for smarter product discovery.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {subscriptionLoading ? (
            <div className="p-7">
              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="text-sm text-gray-500">
                  Checking your subscription...
                </p>
              </div>
            </div>
          ) : subscription?.isPro ? (
            <div className="p-7">
              <div className="rounded-2xl bg-green-50 p-5">
                <div className="flex items-center gap-3">
                  <CheckCircle
                    size={20}
                    className="text-green-600"
                  />

                  <div>
                    <p className="font-bold text-green-700">
                      You are a Pro member
                    </p>

                    <p className="mt-1 text-sm text-green-700">
                      Your TechStore Pro subscription is active.
                    </p>
                  </div>
                </div>

                {subscription.endDate && (
                  <p className="mt-4 text-sm text-green-700">
                    Current period ends on{" "}
                    {new Date(
                      subscription.endDate
                    ).toLocaleDateString("en-IN")}
                    .
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-7">
              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-2xl font-black tracking-tight">
                    Upgrade your shopping experience
                  </p>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                    Get premium AI-powered product assistance designed to
                    help you find the right products faster.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <CheckCircle
                        size={18}
                        className="mt-0.5 shrink-0 text-green-600"
                      />
                      <div>
                        <p className="text-sm font-semibold">
                          Pro AI Product Recommendations
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Get AI-powered recommendations based on what you
                          need.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle
                        size={18}
                        className="mt-0.5 shrink-0 text-green-600"
                      />
                      <div>
                        <p className="text-sm font-semibold">
                          Budget-Based Recommendations
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Set your budget and find suitable products from
                          the TechStore catalog.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle
                        size={18}
                        className="mt-0.5 shrink-0 text-green-600"
                      />
                      <div>
                        <p className="text-sm font-semibold">
                          Personalized Shopping Guidance
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Describe what you're looking for and receive
                          tailored product guidance.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle
                        size={18}
                        className="mt-0.5 shrink-0 text-green-600"
                      />
                      <div>
                        <p className="text-sm font-semibold">
                          AI Product Comparison Help
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Understand product choices and trade-offs more
                          easily.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle
                        size={18}
                        className="mt-0.5 shrink-0 text-green-600"
                      />
                      <div>
                        <p className="text-sm font-semibold">
                          Smarter Product Discovery
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Find products matching your requirements faster.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle
                        size={18}
                        className="mt-0.5 shrink-0 text-green-600"
                      />
                      <div>
                        <p className="text-sm font-semibold">
                          Premium AI Access
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Access TechStore's premium AI recommendation
                          feature.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 p-6 lg:min-w-[230px]">
                  <p className="text-sm font-semibold text-gray-500">
                    TechStore Pro
                  </p>

                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-4xl font-black">
                      ₹199
                    </span>

                    <span className="mb-1 text-sm text-gray-500">
                      /month
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Monthly recurring subscription.
                  </p>

                  <button
                    type="button"
                    onClick={handleUpgradeToPro}
                    disabled={checkoutLoading}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Crown size={16} />

                    {checkoutLoading
                      ? "Opening checkout..."
                      : "Upgrade to Pro"}
                  </button>

                  <p className="mt-3 text-center text-xs text-gray-400">
                    Secure payment through Razorpay
                  </p>
                </div>
              </div>
            </div>
          )}

          {subscriptionError && (
            <div className="mx-7 mb-7 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
              {subscriptionError}
            </div>
          )}
        </section>


            {/* Pro AI Recommendations */}
            {subscription?.isPro && (
              <section className="rounded-3xl border border-gray-200 p-7">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <Sparkles size={22} />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">
                        Pro AI Recommendations
                      </h2>

                      <span className="rounded-full bg-black px-2.5 py-1 text-xs font-bold text-white">
                        PRO
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      Get advanced AI-powered product
                      recommendations based on your needs.
                    </p>
                  </div>
                </div>

                <div className="mt-7 space-y-4">
                  <div>
                    <label
                      htmlFor="pro-query"
                      className="text-sm font-semibold"
                    >
                      What are you looking for?
                    </label>

                    <textarea
                      id="pro-query"
                      value={proQuery}
                      onChange={(event) =>
                        setProQuery(event.target.value)
                      }
                      placeholder="Example: I need a gaming laptop for programming and gaming."
                      rows={4}
                      className="mt-2 w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="pro-budget"
                      className="text-sm font-semibold"
                    >
                      Maximum budget{" "}
                      <span className="font-normal text-gray-400">
                        (optional)
                      </span>
                    </label>

                    <div className="mt-2 flex items-center rounded-2xl border border-gray-200 px-4">
                      <span className="text-sm font-semibold">
                        ₹
                      </span>

                      <input
                        id="pro-budget"
                        type="number"
                        min="1"
                        value={proBudget}
                        onChange={(event) =>
                          setProBudget(event.target.value)
                        }
                        placeholder="80000"
                        className="w-full border-0 px-2 py-3 text-sm outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleProRecommendation}
                    disabled={proLoading}
                    className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Sparkles size={16} />

                    {proLoading
                      ? "Analyzing products..."
                      : "Get Pro Recommendations"}
                  </button>

                  {proError && (
                    <div className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
                      {proError}
                    </div>
                  )}

                  {proRecommendations && (
                    <div className="rounded-2xl bg-gray-50 p-6">
                      <div className="mb-4 flex items-center gap-2">
                        <Sparkles size={18} />

                        <h3 className="font-bold">
                          TechStore Pro AI
                        </h3>
                      </div>

                      <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
                        {proRecommendations}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 px-6 py-4 font-semibold transition hover:border-black hover:bg-gray-50"
            >
              <LogOut size={18} />
              Log out
            </button>
          </div>

          {/* Sidebar */}
          <aside className="h-fit rounded-3xl bg-gray-50 p-7">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white">
              <User size={24} />
            </div>

            <h2 className="mt-6 text-2xl font-black">
              Your account
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Manage your profile, orders, and TechStore
              Pro membership from one place.
            </p>

            <div className="mt-7 space-y-3">
              <Link
                to="/orders"
                className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 text-sm font-semibold"
              >
                Orders
                <ArrowRight size={17} />
              </Link>

              <Link
                to="/wishlist"
                className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 text-sm font-semibold"
              >
                Wishlist
                <ArrowRight size={17} />
              </Link>

              <Link
                to="/products"
                className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 text-sm font-semibold"
              >
                Browse products
                <ArrowRight size={17} />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

