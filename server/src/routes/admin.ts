import { Router } from "express";
import { Prisma } from "@prisma/client";

import prisma from "../lib/prisma.js";

import {
requireAdmin,
requireAuth,
} from "../Middleware/auth.js";

import { validate } from "../Middleware/validate.js";

import {
adminCreateProductSchema,
adminUpdateProductSchema,
adminStockSchema,
adminActiveSchema,
adminOrderStatusSchema,
} from "../Middleware/validation.js";

const router = Router();

function parsePositiveInteger(value: string | string[]) {
const rawValue = String(value);
const number = Number(rawValue);

return Number.isInteger(number) && number > 0
? number
: null;
}

async function runAdminReviewTransaction<T>(
callback: (
tx: Prisma.TransactionClient
) => Promise<T>
) {
const maxAttempts = 3;

for (
let attempt = 1;
attempt <= maxAttempts;
attempt++
) {
try {
return await prisma.$transaction(
callback,
{
isolationLevel:
Prisma.TransactionIsolationLevel.Serializable,
}
);
} catch (error) {
if (
error instanceof
Prisma.PrismaClientKnownRequestError &&
error.code === "P2034" &&
attempt < maxAttempts
) {
continue;
}


  throw error;
}


}

throw new Error(
"Admin review transaction failed after retries"
);
}

/**

* GET /api/admin/dashboard
*
* Admin dashboard statistics.
  */
  router.get(
  "/dashboard",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
  try {
  const [
  totalUsers,
  totalProducts,
  activeProducts,
  totalOrders,
  paidOrders,
  pendingOrders,
  lowStockProducts,
  sales,
  ] = await Promise.all([
  prisma.user.count(),

  
   prisma.product.count(),

   prisma.product.count({
     where: {
       active: true,
     },
   }),

   prisma.order.count(),

   prisma.order.count({
     where: {
       paymentStatus: "PAID",
     },
   }),

   prisma.order.count({
     where: {
       status: "PENDING",
     },
   }),

   prisma.product.count({
     where: {
       active: true,
       stock: {
         lte: 5,
       },
     },
   }),

   prisma.order.aggregate({
     where: {
       paymentStatus: "PAID",
     },
     _sum: {
       total: true,
     },
   }),
  

  ]);

  return res.json({
  statistics: {
  totalUsers,
  totalProducts,
  activeProducts,
  totalOrders,
  paidOrders,
  pendingOrders,
  lowStockProducts,
  totalSales: sales._sum.total ?? 0,
  },
  });
  } catch (error) {
  console.error(
  "Admin dashboard error:",
  error
  );

  return res.status(500).json({
  message:
  "Failed to load admin dashboard",
  });
  }
  }
  );

/**

* GET /api/admin/products
*
* Get all products including archived products.
  */
  router.get(
  "/products",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
  try {
  const products =
  await prisma.product.findMany({
  orderBy: {
  id: "asc",
  },
  });

  return res.json({
  products,
  });
  } catch (error) {
  console.error(
  "Admin get products error:",
  error
  );

  return res.status(500).json({
  message: "Failed to fetch products",
  });
  }
  }
  );

/**

* POST /api/admin/products
*
* Create a new product.
  */
  router.post(
  "/products",
  requireAuth,
  requireAdmin,
  validate(adminCreateProductSchema),
  async (req, res) => {
  try {
  const {
  name,
  price,
  category,
  rating,
  stock,
  image,
  description,
  } = req.body;

  const product =
  await prisma.product.create({
  data: {
  name,
  price,
  category,
  rating: rating ?? 0,
  stock,
  image,
  description,
  active: true,
  },
  });

  return res.status(201).json({
  message:
  "Product created successfully",
  product,
  });
  } catch (error) {
  console.error(
  "Admin create product error:",
  error
  );

  return res.status(500).json({
  message: "Failed to create product",
  });
  }
  }
  );

