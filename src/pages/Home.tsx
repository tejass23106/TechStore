import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { getProducts } from "../lib/api";

type Product = {
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

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (error) {
        console.error("Home products error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const featuredProducts = products.slice(0, 3);

  return (
    <main>
      {/* HERO */}
      <section className="bg-black px-6 py-24 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-gray-300">
            <Sparkles size={16} />
            New technology. Better experiences.
          </div>

          <h1 className="max-w-4xl text-5xl font-black tracking-tight md:text-7xl">
            Technology that moves with you.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-400">
            Discover powerful laptops, smartphones and accessories
            designed for work, gaming and everyday life.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/products"
              className="flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-semibold text-black transition hover:bg-gray-200"
            >
              Explore products
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/about"
              className="rounded-full border border-white/20 px-7 py-3.5 font-semibold transition hover:bg-white/10"
            >
              Our story
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">
            Explore
          </p>

          <h2 className="mt-3 text-4xl font-bold tracking-tight">
            Everything you need.
          </h2>

          <p className="mt-4 max-w-2xl text-gray-500">
            Explore technology for productivity, entertainment and
            everything in between.
          </p>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/products"
              className="rounded-3xl border p-7 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 font-bold">
                01
              </div>

              <h3 className="mt-8 text-xl font-bold">
                Laptops
              </h3>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                Powerful machines for work, study and gaming.
              </p>

              <p className="mt-6 text-sm font-semibold">
                Explore →
              </p>
            </Link>

            <Link
              to="/products"
              className="rounded-3xl border p-7 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 font-bold">
                02
              </div>

              <h3 className="mt-8 text-xl font-bold">
                Smartphones
              </h3>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                The latest phones built for modern life.
              </p>

              <p className="mt-6 text-sm font-semibold">
                Explore →
              </p>
            </Link>

            <Link
              to="/products"
              className="rounded-3xl border p-7 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 font-bold">
                03
              </div>

              <h3 className="mt-8 text-xl font-bold">
                Accessories
              </h3>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                Complete your setup with useful accessories.
              </p>

              <p className="mt-6 text-sm font-semibold">
                Explore →
              </p>
            </Link>

            <Link
              to="/products"
              className="rounded-3xl border p-7 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 font-bold">
                04
              </div>

              <h3 className="mt-8 text-xl font-bold">
                Gaming
              </h3>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                High-performance technology for serious gamers.
              </p>

              <p className="mt-6 text-sm font-semibold">
                Explore →
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">
                Featured
              </p>

              <h2 className="mt-3 text-4xl font-bold tracking-tight">
                Popular right now.
              </h2>
            </div>

            <Link
              to="/products"
              className="text-sm font-semibold hover:underline"
            >
              View all products →
            </Link>
          </div>

          {loading ? (
            <div className="mt-12 py-20 text-center">
              <p className="text-gray-500">
                Loading featured products...
              </p>
            </div>
          ) : (
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {featuredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className="group overflow-hidden rounded-3xl border bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="aspect-square overflow-hidden bg-gray-100">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="p-7">
                    <p className="text-sm text-gray-500">
                      {product.category}
                    </p>

                    <h3 className="mt-2 text-lg font-bold">
                      {product.name}
                    </h3>

                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-lg font-bold">
                        ₹{product.price.toLocaleString("en-IN")}
                      </span>

                      <span className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white">
                        View
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* BENEFITS */}
      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold">
              Secure shopping
            </h3>

            <p className="mt-3 leading-7 text-gray-500">
              Your account and personal information are protected
              using modern security practices.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold">
              Fast delivery
            </h3>

            <p className="mt-3 leading-7 text-gray-500">
              Reliable delivery designed to get your order to you quickly.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold">
              Human support
            </h3>

            <p className="mt-3 leading-7 text-gray-500">
              Get help from our support team whenever you need it.
            </p>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl rounded-3xl bg-black px-6 py-16 text-center text-white">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Stay ahead of the technology curve.
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-gray-400">
            Get product launches, technology updates and special offers
            delivered to your inbox.
          </p>

          <form className="mx-auto mt-8 flex max-w-lg flex-col gap-3 sm:flex-row">
            <input
              type="email"
              placeholder="Your email address"
              className="min-w-0 flex-1 rounded-full px-5 py-3 text-black outline-none"
            />

            <button
              type="submit"
              className="rounded-full bg-white px-6 py-3 font-semibold text-black hover:bg-gray-200"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

