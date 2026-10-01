import { Router } from "express";

import prisma from "../lib/prisma.js";

const router = Router();

/**
 * GET /api/products
 * Get all active products
 */
router.get("/", async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        active: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    return res.json(products);
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      message: "Failed to fetch products",
    });
  }
});

/**
 * GET /api/products/:id
 * Get a single active product
 */
router.get("/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await prisma.product.findFirst({
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

    return res.json(product);
  } catch (error) {
    console.error("Get product error:", error);

    return res.status(500).json({
      message: "Failed to fetch product",
    });
  }
});

export default router;