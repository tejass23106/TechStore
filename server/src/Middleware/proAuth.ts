import type { NextFunction, Request, Response } from "express";
import prisma from "../lib/prisma.js";

export async function requirePro(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const sessionId = req.cookies?.techstore_session;

    if (!sessionId) {
      return res.status(401).json({
        message: "Login required",
      });
    }

    const session = await prisma.session.findUnique({
      where: {
        id: sessionId,
      },
        select: {
        userId: true,
        expiresAt: true,
      },
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({
        message: "Your session has expired. Please log in again.",
      });
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.userId,
        plan: "PRO",
        status: "ACTIVE",
        OR: [
          {
            endDate: null,
          },
          {
            endDate: {
              gt: new Date(),
            },
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!subscription) {
      return res.status(403).json({
        message:
          "TechStore Pro is required to use this premium feature.",
        requiresPro: true,
      });
    }

    next();
  } catch (error) {
    console.error("Pro authorization error:", error);

    return res.status(500).json({
      message: "Unable to verify TechStore Pro access",
    });
  }
}

