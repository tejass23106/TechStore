import { useEffect, useState } from "react";

import {
  Users,
  Package,
  ShoppingCart,
  CreditCard,
  Clock,
  AlertTriangle,
  IndianRupee,
  Boxes,
  Plus,
  Pencil,
  Archive,
  RotateCcw,
  Search,
  X,
  Eye,
  Star,
  Trash2,
} from "lucide-react";
import {
  getAdminDashboard,
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  setAdminProductActive,
  getAdminOrders,
  updateAdminOrderStatus,
  type AdminDashboardStatistics,
  type AdminProduct,
  type AdminOrder,
   type AdminUser,
  getAdminUsers,
  type AdminReview,
  getAdminReviews,
  deleteAdminReview,
} from "../lib/api";
type ProductForm = {
  name: string;
  price: string;
  category: string;
  rating: string;
  stock: string;
  image: string;
  description: string;
};

const emptyForm: ProductForm = {
  name: "",
  price: "",
  category: "",
  rating: "0",
  stock: "0",
  image: "",
  description: "",
};

export default function Admin() {
  const [statistics, setStatistics] =
    useState<AdminDashboardStatistics | null>(null);

  const [products, setProducts] = useState<AdminProduct[]>([]);

  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);

  const [error, setError] = useState("");
  const [productError, setProductError] = useState("");

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<AdminProduct | null>(null);

  const [form, setForm] = useState<ProductForm>(emptyForm);

  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
const [ordersLoading, setOrdersLoading] = useState(true);
const [orderError, setOrderError] = useState("");
const [orderSearch, setOrderSearch] = useState("");
const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
const [selectedOrder, setSelectedOrder] =
  useState<AdminOrder | null>(null);
const [updatingOrder, setUpdatingOrder] =
  useState<number | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
const [usersLoading, setUsersLoading] = useState(true);
const [userError, setUserError] = useState("");
const [userSearch, setUserSearch] = useState("");
const [selectedUser, setSelectedUser] =
  useState<AdminUser | null>(null);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
