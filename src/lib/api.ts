const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function getProducts() {
  const response = await fetch(`${API_URL}/products`);

  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }

  return response.json();
}

export async function getProduct(id: string) {
  const response = await fetch(`${API_URL}/products/${id}`);

  if (!response.ok) {
    throw new Error("Product not found");
  }

  return response.json();
}

export async function loginUser(
  email: string,
  password: string
) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data;
}

export async function registerUser(
  name: string,
  email: string,
  password: string
) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      name,
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Registration failed");
  }

  return data;
}

export async function getCurrentUser() {
  const response = await fetch(`${API_URL}/auth/me`, {
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function logoutUser() {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Logout failed");
  }

  return data;
}

/* =========================
   CART API
========================= */

export type ApiCartItem = {
  id: number;
  cartId: number;
  productId: number;
  quantity: number;
  product: {
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
};

export type ApiCart = {
  id?: number;
  userId?: number;
  items: ApiCartItem[];
};

export async function getCart(): Promise<ApiCart> {
  const response = await fetch(`${API_URL}/cart`, {
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch cart");
  }

  return data;
}

export async function addCartItem(
  productId: number,
  quantity = 1
) {
  const response = await fetch(`${API_URL}/cart/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      productId,
      quantity,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to add product to cart"
    );
  }

  return data;
}

export async function updateCartItem(
  productId: number,
  quantity: number
) {
  const response = await fetch(
    `${API_URL}/cart/items/${productId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        quantity,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update cart");
  }

  return data;
}

export async function removeCartItem(productId: number) {
  const response = await fetch(
    `${API_URL}/cart/items/${productId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to remove cart item"
    );
  }

  return data;
}

export async function clearCartApi() {
  const response = await fetch(`${API_URL}/cart`, {
    method: "DELETE",
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to clear cart");
  }

  return data;
}
/* =========================
   ORDERS API
========================= */

export type ApiOrderItem = {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  product: {
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
};

export type ApiOrder = {
  id: number;
  userId: number;
  addressId: number | null;
  status: string;
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
  address: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
  } | null;
  items: ApiOrderItem[];
};

export async function getOrders(): Promise<ApiOrder[]> {
  const response = await fetch(`${API_URL}/orders`, {
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to fetch orders"
    );
  }

  return data.orders;
}

export async function getOrder(
  id: string
): Promise<ApiOrder> {
  const response = await fetch(
    `${API_URL}/orders/${id}`,
    {
      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to fetch order"
    );
  }

  return data.order;
}
/* =========================
   WISHLIST API
========================= */

export type ApiWishlistItem = {
  id: number;
  userId: number;
  productId: number;
  createdAt: string;
  product: {
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
};

export type ApiWishlist = {
  items: ApiWishlistItem[];
};

export async function getWishlist(): Promise<ApiWishlist> {
  const response = await fetch(`${API_URL}/wishlist`, {
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to fetch wishlist"
    );
  }

  return data;
}

export async function addWishlistItem(
  productId: number
) {
  const response = await fetch(
    `${API_URL}/wishlist/${productId}`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to add product to wishlist"
    );
  }

  return data;
}

export async function removeWishlistItem(
  productId: number
) {
  const response = await fetch(
    `${API_URL}/wishlist/${productId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to remove product from wishlist"
    );
  }

  return data;
}
/* =========================
   REVIEWS API
========================= */

export type ApiReview = {
  id: number;
  userId: number;
  productId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    name: string;
  };
};

export type ApiReviews = {
  reviews: ApiReview[];
};

export async function getProductReviews(
  productId: number
): Promise<ApiReviews> {
  const response = await fetch(
    `${API_URL}/reviews/product/${productId}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to fetch reviews"
    );
  }

  return data;
}

export async function getMyReview(
  productId: number
): Promise<{ review: ApiReview | null }> {
  const response = await fetch(
    `${API_URL}/reviews/product/${productId}/my-review`,
    {
      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to fetch your review"
    );
  }

  return data;
}

export async function createReview(
  productId: number,
  rating: number,
  comment: string
) {
  const response = await fetch(
    `${API_URL}/reviews`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        productId,
        rating,
        comment,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to submit review"
    );
  }

  return data;
}

export async function updateReview(
  reviewId: number,
  rating: number,
  comment: string
) {
  const response = await fetch(
    `${API_URL}/reviews/${reviewId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        rating,
        comment,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to update review"
    );
  }

  return data;
}

export async function deleteReview(
  reviewId: number
) {
  const response = await fetch(
    `${API_URL}/reviews/${reviewId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to delete review"
    );
  }

  return data;
}
/* =========================
   ADMIN API
========================= */

export type AdminDashboardStatistics = {
  totalUsers: number;
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  lowStockProducts: number;
  totalSales: number;
};

export async function getAdminDashboard(): Promise<{
  statistics: AdminDashboardStatistics;
}> {
  const response = await fetch(
    `${API_URL}/admin/dashboard`,
    {
      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to fetch admin dashboard"
    );
  }

  return data;
}
export type AdminProduct = {
  id: number;
  name: string;
  price: number;
  category: string;
  rating: number;
  reviews: number;
  stock: number;
  image: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function getAdminProducts(): Promise<{
  products: AdminProduct[];
}> {
  const response = await fetch(
    `${API_URL}/admin/products`,
    {
      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to fetch admin products"
    );
  }

  return data;
}

export async function createAdminProduct(product: {
  name: string;
  price: number;
  category: string;
  rating?: number;
  stock: number;
  image: string;
  description: string;
}) {
  const response = await fetch(
    `${API_URL}/admin/products`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(product),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to create product"
    );
  }

  return data;
}

export async function updateAdminProduct(
  id: number,
  product: {
    name?: string;
    price?: number;
    category?: string;
    rating?: number;
    stock?: number;
    image?: string;
    description?: string;
  }
) {
  const response = await fetch(
    `${API_URL}/admin/products/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(product),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to update product"
    );
  }

  return data;
}

export async function updateAdminProductStock(
  id: number,
  stock: number
) {
  const response = await fetch(
    `${API_URL}/admin/products/${id}/stock`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        stock,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to update stock"
    );
  }

  return data;
}

export async function setAdminProductActive(
  id: number,
  active: boolean
) {
  const response = await fetch(
    `${API_URL}/admin/products/${id}/active`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        active,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to change product status"
    );
  }

  return data;
}
export type AdminOrderItem = {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  product: {
    id: number;
    name: string;
    image: string;
  };
};

export type AdminOrder = {
  id: number;
  userId: number;
  addressId: number | null;

  status:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED";

  paymentStatus:
    | "PENDING"
    | "PAID"
    | "FAILED"
    | "REFUNDED";

  subtotal: number;
  deliveryFee: number;
  total: number;

  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;

  createdAt: string;
  updatedAt: string;

  user: {
    id: number;
    name: string;
    email: string;
  };

  address: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
  } | null;

  items: AdminOrderItem[];
};

export async function getAdminOrders(): Promise<{
  orders: AdminOrder[];
}> {
  const response = await fetch(
    `${API_URL}/admin/orders`,
    {
      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to fetch admin orders"
    );
  }

  return data;
}

export async function updateAdminOrderStatus(
  id: number,
  status: AdminOrder["status"]
) {
  const response = await fetch(
    `${API_URL}/admin/orders/${id}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        status,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to update order status"
    );
  }

  return data;
}
export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  orderCount: number;
};

export async function getAdminUsers(): Promise<{
  users: AdminUser[];
}> {
  const response = await fetch(`${API_URL}/admin/users`, {
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to fetch admin users"
    );
  }

  return data;
}
export type AdminReview = {
  id: number;
  userId: number;
  productId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  product: {
    id: number;
    name: string;
    image: string;
  };
};

export async function getAdminReviews(): Promise<{
  reviews: AdminReview[];
}> {
  const response = await fetch(
    `${API_URL}/admin/reviews`,
    {
      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to fetch admin reviews"
    );
  }

  return data;
}

export async function deleteAdminReview(
  reviewId: number
) {
  const response = await fetch(
    `${API_URL}/admin/reviews/${reviewId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to delete review"
    );
  }

  return data;
}
