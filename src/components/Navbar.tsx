import { Link, NavLink } from "react-router-dom";

import {
  ShoppingBag,
  Menu,
  X,
  Search,
  User,
  LogOut,
} from "lucide-react";

import { useState } from "react";

import { useCart } from "../context/CartContext";

import { useAuth } from "../context/AuthContext";

const navigation = [
  { name: "Home", path: "/" },
  { name: "Products", path: "/products" },
  { name: "About", path: "/about" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const { totalItems } = useCart();

  const { user, loading, logout } = useAuth();

  async function handleLogout() {
    try {
      await logout();
      setMobileOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-6">
        {/* LOGO */}
        <Link
          to="/"
          className="text-xl font-black tracking-tight sm:text-2xl"
        >
          TECH<span className="text-gray-400">STORE</span>
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden items-center gap-8 md:flex">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `text-sm font-medium transition ${
                  isActive
                    ? "text-black"
                    : "text-gray-500 hover:text-black"
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* DESKTOP ACTIONS */}
        <div className="hidden items-center gap-2 md:flex">
          {/* SEARCH */}
          <button
            aria-label="Search"
            className="rounded-full p-2.5 transition hover:bg-gray-100"
          >
            <Search size={19} />
          </button>

          {/* CART */}
          <Link
            to="/cart"
            aria-label={`Shopping cart with ${totalItems} items`}
            className="relative rounded-full p-2.5 transition hover:bg-gray-100"
          >
            <ShoppingBag size={19} />

            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-[10px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>

          {/* AUTH */}
          {loading ? (
            <div className="ml-2 h-10 w-24 animate-pulse rounded-full bg-gray-100" />
          ) : user ? (
            <div className="ml-2 flex items-center gap-2">
              {/* ADMIN PANEL - ADMIN ONLY */}
              {user.role === "ADMIN" && (
                <Link
                  to="/admin"
                  className="rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  Admin Panel
                </Link>
              )}

              {/* ACCOUNT */}
              <Link
                to="/account"
                className="rounded-full px-4 py-2.5 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-black"
              >
                Account
              </Link>

              {/* ORDERS */}
              <Link
                to="/orders"
                className="rounded-full px-4 py-2.5 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-black"
              >
                My Orders
              </Link>

              {/* WISHLIST */}
              <Link
                to="/wishlist"
                className="rounded-full px-4 py-2.5 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-black"
              >
                Wishlist
              </Link>

              {/* USER */}
              <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2.5">
                <User size={17} />

                <span className="max-w-28 truncate text-sm font-semibold">
                  Hi, {user.name}
                </span>
              </div>

              {/* LOGOUT */}
              <button
                onClick={handleLogout}
                aria-label="Logout"
                className="rounded-full p-2.5 transition hover:bg-gray-100"
                title="Logout"
              >
                <LogOut size={19} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="ml-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Login
            </Link>
          )}
        </div>

        {/* MOBILE BUTTON */}
        <button
          aria-label="Toggle navigation"
          className="rounded-full p-2 md:hidden"
          onClick={() =>
            setMobileOpen((current) => !current)
          }
        >
          {mobileOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>

      {/* MOBILE NAV */}
      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-5 py-5">
            {/* MAIN NAVIGATION */}
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className="border-b border-gray-100 py-4 text-sm font-medium"
              >
                {item.name}
              </NavLink>
            ))}

            {/* CART */}
            <Link
              to="/cart"
              onClick={() => setMobileOpen(false)}
              className="border-b border-gray-100 py-4 text-sm font-medium"
            >
              Cart
              {totalItems > 0 && ` (${totalItems})`}
            </Link>

            {/* AUTH */}
            {loading ? (
              <div className="mt-5 h-11 animate-pulse rounded-xl bg-gray-100" />
            ) : user ? (
              <>
                {/* ADMIN PANEL - ADMIN ONLY */}
                {user.role === "ADMIN" && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="border-b border-gray-100 py-4 text-sm font-semibold"
                  >
                    Admin Panel
                  </Link>
                )}

                {/* ACCOUNT */}
                <Link
                  to="/account"
                  onClick={() => setMobileOpen(false)}
                  className="border-b border-gray-100 py-4 text-sm font-medium"
                >
                  Account
                </Link>

                {/* ORDERS */}
                <Link
                  to="/orders"
                  onClick={() => setMobileOpen(false)}
                  className="border-b border-gray-100 py-4 text-sm font-medium"
                >
                  My Orders
                </Link>

                {/* WISHLIST */}
                <Link
                  to="/wishlist"
                  onClick={() => setMobileOpen(false)}
                  className="border-b border-gray-100 py-4 text-sm font-medium"
                >
                  Wishlist
                </Link>

                {/* USER INFO */}
                <div className="mt-5 flex items-center gap-3 rounded-xl bg-gray-100 px-4 py-3">
                  <User size={18} />

                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">
                      Signed in as
                    </p>

                    <p className="truncate text-sm font-semibold">
                      {user.name}
                    </p>
                  </div>
                </div>

                {/* LOGOUT */}
                <button
                  onClick={handleLogout}
                  className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold"
                >
                  <LogOut size={17} />
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="mt-5 rounded-xl bg-black py-3 text-center text-sm font-semibold text-white"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}