const [reviewsLoading, setReviewsLoading] = useState(true);
const [reviewError, setReviewError] = useState("");
const [reviewSearch, setReviewSearch] = useState("");
const [deletingReview, setDeletingReview] =
  useState<number | null>(null);
  const [selectedReview, setSelectedReview] =
  useState<AdminReview | null>(null);

  useEffect(() => {
  loadDashboard();
  loadProducts();
  loadOrders();
  loadUsers();
  loadReviews();
}, []);

  async function loadDashboard() {
    try {
      const data = await getAdminDashboard();
      setStatistics(data.statistics);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }
  async function loadUsers() {
  try {
    setUsersLoading(true);
    setUserError("");

    const data = await getAdminUsers();
    setUsers(data.users);
  } catch (error) {
    setUserError(
      error instanceof Error
        ? error.message
        : "Failed to load users"
    );
  } finally {
    setUsersLoading(false);
  }
}

async function loadReviews() {
  try {
    setReviewsLoading(true);
    setReviewError("");

    const data = await getAdminReviews();

    setReviews(data.reviews);
  } catch (error) {
    setReviewError(
      error instanceof Error
        ? error.message
        : "Failed to load reviews"
    );
  } finally {
    setReviewsLoading(false);
  }
}
async function handleDeleteReview(review: AdminReview) {
  const confirmed = window.confirm(
    `Are you sure you want to delete this review by ${review.user.name}?`
  );

  if (!confirmed) {
    return;
  }

  try {
    setDeletingReview(review.id);
    setReviewError("");

    await deleteAdminReview(review.id);

    setReviews((current) =>
      current.filter((item) => item.id !== review.id)
    );

    setSelectedReview((current) =>
      current?.id === review.id ? null : current
    );

    await loadDashboard();
  } catch (error) {
    setReviewError(
      error instanceof Error
        ? error.message
        : "Failed to delete review"
    );
  } finally {
    setDeletingReview(null);
  }
}

  async function loadProducts() {
    try {
      setProductsLoading(true);
      setProductError("");

      const data = await getAdminProducts();
      setProducts(data.products);
    } catch (error) {
      setProductError(
        error instanceof Error
          ? error.message
          : "Failed to load products"
      );
    } finally {
      setProductsLoading(false);
    }
  }
  async function loadOrders() {
  try {
    setOrdersLoading(true);
    setOrderError("");

    const data = await getAdminOrders();
    setOrders(data.orders);
  } catch (error) {
    setOrderError(
      error instanceof Error
        ? error.message
        : "Failed to load orders"
    );
  } finally {
    setOrdersLoading(false);
  }
}

  function openAddForm() {
    setEditingProduct(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(product: AdminProduct) {
    setEditingProduct(product);

    setForm({
      name: product.name,
      price: String(product.price),
      category: product.category,
      rating: String(product.rating),
      stock: String(product.stock),
      image: product.image,
      description: product.description,
    });

    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingProduct(null);
    setForm(emptyForm);
  }

  function handleFormChange(
    field: keyof ProductForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) 
  {
    event.preventDefault();

    try {
      setSaving(true);
      setProductError("");

      const productData = {
        name: form.name.trim(),
        price: Number(form.price),
        category: form.category.trim(),
        rating: Number(form.rating),
        stock: Number(form.stock),
        image: form.image.trim(),
        description: form.description.trim(),
      };

      if (!productData.name) {
        throw new Error("Product name is required");
      }

      if (productData.price < 0) {
        throw new Error("Price cannot be negative");
      }

      if (productData.stock < 0) {
        throw new Error("Stock cannot be negative");
      }

      if (
        productData.rating < 0 ||
        productData.rating > 5
      ) {
        throw new Error("Rating must be between 0 and 5");
      }

      if (editingProduct) {
        await updateAdminProduct(
          editingProduct.id,
          productData
        );
      } else {
        await createAdminProduct(productData);
      }

      closeForm();
      await loadProducts();
      await loadDashboard();
    } catch (error) {
      setProductError(
        error instanceof Error
          ? error.message
          : "Failed to save product"
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleProductActive(
    product: AdminProduct
  )
  
  {
    const action = product.active
      ? "archive"
      : "restore";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${product.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProductError("");

      await setAdminProductActive(
        product.id,
        !product.active
      );

      await loadProducts();
      await loadDashboard();
    } catch (error) {
      setProductError(
        error instanceof Error
          ? error.message
          : "Failed to update product status"
      );
    }
  }
  async function handleOrderStatusChange(
  orderId: number,
  status: AdminOrder["status"]
) {
  try {
    setUpdatingOrder(orderId);
    setOrderError("");

    await updateAdminOrderStatus(orderId, status);

    await loadOrders();
    await loadDashboard();

    setSelectedOrder((current) => {
      if (!current || current.id !== orderId) {
        return current;
      }

      return {
        ...current,
        status,
      };
    });
  } catch (error) {
    setOrderError(
      error instanceof Error
        ? error.message
        : "Failed to update order status"
    );
  } finally {
    setUpdatingOrder(null);
  }
}

  const filteredProducts = products.filter((product) => {
    const searchText = search.toLowerCase();

    return (
      product.name.toLowerCase().includes(searchText) ||
      product.category.toLowerCase().includes(searchText)
    );
  });
  const filteredOrders = orders.filter((order) => {
  const searchText = orderSearch.toLowerCase();

  const matchesSearch =
    String(order.id).includes(searchText) ||
    order.user.name.toLowerCase().includes(searchText) ||
    order.user.email.toLowerCase().includes(searchText);

  const matchesStatus =
    orderStatusFilter === "ALL" ||
    order.status === orderStatusFilter;

  return matchesSearch && matchesStatus;
});
const filteredUsers = users.filter((user) => {
  const searchText = userSearch.toLowerCase();

  return (
    String(user.id).includes(searchText) ||
    user.name.toLowerCase().includes(searchText) ||
    user.email.toLowerCase().includes(searchText)
  );
});
const filteredReviews = reviews.filter((review) => {
  const searchText = reviewSearch.toLowerCase();

  return (
    String(review.id).includes(searchText) ||
    review.user.name.toLowerCase().includes(searchText) ||
    review.user.email.toLowerCase().includes(searchText) ||
    review.product.name.toLowerCase().includes(searchText) ||
    String(review.rating).includes(searchText) ||
    (review.comment ?? "").toLowerCase().includes(searchText)
  );
});


  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-16">
        <p className="text-gray-500">
          Loading admin dashboard...
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-bold text-red-700">
            Unable to load dashboard
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>
        </div>
      </main>
    );
  }

  if (!statistics) {
    return null;
  }

  const cards = [
    {
      title: "Total Users",
      value: statistics.totalUsers,
      icon: Users,
    },
    {
      title: "Total Products",
      value: statistics.totalProducts,
      icon: Package,
    },
    {
      title: "Active Products",
      value: statistics.activeProducts,
      icon: Boxes,
    },
    {
      title: "Total Orders",
      value: statistics.totalOrders,
      icon: ShoppingCart,
    },
    {
      title: "Paid Orders",
      value: statistics.paidOrders,
      icon: CreditCard,
    },
    {
      title: "Pending Orders",
      value: statistics.pendingOrders,
      icon: Clock,
    },
    {
      title: "Low Stock",
      value: statistics.lowStockProducts,
      icon: AlertTriangle,
    },
    {
      title: "Total Sales",
      value: `₹${statistics.totalSales.toLocaleString(
        "en-IN"
      )}`,
      icon: IndianRupee,
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}

      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Admin
        </p>

        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Dashboard
        </h1>

        <p className="mt-3 text-gray-500">
          Overview of your TechStore platform.
        </p>
      </div>

      {/* Statistics */}

      <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-gray-100 p-3">
                  <Icon size={22} />
                </div>
              </div>

              <p className="mt-6 text-sm text-gray-500">
                {card.title}
              </p>

              <p className="mt-2 text-3xl font-bold">
                {card.value}
              </p>
            </div>
          );
        })}
      </section>

      {/* Product Management */}

      <section className="mt-10 rounded-3xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Product Management
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Add, edit, archive and restore products.
            </p>
          </div>

          <button
            onClick={openAddForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <Plus size={18} />
            Add Product
          </button>
        </div>

        {/* Search */}

        <div className="relative mt-6">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            placeholder="Search products by name or category..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 outline-none transition focus:border-black"
          />
        </div>

        {/* Error */}

        {productError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {productError}
          </div>
        )}

        {/* Product List */}

        <div className="mt-6 overflow-x-auto">
          {productsLoading ? (
            <p className="py-8 text-center text-gray-500">
              Loading products...
            </p>
          ) : filteredProducts.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No products found.
            </p>
          ) : (
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-gray-200 text-sm text-gray-500">
                  <th className="px-4 py-4 font-medium">
                    Product
                  </th>

                  <th className="px-4 py-4 font-medium">
                    Category
                  </th>

                  <th className="px-4 py-4 font-medium">
                    Price
                  </th>

                  <th className="px-4 py-4 font-medium">
                    Stock
                  </th>

                  <th className="px-4 py-4 font-medium">
                    Status
                  </th>

                  <th className="px-4 py-4 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-14 w-14 rounded-xl bg-gray-100 object-cover"
                        />

                        <div>
                          <p className="font-semibold">
                            {product.name}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            ID: {product.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm">
                      {product.category}
                    </td>

                    <td className="px-4 py-4 text-sm font-semibold">
                      ₹{product.price.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-4 text-sm">
                      {product.stock}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          product.active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {product.active
                          ? "Active"
                          : "Archived"}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            openEditForm(product)
                          }
                          className="rounded-lg border border-gray-200 p-2 transition hover:bg-gray-100"
                          title="Edit product"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() =>
                            toggleProductActive(product)
                          }
                          className="rounded-lg border border-gray-200 p-2 transition hover:bg-gray-100"
                          title={
                            product.active
                              ? "Archive product"
                              : "Restore product"
                          }
                        >
                          {product.active ? (
                            <Archive size={16} />
                          ) : (
                            <RotateCcw size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

     {/* Order Management */}

<section className="mt-10 rounded-3xl border border-gray-200 bg-white p-6">
  <div>
    <h2 className="text-2xl font-bold">
      Order Management
    </h2>

    <p className="mt-1 text-sm text-gray-500">
      View customer orders and update their status.
    </p>
  </div>

  {/* Search + Filter */}

  <div className="mt-6 grid gap-4 md:grid-cols-[1fr_220px]">
    <div className="relative">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
      />

      <input
        type="text"
        placeholder="Search by order ID, customer or email..."
        value={orderSearch}
        onChange={(event) =>
          setOrderSearch(event.target.value)
        }
        className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 outline-none transition focus:border-black"
      />
    </div>

    <select
      value={orderStatusFilter}
      onChange={(event) =>
        setOrderStatusFilter(event.target.value)
      }
      className="rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
    >
      <option value="ALL">All Statuses</option>
      <option value="PENDING">Pending</option>
      <option value="CONFIRMED">Confirmed</option>
      <option value="PROCESSING">Processing</option>
      <option value="SHIPPED">Shipped</option>
      <option value="DELIVERED">Delivered</option>
      <option value="CANCELLED">Cancelled</option>
    </select>
  </div>

  {orderError && (
    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
      {orderError}
    </div>
  )}

  {/* Orders Table */}

  <div className="mt-6 overflow-x-auto">
    {ordersLoading ? (
      <p className="py-8 text-center text-gray-500">
        Loading orders...
      </p>
    ) : filteredOrders.length === 0 ? (
      <p className="py-8 text-center text-gray-500">
        No orders found.
      </p>
    ) : (
      <table className="w-full min-w-[1000px] text-left">
        <thead>
          <tr className="border-b border-gray-200 text-sm text-gray-500">
            <th className="px-4 py-4 font-medium">
              Order
            </th>

            <th className="px-4 py-4 font-medium">
              Customer
            </th>

            <th className="px-4 py-4 font-medium">
              Date
            </th>

            <th className="px-4 py-4 font-medium">
              Items
            </th>

            <th className="px-4 py-4 font-medium">
              Total
            </th>

            <th className="px-4 py-4 font-medium">
              Payment
            </th>

            <th className="px-4 py-4 font-medium">
              Status
            </th>

            <th className="px-4 py-4 font-medium">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {filteredOrders.map((order) => (
            <tr
              key={order.id}
              className="border-b border-gray-100 last:border-0"
            >
              <td className="px-4 py-4">
                <p className="font-semibold">
                  #{order.id}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {order.items.length} product
                  {order.items.length !== 1 ? "s" : ""}
                </p>
              </td>

              <td className="px-4 py-4">
                <p className="font-semibold">
                  {order.user.name}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {order.user.email}
                </p>
              </td>

              <td className="px-4 py-4 text-sm">
                {new Date(
                  order.createdAt
                ).toLocaleDateString("en-IN")}
              </td>

              <td className="px-4 py-4 text-sm">
                {order.items.reduce(
                  (total, item) =>
                    total + item.quantity,
                  0
                )}
              </td>

              <td className="px-4 py-4 text-sm font-semibold">
                ₹{order.total.toLocaleString("en-IN")}
              </td>

              <td className="px-4 py-4">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    order.paymentStatus === "PAID"
                      ? "bg-green-100 text-green-700"
                      : order.paymentStatus ===
                        "FAILED"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {order.paymentStatus}
                </span>
              </td>

              <td className="px-4 py-4">
                <select
                  value={order.status}
                  disabled={
                    updatingOrder === order.id
                  }
                  onChange={(event) =>
                    handleOrderStatusChange(
                      order.id,
                      event.target
                        .value as AdminOrder["status"]
                    )
                  }
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black disabled:opacity-50"
                >
                  <option value="PENDING">
                    Pending
                  </option>
                  <option value="CONFIRMED">
                    Confirmed
                  </option>
                  <option value="PROCESSING">
                    Processing
                  </option>
                  <option value="SHIPPED">
                    Shipped
                  </option>
                  <option value="DELIVERED">
                    Delivered
                  </option>
                  <option value="CANCELLED">
                    Cancelled
                  </option>
                </select>
              </td>

              <td className="px-4 py-4">
                <button
                  onClick={() =>
                    setSelectedOrder(order)
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold transition hover:bg-gray-100"
                >
                  <Eye size={16} />
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
</section>
{/* User Management */}
<section className="mt-10 rounded-3xl border border-gray-200 bg-white p-6">
  <div>
    <h2 className="text-2xl font-bold">
      User Management
    </h2>

    <p className="mt-1 text-sm text-gray-500">
      View registered customers, roles and order history count.
    </p>
  </div>

  {/* Search */}
  <div className="relative mt-6">
    <Search
      size={18}
      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
    />

    <input
      type="text"
      placeholder="Search by user ID, name or email..."
      value={userSearch}
      onChange={(event) =>
        setUserSearch(event.target.value)
      }
      className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 outline-none transition focus:border-black"
    />
  </div>

  {/* Error */}
  {userError && (
    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
      {userError}
    </div>
  )}

  {/* Users Table */}
  <div className="mt-6 overflow-x-auto">
    {usersLoading ? (
      <p className="py-8 text-center text-gray-500">
        Loading users...
      </p>
    ) : filteredUsers.length === 0 ? (
      <p className="py-8 text-center text-gray-500">
        No users found.
      </p>
    ) : (
      <table className="w-full min-w-[900px] text-left">
        <thead>
          <tr className="border-b border-gray-200 text-sm text-gray-500">
            <th className="px-4 py-4 font-medium">
              User
            </th>

            <th className="px-4 py-4 font-medium">
              Email
            </th>

            <th className="px-4 py-4 font-medium">
              Role
            </th>

            <th className="px-4 py-4 font-medium">
              Orders
            </th>

            <th className="px-4 py-4 font-medium">
              Joined
            </th>

            <th className="px-4 py-4 font-medium">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {filteredUsers.map((user) => (
            <tr
              key={user.id}
              className="border-b border-gray-100 last:border-0"
            >
              <td className="px-4 py-4">
                <p className="font-semibold">
                  {user.name}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  ID: {user.id}
                </p>
              </td>

              <td className="px-4 py-4 text-sm">
                {user.email}
              </td>

              <td className="px-4 py-4">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    user.role === "ADMIN"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {user.role}
                </span>
              </td>

              <td className="px-4 py-4 text-sm">
                {user.orderCount}
              </td>

              <td className="px-4 py-4 text-sm">
                {new Date(
                  user.createdAt
                ).toLocaleDateString("en-IN")}
              </td>

              <td className="px-4 py-4">
                <button
                  onClick={() => setSelectedUser(user)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold transition hover:bg-gray-100"
                >
                  <Eye size={16} />
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
</section>

{/* Review Management */}
<section className="mt-10 rounded-3xl border border-gray-200 bg-white p-6">
  <div>
    <h2 className="text-2xl font-bold">
      Review Management
    </h2>

    <p className="mt-1 text-sm text-gray-500">
      View customer reviews and remove inappropriate reviews.
    </p>
  </div>

  {/* Search */}
  <div className="relative mt-6">
    <Search
      size={18}
      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
    />

    <input
      type="text"
      placeholder="Search by review, customer or product..."
      value={reviewSearch}
      onChange={(event) =>
        setReviewSearch(event.target.value)
      }
      className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 outline-none transition focus:border-black"
    />
  </div>

  {/* Error */}
  {reviewError && (
    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
      {reviewError}
    </div>
  )}

  {/* Reviews Table */}
  <div className="mt-6 overflow-x-auto">
    {reviewsLoading ? (
      <p className="py-8 text-center text-gray-500">
        Loading reviews...
      </p>
    ) : filteredReviews.length === 0 ? (
      <p className="py-8 text-center text-gray-500">
        No reviews found.
      </p>
    ) : (
      <table className="w-full min-w-[1100px] text-left">
        <thead>
          <tr className="border-b border-gray-200 text-sm text-gray-500">
            <th className="px-4 py-4 font-medium">
              Review
            </th>

            <th className="px-4 py-4 font-medium">
              Customer
            </th>

            <th className="px-4 py-4 font-medium">
              Product
            </th>

            <th className="px-4 py-4 font-medium">
              Rating
            </th>

            <th className="px-4 py-4 font-medium">
              Comment
            </th>

            <th className="px-4 py-4 font-medium">
              Date
            </th>

            <th className="px-4 py-4 font-medium">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {filteredReviews.map((review) => (
            <tr
              key={review.id}
              className="border-b border-gray-100 last:border-0"
            >
              {/* Review ID */}
              <td className="px-4 py-4">
                <p className="font-semibold">
                  #{review.id}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Review ID
                </p>
              </td>

              {/* Customer */}
              <td className="px-4 py-4">
                <p className="font-semibold">
                  {review.user.name}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {review.user.email}
                </p>
              </td>

              {/* Product */}
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <img
                    src={review.product.image}
                    alt={review.product.name}
                    className="h-12 w-12 rounded-xl bg-gray-100 object-cover"
                  />

                  <div>
                    <p className="font-semibold">
                      {review.product.name}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      ID: {review.product.id}
                    </p>
                  </div>
                </div>
              </td>

              {/* Rating */}
              <td className="px-4 py-4">
                <div className="flex items-center gap-1">
                  <Star
                    size={16}
                    className="fill-current"
                  />

                  <span className="font-semibold">
                    {review.rating}/5
                  </span>
                </div>
              </td>

              {/* Comment */}
              <td className="max-w-xs px-4 py-4">
                <p className="truncate text-sm text-gray-600">
                  {review.comment || "No comment"}
                </p>
              </td>

              {/* Date */}
              <td className="px-4 py-4 text-sm">
                {new Date(
                  review.createdAt
                ).toLocaleDateString("en-IN")}
              </td>

              {/* Actions */}
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setSelectedReview(review)
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold transition hover:bg-gray-100"
                  >
                    <Eye size={16} />
                    View
                  </button>

                  <button
                    onClick={() =>
                      handleDeleteReview(review)
                    }
                    disabled={
                      deletingReview === review.id
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={16} />

                    {deletingReview === review.id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
</section>
      {/* Product Form Modal */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {editingProduct
                    ? "Edit Product"
                    : "Add Product"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {editingProduct
                    ? "Update product information."
                    : "Create a new TechStore product."}
                </p>
              </div>

              <button
                onClick={closeForm}
                className="rounded-xl p-2 transition hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-5"
            >
              <div>
                <label className="text-sm font-semibold">
                  Product Name
                </label>

                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    handleFormChange(
                      "name",
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
                  placeholder="Example: ASUS ROG Strix G16"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold">
                    Price
                  </label>

                  <input
                    required
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(event) =>
                      handleFormChange(
                        "price",
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    Stock
                  </label>

                  <input
                    required
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(event) =>
                      handleFormChange(
                        "stock",
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold">
                    Category
                  </label>

                  <input
                    required
                    value={form.category}
                    onChange={(event) =>
                      handleFormChange(
                        "category",
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
                    placeholder="Laptops"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    Rating
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={form.rating}
                    onChange={(event) =>
                      handleFormChange(
                        "rating",
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Image Path
                </label>

                <input
                  required
                  value={form.image}
                  onChange={(event) =>
                    handleFormChange(
                      "image",
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
                  placeholder="/products/product-image.jpg"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Description
                </label>

                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    handleFormChange(
                      "description",
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
                  placeholder="Product description"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold transition hover:bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingProduct
                    ? "Update Product"
                    : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Order Details Modal */}

{selectedOrder && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Order #{selectedOrder.id}
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            Order Details
          </h2>
        </div>

        <button
          onClick={() => setSelectedOrder(null)}
          className="rounded-xl p-2 transition hover:bg-gray-100"
        >
          <X size={20} />
        </button>
      </div>

      {/* Customer */}

      <div className="mt-6 rounded-2xl bg-gray-50 p-5">
        <h3 className="font-bold">
          Customer
        </h3>

        <p className="mt-2 text-sm">
          {selectedOrder.user.name}
        </p>

        <p className="mt-1 text-sm text-gray-500">
          {selectedOrder.user.email}
        </p>
      </div>

      {/* Address */}

      {selectedOrder.address && (
        <div className="mt-4 rounded-2xl bg-gray-50 p-5">
          <h3 className="font-bold">
            Delivery Address
          </h3>

          <p className="mt-2 text-sm">
            {selectedOrder.address.firstName}{" "}
            {selectedOrder.address.lastName}
          </p>

          <p className="mt-1 text-sm text-gray-600">
            {selectedOrder.address.addressLine}
          </p>

          <p className="mt-1 text-sm text-gray-600">
            {selectedOrder.address.city},{" "}
            {selectedOrder.address.state} -{" "}
            {selectedOrder.address.pincode}
          </p>

          <p className="mt-1 text-sm text-gray-600">
            Phone: {selectedOrder.address.phone}
          </p>
        </div>
      )}

      {/* Products */}

      <div className="mt-4">
        <h3 className="font-bold">
          Ordered Products
        </h3>

        <div className="mt-3 divide-y rounded-2xl border border-gray-200">
          {selectedOrder.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4"
            >
              <img
                src={item.product.image}
                alt={item.product.name}
                className="h-16 w-16 rounded-xl bg-gray-100 object-cover"
              />

              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {item.product.name}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  ₹
                  {item.unitPrice.toLocaleString(
                    "en-IN"
                  )}{" "}
                  × {item.quantity}
                </p>
              </div>

              <p className="font-semibold">
                ₹
                {(
                  item.unitPrice * item.quantity
                ).toLocaleString("en-IN")}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Payment + Total */}

      <div className="mt-6 rounded-2xl bg-gray-50 p-5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">
            Subtotal
          </span>

          <span>
            ₹
            {selectedOrder.subtotal.toLocaleString(
              "en-IN"
            )}
          </span>
        </div>

        <div className="mt-2 flex justify-between text-sm">
          <span className="text-gray-500">
            Delivery
          </span>

          <span>
            ₹
            {selectedOrder.deliveryFee.toLocaleString(
              "en-IN"
            )}
          </span>
        </div>

        <div className="mt-4 flex justify-between border-t border-gray-200 pt-4">
          <span className="font-bold">
            Total
          </span>

          <span className="text-xl font-bold">
            ₹
            {selectedOrder.total.toLocaleString(
              "en-IN"
            )}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Payment Status
          </span>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              selectedOrder.paymentStatus === "PAID"
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {selectedOrder.paymentStatus}
          </span>
        </div>
      </div>

      {/* Status */}

      <div className="mt-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">
            Order Status
          </p>

          <p className="mt-1 font-semibold">
            {selectedOrder.status}
          </p>
        </div>

        <select
          value={selectedOrder.status}
          disabled={
            updatingOrder === selectedOrder.id
          }
          onChange={(event) =>
            handleOrderStatusChange(
              selectedOrder.id,
              event.target.value as AdminOrder["status"]
            )
          }
          className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black disabled:opacity-50"
        >
          <option value="PENDING">
            Pending
          </option>
          <option value="CONFIRMED">
            Confirmed
          </option>
          <option value="PROCESSING">
            Processing
          </option>
          <option value="SHIPPED">
            Shipped
          </option>
          <option value="DELIVERED">
            Delivered
          </option>
          <option value="CANCELLED">
            Cancelled
          </option>
        </select>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setSelectedOrder(null)}
          className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
{/* User Details Modal */}
{selectedUser && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            User #{selectedUser.id}
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            User Details
          </h2>
        </div>

        <button
          onClick={() => setSelectedUser(null)}
          className="rounded-xl p-2 transition hover:bg-gray-100"
        >
          <X size={20} />
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-2xl bg-gray-50 p-5">
          <p className="text-sm text-gray-500">
            Name
          </p>

          <p className="mt-1 font-semibold">
            {selectedUser.name}
          </p>
        </div>

        <div className="rounded-2xl bg-gray-50 p-5">
          <p className="text-sm text-gray-500">
            Email
          </p>

          <p className="mt-1 font-semibold break-all">
            {selectedUser.email}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-gray-50 p-5">
            <p className="text-sm text-gray-500">
              Role
            </p>

            <p className="mt-1 font-semibold">
              {selectedUser.role}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-5">
            <p className="text-sm text-gray-500">
              Orders
            </p>

            <p className="mt-1 font-semibold">
              {selectedUser.orderCount}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-gray-50 p-5">
          <p className="text-sm text-gray-500">
            Joined
          </p>

          <p className="mt-1 font-semibold">
            {new Date(
              selectedUser.createdAt
            ).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setSelectedUser(null)}
          className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
{/* Review Details Modal */}
{selectedReview && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Review #{selectedReview.id}
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            Review Details
          </h2>
        </div>

        <button
          onClick={() => setSelectedReview(null)}
          className="rounded-xl p-2 transition hover:bg-gray-100"
        >
          <X size={20} />
        </button>
      </div>

      {/* Customer */}
      <div className="mt-6 rounded-2xl bg-gray-50 p-5">
        <p className="text-sm text-gray-500">
          Customer
        </p>

        <p className="mt-1 font-semibold">
          {selectedReview.user.name}
        </p>

        <p className="mt-1 text-sm text-gray-500 break-all">
          {selectedReview.user.email}
        </p>

        <p className="mt-2 text-xs text-gray-400">
          User ID: {selectedReview.user.id}
        </p>
      </div>

      {/* Product */}
      <div className="mt-4 rounded-2xl bg-gray-50 p-5">
        <p className="text-sm text-gray-500">
          Product
        </p>

        <div className="mt-3 flex items-center gap-4">
          <img
            src={selectedReview.product.image}
            alt={selectedReview.product.name}
            className="h-16 w-16 rounded-xl bg-white object-cover"
          />

          <div>
            <p className="font-semibold">
              {selectedReview.product.name}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Product ID: {selectedReview.product.id}
            </p>
          </div>
        </div>
      </div>

      {/* Rating */}
      <div className="mt-4 rounded-2xl bg-gray-50 p-5">
        <p className="text-sm text-gray-500">
          Rating
        </p>

        <div className="mt-2 flex items-center gap-2">
          <Star
            size={20}
            className="fill-current"
          />

          <span className="text-xl font-bold">
            {selectedReview.rating}/5
          </span>
        </div>
      </div>

      {/* Comment */}
      <div className="mt-4 rounded-2xl bg-gray-50 p-5">
        <p className="text-sm text-gray-500">
          Comment
        </p>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
          {selectedReview.comment ||
            "No comment provided."}
        </p>
      </div>

      {/* Dates */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-gray-50 p-5">
          <p className="text-sm text-gray-500">
            Created
          </p>

          <p className="mt-1 text-sm font-semibold">
            {new Date(
              selectedReview.createdAt
            ).toLocaleString("en-IN")}
          </p>
        </div>

        <div className="rounded-2xl bg-gray-50 p-5">
          <p className="text-sm text-gray-500">
            Updated
          </p>

          <p className="mt-1 text-sm font-semibold">
            {new Date(
              selectedReview.updatedAt
            ).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => setSelectedReview(null)}
          className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold transition hover:bg-gray-100"
        >
          Close
        </button>

        <button
          onClick={() =>
            handleDeleteReview(selectedReview)
          }
          disabled={
            deletingReview === selectedReview.id
          }
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 size={17} />

          {deletingReview === selectedReview.id
            ? "Deleting..."
            : "Delete Review"}
        </button>
      </div>
    </div>
  </div>
)}
    </main>
  );
}