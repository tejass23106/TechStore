import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requirePro } from "../Middleware/proAuth.js";
import { GoogleGenAI } from "@google/genai";

const router = Router();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined");
}

const ai = new GoogleGenAI({
  apiKey,
});

router.post("/recommendations", requirePro, async (req, res) => {
  try {
    const { query, budget } = req.body;

    if (typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        message: "Query is required",
      });
    }

    const parsedBudget =
      budget === undefined || budget === null
        ? undefined
        : Number(budget);

    if (
      parsedBudget !== undefined &&
      (!Number.isFinite(parsedBudget) || parsedBudget <= 0)
    ) {
      return res.status(400).json({
        message: "Budget must be a valid positive number",
      });
    }

    const products = await prisma.product.findMany({
      where: {
        active: true,
        ...(parsedBudget !== undefined
          ? {
              price: {
                lte: parsedBudget,
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        price: true,
        stock: true,
        rating: true,
        reviewCount: true,
      },
      orderBy: [
        {
          rating: "desc",
        },
        {
          reviewCount: "desc",
        },
      ],
      take: 20,
    });

    if (products.length === 0) {
      return res.json({
        recommendations:
          "I couldn't find any active TechStore products matching your requirements.",
        products: [],
      });
    }

    const productCatalog = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: Number(product.price),
      stock: product.stock,
      rating: product.rating,
      reviewCount: product.reviewCount,
    }));

    const prompt =
      "You are TechStore Pro AI, an advanced shopping recommendation assistant.\n\n" +
      "The following products are the ONLY products you may recommend:\n\n" +
      JSON.stringify(productCatalog, null, 2) +
      "\n\nUser requirement:\n" +
      query.trim() +
      (parsedBudget !== undefined
        ? `\n\nMaximum budget: ₹${parsedBudget}`
        : "") +
      "\n\nInstructions:\n" +
      "- Recommend only products present in the supplied catalog.\n" +
      "- Never invent specifications, prices, ratings, stock, features, or products.\n" +
      "- Consider the user's stated requirements and budget.\n" +
      "- Explain briefly why each recommended product fits.\n" +
      "- Mention important trade-offs when relevant.\n" +
      "- Use Indian rupee notation (₹).\n" +
      "- Keep the response concise and easy to scan.\n" +
      "- Use clean Markdown.\n" +
      "- Do not output JSON.";

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        temperature: 0.3,
      },
    });

    return res.json({
      recommendations:
        response.text ??
        "I found suitable products but could not generate the recommendation.",
      products: productCatalog,
    });
  } catch (error) {
    console.error("Pro recommendation error:", error);

    const errorText = [
      error instanceof Error ? error.message : "",
      String(error),
    ]
      .join(" ")
      .toLowerCase();

    if (
      errorText.includes("429") ||
      errorText.includes("resource_exhausted") ||
      errorText.includes("quota exceeded") ||
      errorText.includes("generate_content_free_tier_requests")
    ) {
      return res.status(429).json({
        message:
          "TechStore Pro AI is temporarily unavailable because the Gemini AI quota has been reached.",
      });
    }

    return res.status(500).json({
      message: "Unable to generate Pro recommendations",
    });
  }
});

export default router;

