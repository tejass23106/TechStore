import { Router } from "express";

import prisma from "../lib/prisma.js";

import {
  requireAuth,
  type AuthenticatedRequest,
} from "../Middleware/auth.js";

const router = Router();

/**
 * GET /api/wishlist
 * Get the authenticated user's wishlist
 */
router.get(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;

      const wishlistItems = await prisma.wishlistItem.findMany({
        where: {
          userId,
        },
        include: {
          product: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json({
        items: wishlistItems,
      });
    } catch (error) {
      console.error("Get wishlist error:", error);

      return res.status(500).json({
        message: "Failed to fetch wishlist",
      });
    }
  }
);

/**
 * POST /api/wishlist/:productId
 * Add a product to the authenticated user's wishlist
 */
router.post(
  "/:productId",
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

      const product = await prisma.product.findUnique({
        where: {
          id: productId,
        },
      });

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      const existingItem = await prisma.wishlistItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });

      if (existingItem) {
        return res.status(409).json({
          message: "Product is already in your wishlist",
        });
      }

      await prisma.wishlistItem.create({
        data: {
          userId,
          productId,
        },
      });

      return res.status(201).json({
        message: "Product added to wishlist",
      });
    } catch (error) {
      console.error("Add to wishlist error:", error);

      return res.status(500).json({
        message: "Failed to add product to wishlist",
      });
    }
  }
);

/**
 * DELETE /api/wishlist/:productId
 * Remove a product from the authenticated user's wishlist
 */
router.delete(
  "/:productId",
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

      const item = await prisma.wishlistItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });

      if (!item) {
        return res.status(404).json({
          message: "Product is not in your wishlist",
        });
      }

      await prisma.wishlistItem.delete({
        where: {
          id: item.id,
        },
      });

      return res.json({
        message: "Product removed from wishlist",
      });
    } catch (error) {
      console.error("Remove from wishlist error:", error);

      return res.status(500).json({
        message: "Failed to remove product from wishlist",
      });
    }
  }
);

export default router;