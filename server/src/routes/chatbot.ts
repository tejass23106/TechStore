import { Router } from "express";

import prisma from "../lib/prisma.js";
import { chatbotRateLimiter } from "../Middleware/rateLimit.js";
import { generateChatbotResponse } from "../lib/chatbot.js";

const router = Router();

router.post("/", chatbotRateLimiter, async (req, res) => {
  try {
    const { message } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "Message is required",
      });
    }

    let userId: number | undefined;

    const sessionId = req.cookies?.techstore_session;

    if (sessionId) {
      const session = await prisma.session.findUnique({
        where: {
          id: sessionId,
        },
        select: {
          userId: true,
          expiresAt: true,
        },
      });

      if (session && session.expiresAt >= new Date()) {
        userId = session.userId;
      }
    }

    const reply = await generateChatbotResponse(
      message.trim(),
      userId
    );

    return res.json({
      reply,
    });
  }   catch (error) {
    console.error("Chatbot error:", error);

    const errorText = [
      error instanceof Error ? error.message : "",
      String(error),
    ]
      .join(" ")
      .toLowerCase();

    const isQuotaError =
      errorText.includes("429") ||
      errorText.includes("resource_exhausted") ||
      errorText.includes("quota exceeded") ||
      errorText.includes("generate_content_free_tier_requests");

    if (isQuotaError) {
      return res.status(429).json({
        message:
          "TechStore AI is temporarily unavailable.\n\n" +
          "Why: The Gemini free-tier daily AI request quota has been reached.\n\n" +
          "When available: The daily quota resets at midnight Pacific Time. " +
          "In India, that is around 12:30 PM IST while Pacific Time is observing daylight saving time.\n\n" +
          "Please try the chatbot again after the quota resets.",
      });
    }

    return res.status(500).json({
      message: "Unable to process chatbot request",
    });
  }
});

export default router;
