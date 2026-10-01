import { useEffect, useMemo, useState } from "react";
import ProductCard from "../components/ProductCard";
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

type SortOption =
  | "default"
  | "price-low"
  | "price-high"
  | "rating-high"
  | "rating-low";

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("default");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getProducts()
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load products.");
        setLoading(false);
      });
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(products.map((product) => product.category))
    );

    return ["All", ...uniqueCategories];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const categoryMatch =
        category === "All" || product.category === category;

      const searchMatch = product.name
        .toLowerCase()
        .includes(search.toLowerCase().trim());

      const stockMatch = !inStockOnly || product.stock > 0;

      return categoryMatch && searchMatch && stockMatch;
    });

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "price-low":
          return a.price - b.price;

        case "price-high":
          return b.price - a.price;

        case "rating-high":
          return b.rating - a.rating;

        case "rating-low":
          return a.rating - b.rating;

        default:
          return a.id - b.id;
      }
    });
  }, [products, category, search, sort, inStockOnly]);

  const hasActiveFilters =
    search.trim() !== "" ||
    category !== "All" ||
    sort !== "default" ||
    inStockOnly;

  const clearFilters = () => {
    setSearch("");
    setCategory("All");
    setSort("default");
    setInStockOnly(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-16">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-gray-500">Loading products...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen px-6 py-16">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-2xl font-bold">Something went wrong</h2>

          <p className="mt-3 text-gray-500">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">
            Store
          </p>

          <h1 className="mt-3 text-5xl font-black tracking-tight">
            Explore our products.
          </h1>

          <p className="mt-5 leading-7 text-gray-500">
            Discover technology designed for productivity, gaming
            and everyday life.
          </p>
        </div>

        {/* Search */}
        <div className="mt-10">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-2xl border border-gray-200 px-5 py-4 outline-none transition focus:border-black"
          />
        </div>

        {/* Categories */}
        <div className="mt-6 flex flex-wrap gap-3">
          {categories.map((item) => {
            const active = category === item;

            return (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={
                  active
                    ? "rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white"
                    : "rounded-full bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200"
                }
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex flex-wrap items-center gap-3">

            {/* Sort */}
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as SortOption)
              }
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-black"
            >
              <option value="default">Sort: Recommended</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating-high">Rating: High to Low</option>
              <option value="rating-low">Rating: Low to High</option>
            </select>

            {/* Stock filter */}
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(event) =>
                  setInStockOnly(event.target.checked)
                }
                className="h-4 w-4"
              />

              In stock only
            </label>

          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Result count */}
        <div className="mt-8 flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {filteredProducts.length} of {products.length} products
          </span>
        </div>

        {/* Products */}
        {filteredProducts.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center">
            <h2 className="text-2xl font-bold">
              No products found
            </h2>

            <p className="mt-3 text-gray-500">
              Try another search or category.
            </p>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-6 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

      </div>
    </main>
  );
}