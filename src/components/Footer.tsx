export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              TECHSTORE
            </h2>

            <p className="mt-3 font-medium text-gray-900">
              Your tech. Your setup. Your way.
            </p>

            <p className="mt-3 max-w-xs text-sm leading-6 text-gray-500">
              Tech shopping without the headache. Find it, compare it, add it,
              done.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Shop</h3>

            <ul className="mt-4 space-y-3 text-sm text-gray-500">
              <li>
                <a href="/products" className="transition hover:text-gray-900">
                  All Products
                </a>
              </li>

              <li>
                <a
                  href="/products?category=Laptops"
                  className="transition hover:text-gray-900"
                >
                  Laptops
                </a>
              </li>

              <li>
                <a
                  href="/products?category=Phones"
                  className="transition hover:text-gray-900"
                >
                  Phones
                </a>
              </li>

              <li>
                <a
                  href="/products?category=Monitors"
                  className="transition hover:text-gray-900"
                >
                  Monitors
                </a>
              </li>

              <li>
                <a
                  href="/products?category=Accessories"
                  className="transition hover:text-gray-900"
                >
                  Accessories
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Company</h3>

            <ul className="mt-4 space-y-3 text-sm text-gray-500">
              <li>
                <a href="/about" className="transition hover:text-gray-900">
                  About
                </a>
              </li>

              <li>
                <a href="/account" className="transition hover:text-gray-900">
                  My Account
                </a>
              </li>

              <li>
                <a href="/wishlist" className="transition hover:text-gray-900">
                  Wishlist
                </a>
              </li>

              <li>
                <a href="/orders" className="transition hover:text-gray-900">
                  Orders
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Support</h3>

            <ul className="mt-4 space-y-3 text-sm text-gray-500">
              <li>
                <a href="/orders" className="transition hover:text-gray-900">
                  Help & Support
                </a>
              </li>

              <li>
                <span>Shipping & Delivery</span>
              </li>

              <li>
                <span>Returns & Refunds</span>
              </li>

              <li>
                <a href="/orders" className="transition hover:text-gray-900">
                  Track Your Order
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col gap-3 border-t border-gray-100 pt-6 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} TechStore. Built for people who love
            good tech.
          </p>

          <p>Find it. Compare it. Add it.</p>
        </div>
      </div>
    </footer>
  );
}

