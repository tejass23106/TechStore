import "dotenv/config";

import { Router } from "express";

import Razorpay from "razorpay";

import prisma from "../lib/prisma.js";

import {
  requireAuth,
  type AuthenticatedRequest,
} from "../Middleware/auth.js";

const router = Router();

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * POST /api/subscription/create
 *
 * Creates a Razorpay recurring subscription for TechStore Pro.
 */
router.post(
  "/create",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;

      const razorpay = getRazorpayClient();

      if (!razorpay) {
        return res.status(500).json({
          message: "Razorpay is not configured",
        });
      }

      const planId =
        process.env.RAZORPAY_PRO_PLAN_ID;

      if (!planId) {
        return res.status(500).json({
          message:
            "Razorpay Pro plan is not configured",
        });
      }

      const user =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      /**
       * Check whether the user already has
       * an active Pro subscription.
       *
       * Expired/cancelled subscriptions do not
       * block a new subscription.
       */
      const existingSubscription =
        await prisma.subscription.findFirst({
          where: {
            userId,
            plan: "PRO",
            status: "ACTIVE",
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      if (existingSubscription) {
        return res.status(409).json({
          message:
            "You already have an active Pro subscription",
          subscriptionId:
            existingSubscription.razorpaySubscriptionId,
          plan: existingSubscription.plan,
          status: existingSubscription.status,
          endDate:
            existingSubscription.endDate,
        });
      }

      /**
       * Create a Razorpay recurring subscription.
       *
       * The actual ₹199/month amount comes from
       * the Razorpay Plan configured in
       * RAZORPAY_PRO_PLAN_ID.
       */
      const razorpaySubscription =
        await razorpay.subscriptions.create({
          plan_id: planId,
          total_count: 120,
          customer_notify: 1,
          notes: {
            techstoreUserId: String(user.id),
            plan: "PRO",
            email: user.email,
          },
        });

      return res.status(201).json({
        message:
          "Pro subscription created successfully",
        subscriptionId:
          razorpaySubscription.id,
        plan: "PRO",
        amount: 19900,
        currency: "INR",
        keyId:
          process.env.RAZORPAY_KEY_ID,
        status:
          razorpaySubscription.status,
      });
    } catch (error) {
      console.error(
        "Create Razorpay subscription error:",
        error,
      );

      return res.status(500).json({
        message:
          "Failed to create Pro subscription",
      });
    }
  },
);

/**
 * GET /api/subscription/status
 *
 * Returns the current user's TechStore subscription.
 *
 * If an ACTIVE Pro subscription has passed its
 * endDate, it is automatically persisted as EXPIRED.
 */
router.get(
  "/status",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;

      const subscription =
        await prisma.subscription.findFirst({
          where: {
            userId,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      if (!subscription) {
        return res.json({
          plan: "FREE",
          status: "ACTIVE",
          isPro: false,
        });
      }

      const now = new Date();

      let effectiveStatus =
        subscription.status;

      /**
       * Automatically expire Pro when its
       * billing period has ended.
       */
      if (
        subscription.plan === "PRO" &&
        subscription.status === "ACTIVE" &&
        subscription.endDate &&
        subscription.endDate <= now
      ) {
        effectiveStatus = "EXPIRED";

        await prisma.subscription.update({
          where: {
            id: subscription.id,
          },
          data: {
            status: "EXPIRED",
          },
        });

        console.log(
          `⏰ Pro subscription expired: ${subscription.id}`,
        );
      }

      const isPro =
        subscription.plan === "PRO" &&
        effectiveStatus === "ACTIVE" &&
        (!subscription.endDate ||
          subscription.endDate > now);

      return res.json({
        id: subscription.id,
        plan: subscription.plan,
        status: effectiveStatus,
        startDate:
          subscription.startDate,
        endDate:
          subscription.endDate,
        isPro,
      });
    } catch (error) {
      console.error(
        "Get subscription status error:",
        error,
      );

      return res.status(500).json({
        message:
          "Failed to get subscription status",
      });
    }
  },
);

export default router;

