import { Router } from "express";

import prisma from "../lib/prisma.js";

import { validate } from "../Middleware/validate.js";

import { createOrderSchema } from "../Middleware/validation.js";

import {
requireAuth,
type AuthenticatedRequest,
} from "../Middleware/auth.js";

import { sendOrderConfirmationEmail } from "../lib/email.js";

const router = Router();

/**

* POST /api/orders
* Create a pending order from the authenticated user's cart
  */
  router.post(
  "/",
  requireAuth,
  validate(createOrderSchema),
  async (req: AuthenticatedRequest, res) => {
  try {
  const userId = req.userId!;

  const {
  firstName,
  lastName,
  phone,
  address,
  city,
  state,
  pincode,
  } = req.body;

  const reservationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

const order = await prisma.$transaction(async (tx) => {
  const cart = await tx.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: { product: true },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new Error("CART_EMPTY");
  }

  let subtotal = 0;

  for (const item of cart.items) {
    if (!item.product.active) {
      throw new Error("PRODUCT_INACTIVE");
    }

    if (item.quantity < 1 || item.quantity > 99) {
      throw new Error("INVALID_CART_QUANTITY");
    }

    subtotal += item.product.price * item.quantity;
  }

  // Atomically reserve stock for every cart item.
  // If any reservation fails, the transaction rolls back.
  for (const item of cart.items) {
    const reservation = await tx.product.updateMany({
      where: {
        id: item.productId,
        active: true,
        stock: {
          gte: item.quantity,
        },
      },
      data: {
        stock: {
          decrement: item.quantity,
        },
      },
    });

    if (reservation.count !== 1) {
      const currentProduct = await tx.product.findUnique({
        where: { id: item.productId },
        select: {
          name: true,
          stock: true,
          active: true,
        },
      });

      if (!currentProduct?.active) {
        throw new Error("PRODUCT_INACTIVE");
      }

      throw new Error(
        `INSUFFICIENT_STOCK:${currentProduct.name}:${currentProduct.stock}`
      );
    }
  }

  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  const savedAddress = await tx.address.create({
    data: {
      userId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      addressLine: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
    },
  });

  return tx.order.create({
    data: {
      userId,
      addressId: savedAddress.id,
      status: "PENDING",
      paymentStatus: "PENDING",
      stockReserved: true,
      reservationExpiresAt,
      subtotal,
      deliveryFee,
      total,
      items: {
        create: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.product.price,
        })),
      },
    },
    include: {
      address: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });
});

  /**
  * Send order email after the database transaction succeeds.
  * Email failure must never roll back a successfully created order.
  */
  const user = await prisma.user.findUnique({
  where: {
  id: userId,
  },
  select: {
  email: true,
  },
  });

  if (user?.email) {
  try {
  await sendOrderConfirmationEmail({
  email: user.email,
  orderId: order.id,
  total: order.total,
  });
  } catch (emailError) {
  console.error(
  "Order confirmation email failed:",
  emailError
  );
  }
  }

  return res.status(201).json({
  message: "Order created successfully",
  order,
  });
  } catch (error) {
  if (error instanceof Error) {
  if (error.message === "CART_EMPTY") {
  return res.status(400).json({
  message: "Your cart is empty",
  });
  }

  
   if (error.message === "PRODUCT_INACTIVE") {
     return res.status(400).json({
       message:
         "One or more products in your cart are no longer available",
     });
   }

   if (error.message === "INVALID_CART_QUANTITY") {
     return res.status(400).json({
       message: "Invalid quantity in cart",
     });
   }

   if (error.message.startsWith("INSUFFICIENT_STOCK:")) {
     const [, productName, stock] = error.message.split(":");

     return res.status(400).json({
       message: `Insufficient stock for ${productName}. Only ${stock} item(s) available`,
     });
   }
  

  }

  console.error("Create order error:", error);

  return res.status(500).json({
  message: "Failed to create order",
  });
  }
  }
  );

/**

* GET /api/orders
* Get all orders belonging to the authenticated user
  */
  router.get(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
  try {
  const userId = req.userId!;

  const orders = await prisma.order.findMany({
  where: {
  userId,
  },
  orderBy: {
  createdAt: "desc",
  },
  include: {
  address: true,
  items: {
  include: {
  product: true,
  },
  },
  },
  });

  return res.json({
  orders,
  });
  } catch (error) {
  console.error("Get orders error:", error);

  return res.status(500).json({
  message: "Failed to fetch orders",
  });
  }
  }
  );

/**

* GET /api/orders/:id
* Get one order belonging to the authenticated user
  */
  router.get(
  "/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
  try {
  const userId = req.userId!;
  const orderId = Number(req.params.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
  return res.status(400).json({
  message: "Invalid order ID",
  });
  }

  const order = await prisma.order.findFirst({
  where: {
  id: orderId,
  userId,
  },
  include: {
  address: true,
  items: {
  include: {
  product: true,
  },
  },
  },
  });

  if (!order) {
  return res.status(404).json({
  message: "Order not found",
  });
  }

  return res.json({
  order,
  });
  } catch (error) {
  console.error("Get order error:", error);

  return res.status(500).json({
  message: "Failed to fetch order",
  });
  }
  }
  );

export default router;