/**

* PUT /api/admin/products/:id
*
* Update a product.
  */
  router.put(
  "/products/:id",
  requireAuth,
  requireAdmin,
  validate(adminUpdateProductSchema),
  async (req, res) => {
  try {
  const productId =
  parsePositiveInteger(req.params.id);

  if (productId === null) {
  return res.status(400).json({
  message: "Invalid product ID",
  });
  }

  const existingProduct =
  await prisma.product.findUnique({
  where: {
  id: productId,
  },
  select: {
  id: true,
  },
  });

  if (!existingProduct) {
  return res.status(404).json({
  message: "Product not found",
  });
  }

  const {
  name,
  price,
  category,
  rating,
  stock,
  image,
  description,
  } = req.body;

  const product =
  await prisma.product.update({
  where: {
  id: productId,
  },
  data: {
  ...(name !== undefined && {
  name,
  }),

  
       ...(price !== undefined && {
         price,
       }),

       ...(category !== undefined && {
         category,
       }),

       ...(rating !== undefined && {
         rating,
       }),

       ...(stock !== undefined && {
         stock,
       }),

       ...(image !== undefined && {
         image,
       }),

       ...(description !== undefined && {
         description,
       }),
     },
   });
  

  return res.json({
  message:
  "Product updated successfully",
  product,
  });
  } catch (error) {
  console.error(
  "Admin update product error:",
  error
  );

  return res.status(500).json({
  message:
  "Failed to update product",
  });
  }
  }
  );

/**

* PATCH /api/admin/products/:id/stock
*
* Update product stock.
  */
  router.patch(
  "/products/:id/stock",
  requireAuth,
  requireAdmin,
  validate(adminStockSchema),
  async (req, res) => {
  try {
  const productId =
  parsePositiveInteger(req.params.id);

  if (productId === null) {
  return res.status(400).json({
  message: "Invalid product ID",
  });
  }

  const stock = req.body.stock;

  const existingProduct =
  await prisma.product.findUnique({
  where: {
  id: productId,
  },
  select: {
  id: true,
  },
  });

  if (!existingProduct) {
  return res.status(404).json({
  message: "Product not found",
  });
  }

  const product =
  await prisma.product.update({
  where: {
  id: productId,
  },
  data: {
  stock,
  },
  });

  return res.json({
  message:
  "Stock updated successfully",
  product,
  });
  } catch (error) {
  console.error(
  "Admin update stock error:",
  error
  );

  return res.status(500).json({
  message: "Failed to update stock",
  });
  }
  }
  );

/**

* PATCH /api/admin/products/:id/active
*
* Archive or restore a product.
  */
  router.patch(
  "/products/:id/active",
  requireAuth,
  requireAdmin,
  validate(adminActiveSchema),
  async (req, res) => {
  try {
  const productId =
  parsePositiveInteger(req.params.id);

  if (productId === null) {
  return res.status(400).json({
  message: "Invalid product ID",
  });
  }

  const active = req.body.active;

  const existingProduct =
  await prisma.product.findUnique({
  where: {
  id: productId,
  },
  select: {
  id: true,
  },
  });

  if (!existingProduct) {
  return res.status(404).json({
  message: "Product not found",
  });
  }

  const product =
  await prisma.product.update({
  where: {
  id: productId,
  },
  data: {
  active,
  },
  });

  return res.json({
  message: active
  ? "Product restored successfully"
  : "Product archived successfully",
  product,
  });
  } catch (error) {
  console.error(
  "Admin archive product error:",
  error
  );

  return res.status(500).json({
  message:
  "Failed to change product status",
  });
  }
  }
  );

/**

* GET /api/admin/orders
*
* Get all customer orders.
  */
  router.get(
  "/orders",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
  try {
  const orders =
  await prisma.order.findMany({
  orderBy: {
  createdAt: "desc",
  },
  include: {
  user: {
  select: {
  id: true,
  name: true,
  email: true,
  },
  },
  address: true,
  items: {
  include: {
  product: {
  select: {
  id: true,
  name: true,
  image: true,
  },
  },
  },
  },
  },
  });

  return res.json({
  orders,
  });
  } catch (error) {
  console.error(
  "Admin get orders error:",
  error
  );

  return res.status(500).json({
  message: "Failed to fetch orders",
  });
  }
  }
  );

