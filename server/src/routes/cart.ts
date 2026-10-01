import { Router } from "express";

import prisma from "../lib/prisma.js";
import { validate } from "../Middleware/validate.js";
import {
  addCartItemSchema,
  updateCartItemSchema,
} from "../Middleware/validation.js";

import {
  requireAuth,
  type AuthenticatedRequest,
} from "../Middleware/auth.js";

const router = Router();

/**
 * GET /api/cart
 * Get the authenticated user's cart
 */
router.get(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;

      const cart = await prisma.cart.findUnique({
        where: {
          userId,
        },
        include: {
          items: {
            include: {
              product: true,
            },
            orderBy: {
              id: "asc",
            },
          },
        },
      });

      if (!cart) {
        return res.json({
          items: [],
        });
      }

      return res.json(cart);
    } catch (error) {
      console.error("Get cart error:", error);

      return res.status(500).json({
        message: "Failed to fetch cart",
      });
    }
  }
);

/**
 * POST /api/cart/items
 * Add a product to the cart
 */
router.post(
  "/items",
  requireAuth,
  validate(addCartItemSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { productId, quantity = 1 } = req.body;

      if (!Number.isInteger(productId)) {
        return res.status(400).json({
          message: "Valid product ID is required",
        });
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          message: "Quantity must be at least 1",
        });
      }

      const product = await prisma.product.findUnique({
       where: {
  id: productId,
  active: true,
},
      });

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      if (product.stock < quantity) {
        return res.status(400).json({
          message: "Requested quantity exceeds available stock",
        });
      }

      const cart = await prisma.cart.upsert({
        where: {
          userId,
        },
        create: {
          userId,
        },
        update: {},
      });

      const existingItem = await prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
      });

      const newQuantity = existingItem
        ? existingItem.quantity + quantity
        : quantity;

      if (newQuantity > product.stock) {
        return res.status(400).json({
          message: `Only ${product.stock} item(s) available`,
        });
      }

      await prisma.cartItem.upsert({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
        create: {
          cartId: cart.id,
          productId,
          quantity,
        },
        update: {
          quantity: newQuantity,
        },
      });

      return res.status(201).json({
        message: "Product added to cart",
      });
    } catch (error) {
      console.error("Add to cart error:", error);

      return res.status(500).json({
        message: "Failed to add product to cart",
      });
    }
  }
);

/**
 * PATCH /api/cart/items/:productId
 * Update product quantity
 */
router.patch(
  "/items/:productId",
  requireAuth,
  validate(updateCartItemSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const productId = Number(req.params.productId);
      const { quantity } = req.body;

      if (!Number.isInteger(productId)) {
        return res.status(400).json({
          message: "Invalid product ID",
        });
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          message: "Quantity must be at least 1",
        });
      }

      const product = await prisma.product.findUnique({
        where: {
  id: productId,
  active: true,
},
      });

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      if (quantity > product.stock) {
        return res.status(400).json({
          message: `Only ${product.stock} item(s) available`,
        });
      }

      const cart = await prisma.cart.findUnique({
        where: {
          userId,
        },
      });

      if (!cart) {
        return res.status(404).json({
          message: "Cart not found",
        });
      }

      const item = await prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
      });

      if (!item) {
        return res.status(404).json({
          message: "Cart item not found",
        });
      }

      await prisma.cartItem.update({
        where: {
          id: item.id,
        },
        data: {
          quantity,
        },
      });

      return res.json({
        message: "Cart updated",
      });
    } catch (error) {
      console.error("Update cart error:", error);

      return res.status(500).json({
        message: "Failed to update cart",
      });
    }
  }
);

/**
 * DELETE /api/cart/items/:productId
 * Remove a product from the cart
 */
router.delete(
  "/items/:productId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const productId = Number(req.params.productId);

      if (!Number.isInteger(productId)) {
        return res.status(400).json({
          message: "Invalid product ID",
        });
      }

      const cart = await prisma.cart.findUnique({
        where: {
          userId,
        },
      });

      if (!cart) {
        return res.status(404).json({
          message: "Cart not found",
        });
      }

      const item = await prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
      });

      if (!item) {
        return res.status(404).json({
          message: "Cart item not found",
        });
      }

      await prisma.cartItem.delete({
        where: {
          id: item.id,
        },
      });

      return res.json({
        message: "Product removed from cart",
      });
    } catch (error) {
      console.error("Remove cart item error:", error);

      return res.status(500).json({
        message: "Failed to remove product from cart",
      });
    }
  }
);

/**
 * DELETE /api/cart
 * Clear the authenticated user's cart
 */
router.delete(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;

      const cart = await prisma.cart.findUnique({
        where: {
          userId,
        },
      });

      if (!cart) {
        return res.json({
          message: "Cart already empty",
        });
      }

      await prisma.cartItem.deleteMany({
        where: {
          cartId: cart.id,
        },
      });

      return res.json({
        message: "Cart cleared",
      });
    } catch (error) {
      console.error("Clear cart error:", error);

      return res.status(500).json({
        message: "Failed to clear cart",
      });
    }
  }
);

export default router;