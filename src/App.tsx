import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import About from "./pages/About";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";
import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";
import Account from "./pages/Account";
import Wishlist from "./pages/Wishlist";
import Admin from "./pages/Admin";
import AdminRoute from "./components/AdminRoute";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>

        <Route path="/" element={<Home />} />

        <Route path="/products" element={<Products />} />

        <Route path="/account" element={<Account />} />

        <Route path="/wishlist" element={<Wishlist />} />

        <Route
          path="/products/:id"
          element={<ProductDetails />}
        />

        <Route path="/about" element={<About />} />

        <Route path="/login" element={<Login />} />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />
        <Route
  path="/verify-email"
  element={<VerifyEmail />}
/>

        <Route path="/register" element={<Register />} />

        <Route path="/cart" element={<Cart />} />

        <Route path="/checkout" element={<Checkout />} />

        <Route path="/orders" element={<Orders />} />

        <Route
          path="/orders/:id"
          element={<OrderDetails />}
        />
        

        {/* ADMIN ROUTES */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<Admin />} />
        </Route>

      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}