/**

* PATCH /api/admin/orders/:id/status
*
* Update order fulfillment status.
  */
  router.patch(
  "/orders/:id/status",
  requireAuth,
  requireAdmin,
  validate(adminOrderStatusSchema),
  async (req, res) => {
  try {
  const orderId =
  parsePositiveInteger(req.params.id);

  if (orderId === null) {
  return res.status(400).json({
  message: "Invalid order ID",
  });
  }

  const status = req.body.status;

  const existingOrder =
  await prisma.order.findUnique({
  where: {
  id: orderId,
  },
  select: {
  id: true,
  status: true,
  paymentStatus: true,
  },
  });

  if (!existingOrder) {
  return res.status(404).json({
  message: "Order not found",
  });
  }

  /*
  * Payment state is controlled by the
  * Razorpay payment/webhook flow.
  *
  * Admin may only change fulfillment status.
  */

  if (
  status === "DELIVERED" &&
  existingOrder.paymentStatus !== "PAID"
  ) {
  return res.status(400).json({
  message:
  "An order cannot be marked delivered before payment is confirmed",
  });
  }

  if (
  status === "CONFIRMED" &&
  existingOrder.paymentStatus !== "PAID"
  ) {
  return res.status(400).json({
  message:
  "An order cannot be confirmed before payment is confirmed",
  });
  }

  if (
  existingOrder.status === "DELIVERED" &&
  status !== "DELIVERED"
  ) {
  return res.status(400).json({
  message:
  "A delivered order cannot be moved back to an earlier status",
  });
  }

  if (
  existingOrder.status === "CANCELLED" &&
  status !== "CANCELLED"
  ) {
  return res.status(400).json({
  message:
  "A cancelled order cannot be reopened",
  });
  }

  const order =
  await prisma.order.update({
  where: {
  id: orderId,
  },
  data: {
  status,
  },
  });

  return res.json({
  message:
  "Order status updated successfully",
  order,
  });
  } catch (error) {
  console.error(
  "Admin update order status error:",
  error
  );

  return res.status(500).json({
  message:
  "Failed to update order status",
  });
  }
  }
  );

/**

* GET /api/admin/users
*
* Get all registered users.
  */
  router.get(
  "/users",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
  try {
  const users =
  await prisma.user.findMany({
  orderBy: {
  createdAt: "desc",
  },
  select: {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  _count: {
  select: {
  orders: true,
  },
  },
  },
  });

  return res.json({
  users: users.map((user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  orderCount: user._count.orders,
  })),
  });
  } catch (error) {
  console.error(
  "Admin get users error:",
  error
  );

  return res.status(500).json({
  message: "Failed to fetch users",
  });
  }
  }
  );

/**

* GET /api/admin/reviews
*
* Get all reviews for admin management.
  */
  router.get(
  "/reviews",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
  try {
  const reviews =
  await prisma.review.findMany({
  orderBy: {
  createdAt: "desc",
  },
  include: {
  user: {
  select: {
  id: true,
  name: true,
  email: true,
  },
  },
  product: {
  select: {
  id: true,
  name: true,
  image: true,
  },
  },
  },
  });

  return res.json({
  reviews,
  });
  } catch (error) {
  console.error(
  "Admin get reviews error:",
  error
  );

  return res.status(500).json({
  message: "Failed to fetch reviews",
  });
  }
  }
  );

/**

* DELETE /api/admin/reviews/:id
*
* Delete any review as an admin.
  */
  router.delete(
  "/reviews/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
  try {
  const reviewId =
  parsePositiveInteger(req.params.id);

  if (reviewId === null) {
  return res.status(400).json({
  message: "Invalid review ID",
  });
  }

  await runAdminReviewTransaction(
  async (tx) => {
  const existingReview =
  await tx.review.findUnique({
  where: {
  id: reviewId,
  },
  select: {
  id: true,
  productId: true,
  },
  });

  
     if (!existingReview) {
       throw new Error(
         "REVIEW_NOT_FOUND"
       );
     }

     await tx.review.delete({
       where: {
         id: reviewId,
       },
     });

     const aggregate =
       await tx.review.aggregate({
         where: {
           productId:
             existingReview.productId,
         },
         _avg: {
           rating: true,
         },
         _count: {
           id: true,
         },
       });

     await tx.product.update({
       where: {
         id: existingReview.productId,
       },
       data: {
         rating:
           aggregate._avg.rating ?? 0,
         reviews:
           aggregate._count.id,
       },
     });
   }
  

  );

  return res.json({
  message:
  "Review deleted successfully",
  });
  } catch (error) {
  if (
  error instanceof Error &&
  error.message ===
  "REVIEW_NOT_FOUND"
  ) {
  return res.status(404).json({
  message: "Review not found",
  });
  }

  console.error(
  "Admin delete review error:",
  error
  );

  return res.status(500).json({
  message:
  "Failed to delete review",
  });
  }
  }
  );

export default router;
