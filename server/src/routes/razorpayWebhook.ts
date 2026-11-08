import { Router } from "express";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { processLateCaptureRefund } from "../lib/refunds.js";

import {
  sendProSubscriptionEmail,
  sendProRenewalEmail,
  sendProSubscriptionEndedEmail,
} from "../lib/email.js";

import prisma from "../lib/prisma.js";

const router = Router();

const LEASE_DURATION_MS = 60 * 1000; // 60 seconds
const HEARTBEAT_INTERVAL_MS = 20 * 1000; // 20 seconds

/**
 * Atomically marks a webhook event as processed, only if the worker still owns the lease.
 */
async function completeWebhookEvent(
  eventId: string,
  workerToken: string
): Promise<boolean> {
  const result = await prisma.razorpayWebhookEvent.updateMany({
    where: {
      id: eventId,
      lockedBy: workerToken,
      processed: false,
    },
    data: {
      processed: true,
      processedAt: new Date(),
      lockedUntil: null,
      lockedBy: null,
    },
  });

  return result.count === 1;
}

/**
 * Releases the lease if the worker still owns it, without deleting the event.
 */
async function releaseWebhookLease(
  eventId: string,
  workerToken: string
): Promise<void> {
  try {
    await prisma.razorpayWebhookEvent.updateMany({
      where: {
        id: eventId,
        lockedBy: workerToken,
        processed: false,
      },
      data: {
        lockedUntil: null,
        lockedBy: null,
      },
    });
  } catch (err) {
    console.error(`Failed to release lease for webhook ${eventId}:`, err);
  }
}

function getSubscriptionEntity(payload: unknown) {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("payload" in payload) ||
    typeof payload.payload !== "object" ||
    payload.payload === null ||
    !("subscription" in payload.payload) ||
    typeof payload.payload.subscription !== "object" ||
    payload.payload.subscription === null ||
    !("entity" in payload.payload.subscription)
  ) {
    return null;
  }

  return payload.payload.subscription.entity;
}

function getPaymentEntity(payload: unknown) {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("payload" in payload) ||
    typeof payload.payload !== "object" ||
    payload.payload === null ||
    !("payment" in payload.payload) ||
    typeof payload.payload.payment !== "object" ||
    payload.payload.payment === null ||
    !("entity" in payload.payload.payment)
  ) {
    return null;
  }

  return payload.payload.payment.entity;
}

function getRefundEntity(payload: unknown) {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("payload" in payload) ||
    typeof payload.payload !== "object" ||
    payload.payload === null ||
    !("refund" in payload.payload) ||
    typeof payload.payload.refund !== "object" ||
    payload.payload.refund === null ||
    !("entity" in payload.payload.refund)
  ) {
    return null;
  }

  return payload.payload.refund.entity;
}

function getBillingDate(value: unknown): Date | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null;
  }

  const date = new Date(value * 1000);

  return Number.isNaN(date.getTime()) ? null : date;
}

/**

* Send a Pro email without allowing an email-provider failure
* to make the Razorpay webhook fail.
  */
async function sendProEmailSafely(
  emailPromise: Promise<unknown>,
  context: string,
) {
  try {
    await emailPromise;
  } catch (error) {
    console.error(`❌ Failed to send Pro email (${context}):`, error);
  }
}

router.post("/", async (req, res) => {
  try {
    console.log("🔔 RAZORPAY WEBHOOK RECEIVED");
    console.log(
      "Event ID:",
      req.header("x-razorpay-event-id"),
    );
    console.log(
      "Signature present:",
      Boolean(req.header("x-razorpay-signature")),
    );


    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET;

    const signature =
      req.header("x-razorpay-signature");

    const eventId =
      req.header("x-razorpay-event-id");

    if (!webhookSecret) {
      console.error(
        "Razorpay webhook secret is not configured",
      );

      return res.status(500).json({
        message: "Webhook is not configured",
      });
    }

    if (!signature) {
      return res.status(400).json({
        message:
          "Missing Razorpay webhook signature",
      });
    }

    if (!eventId) {
      return res.status(400).json({
        message: "Missing Razorpay event ID",
      });
    }

    if (
      eventId.length === 0 ||
      eventId.length > 200
    ) {
      return res.status(400).json({
        message: "Invalid Razorpay event ID",
      });
    }

    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        message: "Invalid webhook body",
      });
    }

    /**
     * Razorpay signature must be calculated from
     * the original raw request body.
     */
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    if (
      expectedSignature.length !==
      signature.length ||
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "utf8"),
        Buffer.from(signature, "utf8"),
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid Razorpay webhook signature",
      });
    }

    let payload: unknown;

    try {
      payload = JSON.parse(
        req.body.toString("utf8"),
      );
    } catch {
      return res.status(400).json({
        message: "Invalid webhook JSON",
      });
    }

    const event =
      typeof payload === "object" &&
        payload !== null &&
        "event" in payload &&
        typeof payload.event === "string"
        ? payload.event
        : "";

    if (!event || event.length > 100) {
      return res.status(400).json({
        message: "Invalid webhook event",
      });
    }

    /**
     * =====================================================
     * IDEMPOTENCY & LEASE CONCURRENCY CONTROL
     * =====================================================
     */

    const workerToken = crypto.randomUUID();
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + LEASE_DURATION_MS);

    try {
      await prisma.razorpayWebhookEvent.create({
        data: {
          id: eventId,
          event,
          processed: false,
          lockedUntil: leaseExpiresAt,
          lockedBy: workerToken,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // Event already exists. Check if already processed
        const existingEvent =
          await prisma.razorpayWebhookEvent.findUnique({
            where: {
              id: eventId,
            },
          });

        if (existingEvent?.processed) {
          console.log(
            `Webhook ${eventId} already processed. Idempotent return.`,
          );

          return res.json({
            message: "Webhook event already processed",
          });
        }

        // Event exists but processed is false.
        // Try to atomically claim/renew the lease if expired or unassigned.
        const claimResult = await prisma.razorpayWebhookEvent.updateMany({
          where: {
            id: eventId,
            processed: false,
            OR: [
              { lockedUntil: null },
              { lockedUntil: { lt: now } },
            ],
          },
          data: {
            lockedUntil: leaseExpiresAt,
            lockedBy: workerToken,
          },
        });

        if (claimResult.count === 0) {
          // Another worker is actively holding the lease right now.
          console.log(
            `Webhook ${eventId} is currently locked by another worker.`,
          );

          // Return 429 so Razorpay backs off and retries rather than silently losing the event
          return res.status(429).json({
            message: "Webhook event is currently being processed by another worker. Please retry.",
          });
        }

        console.log(
          `Webhook ${eventId} lease acquired/recovered by worker ${workerToken}.`,
        );
      } else {
        throw error;
      }
    }

    // Start background lease heartbeat to extend lock for long-running handlers
    const heartbeatTimer = setInterval(async () => {
      try {
        const renewedExpiry = new Date(Date.now() + LEASE_DURATION_MS);
        await prisma.razorpayWebhookEvent.updateMany({
          where: {
            id: eventId,
            lockedBy: workerToken,
            processed: false,
          },
          data: {
            lockedUntil: renewedExpiry,
          },
        });
      } catch (hbErr) {
        console.error(`Heartbeat failed for webhook ${eventId}:`, hbErr);
      }
    }, HEARTBEAT_INTERVAL_MS);

    /**
     * =====================================================
     * SUBSCRIPTION EVENTS
     * =====================================================
     */

    if (
      event === "subscription.activated" ||
      event === "subscription.pending" ||
      event === "subscription.halted" ||
      event === "subscription.cancelled" ||
      event === "subscription.completed" ||
      event === "subscription.charged"
    ) {
      const subscriptionEntity =
        getSubscriptionEntity(payload);

      if (
        typeof subscriptionEntity !== "object" ||
        subscriptionEntity === null
      ) {
        throw new Error(
          "Missing subscription entity in webhook payload",
        );
      }

      const razorpaySubscriptionId =
        "id" in subscriptionEntity &&
          typeof subscriptionEntity.id === "string"
          ? subscriptionEntity.id
          : "";

      if (!razorpaySubscriptionId) {
        throw new Error(
          "Invalid Razorpay subscription ID",
        );
      }

      const existingSubscription =
        await prisma.subscription.findUnique({
          where: {
            razorpaySubscriptionId,
          },
        });

      /**
       * ===================================================
       * SUBSCRIPTION ACTIVATED
       * ===================================================
       */

      if (event === "subscription.activated") {
        const notes =
          "notes" in subscriptionEntity &&
            typeof subscriptionEntity.notes ===
            "object" &&
            subscriptionEntity.notes !== null
            ? subscriptionEntity.notes
            : null;

        const techstoreUserId =
          notes &&
            "techstoreUserId" in notes &&
            typeof notes.techstoreUserId === "string"
            ? Number(notes.techstoreUserId)
            : NaN;

        if (
          !Number.isInteger(techstoreUserId) ||
          techstoreUserId <= 0
        ) {
          throw new Error(
            "Invalid TechStore user ID in subscription notes",
          );
        }

        const user =
          await prisma.user.findUnique({
            where: {
              id: techstoreUserId,
            },
            select: {
              id: true,
              email: true,
              name: true,
            },
          });

        if (!user) {
          throw new Error(
            "TechStore user does not exist",
          );
        }

        const currentStart =
          "current_start" in subscriptionEntity
            ? getBillingDate(
              subscriptionEntity.current_start,
            )
            : null;

        const currentEnd =
          "current_end" in subscriptionEntity
            ? getBillingDate(
              subscriptionEntity.current_end,
            )
            : null;

        const startDate =
          currentStart ?? new Date();

        if (existingSubscription) {
          /**
           * Never silently move an existing subscription
           * to a different user.
           */
          if (
            existingSubscription.userId !==
            techstoreUserId
          ) {
            throw new Error(
              "Subscription user mismatch",
            );
          }

          await prisma.subscription.update({
            where: {
              id: existingSubscription.id,
            },
            data: {
              plan: "PRO",
              status: "ACTIVE",
              startDate,
              endDate: currentEnd,
            },
          });
        } else {
          await prisma.subscription.create({
            data: {
              userId: techstoreUserId,
              plan: "PRO",
              status: "ACTIVE",
              startDate,
              endDate: currentEnd,
              razorpaySubscriptionId,
              provider: "razorpay",
            },
          });
        }

        console.log(
          `✅ Pro subscription activated: ${razorpaySubscriptionId}`,
        );

        /**
         * Send activation email after the database
         * operation succeeds.
         *
         * Email failure does not fail the webhook.
         */
        await sendProEmailSafely(
          sendProSubscriptionEmail({
            email: user.email,
            subscriptionId:
              razorpaySubscriptionId,
            amount: 199,
          }),
          "subscription activated",
        );

        await completeWebhookEvent(eventId, workerToken);

        return res.json({
          message:
            "Subscription activated successfully",
        });
      }

      /**
       * ===================================================
       * SUBSCRIPTION PENDING
       * ===================================================
       */

      if (event === "subscription.pending") {
        await completeWebhookEvent(eventId, workerToken);

        return res.json({
          message: "Subscription pending",
        });
      }

      /**
       * ===================================================
       * SUBSCRIPTION CHARGED / RENEWAL
       * ===================================================
       */

      if (event === "subscription.charged") {
        if (!existingSubscription) {
          console.warn(
            `No local subscription found for charged subscription ${razorpaySubscriptionId}`,
          );

          await completeWebhookEvent(eventId, workerToken);

          return res.json({
            message:
              "Subscription not found locally",
          });
        }

        const currentEnd =
          "current_end" in subscriptionEntity
            ? getBillingDate(
              subscriptionEntity.current_end,
            )
            : null;

        await prisma.subscription.update({
          where: {
            id: existingSubscription.id,
          },
          data: {
            plan: "PRO",
            status: "ACTIVE",
            ...(currentEnd
              ? {
                endDate: currentEnd,
              }
              : {}),
          },
        });

        console.log(
          `🔄 Pro subscription renewed: ${razorpaySubscriptionId}`,
        );

        const user =
          await prisma.user.findUnique({
            where: {
              id: existingSubscription.userId,
            },
            select: {
              email: true,
            },
          });

        if (user) {
          await sendProEmailSafely(
            sendProRenewalEmail({
              email: user.email,
              subscriptionId:
                razorpaySubscriptionId,
              amount: 199,
            }),
            "subscription renewal",
          );
        } else {
          console.error(
            `❌ Cannot send Pro renewal email: user ${existingSubscription.userId} not found`,
          );
        }

        await completeWebhookEvent(eventId, workerToken);

        return res.json({
          message: "Subscription renewed",
        });
      }

      /**
       * ===================================================
       * SUBSCRIPTION HALTED
       * ===================================================
       */

      if (event === "subscription.halted") {
        if (existingSubscription) {
          await prisma.subscription.update({
            where: {
              id: existingSubscription.id,
            },
            data: {
              status: "EXPIRED",
              endDate: new Date(),
            },
          });

          console.warn(
            `⚠️ Pro subscription halted: ${razorpaySubscriptionId}`,
          );

          /**
           * We intentionally do not send the normal
           * "expired" email here because a halted
           * subscription represents a payment/subscription
           * problem rather than a normal expiration.
           */
        }

        await completeWebhookEvent(eventId, workerToken);

        return res.json({
          message: "Subscription halted",
        });
      }

      /**
       * ===================================================
       * SUBSCRIPTION CANCELLED
       * ===================================================
       */

      if (event === "subscription.cancelled") {
        if (existingSubscription) {
          await prisma.subscription.update({
            where: {
              id: existingSubscription.id,
            },
            data: {
              status: "CANCELLED",
              endDate: new Date(),
            },
          });

          const user =
            await prisma.user.findUnique({
              where: {
                id: existingSubscription.userId,
              },
              select: {
                email: true,
              },
            });

          if (user) {
            await sendProEmailSafely(
              sendProSubscriptionEndedEmail({
                email: user.email,
                subscriptionId:
                  razorpaySubscriptionId,
                reason: "cancelled",
              }),
              "subscription cancellation",
            );
          } else {
            console.error(
              `❌ Cannot send Pro cancellation email: user ${existingSubscription.userId} not found`,
            );
          }
        }

        console.log(
          `❌ Pro subscription cancelled: ${razorpaySubscriptionId}`,
        );

        await completeWebhookEvent(eventId, workerToken);

        return res.json({
          message: "Subscription cancelled",
        });
      }

      /**
       * ===================================================
       * SUBSCRIPTION COMPLETED
       * ===================================================
       */

      if (event === "subscription.completed") {
        if (existingSubscription) {
          await prisma.subscription.update({
            where: {
              id: existingSubscription.id,
            },
            data: {
              status: "EXPIRED",
              endDate: new Date(),
            },
          });

          const user =
            await prisma.user.findUnique({
              where: {
                id: existingSubscription.userId,
              },
              select: {
                email: true,
              },
            });

          if (user) {
            await sendProEmailSafely(
              sendProSubscriptionEndedEmail({
                email: user.email,
                subscriptionId:
                  razorpaySubscriptionId,
                reason: "expired",
              }),
              "subscription expiration",
            );
          } else {
            console.error(
              `❌ Cannot send Pro expiration email: user ${existingSubscription.userId} not found`,
            );
          }
        }

        console.log(
          `⌛ Pro subscription completed: ${razorpaySubscriptionId}`,
        );

        await completeWebhookEvent(eventId, workerToken);

        return res.json({
          message: "Subscription completed",
        });
      }
    }

    /**
     * =====================================================
     * ONE-TIME PAYMENT AND REFUND EVENTS
     * =====================================================
     */

    if (
      event !== "payment.captured" &&
      event !== "payment.failed" &&
      event !== "refund.processed" &&
      event !== "refund.failed"
    ) {
      await completeWebhookEvent(eventId, workerToken);

      return res.json({
        message: "Webhook event ignored",
      });
    }

    /**
     * =====================================================
     * PAYMENT CAPTURED / PAYMENT FAILED
     * =====================================================
     */

    if (
      event === "payment.captured" ||
      event === "payment.failed"
    ) {
      const payment =
        getPaymentEntity(payload);

      if (
        typeof payment !== "object" ||
        payment === null
      ) {
        throw new Error(
          "Missing payment entity in webhook payload",
        );
      }

      const razorpayOrderId =
        "order_id" in payment &&
          typeof payment.order_id === "string"
          ? payment.order_id
          : "";

      const razorpayPaymentId =
        "id" in payment &&
          typeof payment.id === "string"
          ? payment.id
          : "";

      const paymentAmount =
        "amount" in payment &&
          typeof payment.amount === "number"
          ? payment.amount
          : null;

      const paymentCurrency =
        "currency" in payment &&
          typeof payment.currency === "string"
          ? payment.currency
          : "";

      const paymentStatus =
        "status" in payment &&
          typeof payment.status === "string"
          ? payment.status
          : "";

      if (!razorpayPaymentId) {
        throw new Error(
          "Invalid Razorpay payment ID",
        );
      }

      if (!razorpayOrderId) {
        throw new Error(
          "Invalid Razorpay order ID",
        );
      }

      const order =
        await prisma.order.findUnique({
          where: {
            razorpayOrderId,
          },
          include: {
            items: true,
          },
        });

      if (!order) {
        await completeWebhookEvent(eventId, workerToken);

        return res.json({
          message:
            "Order not found; webhook ignored",
        });
      }

      /**
       * ===================================================
       * PAYMENT FAILED
       * ===================================================
       */

      if (event === "payment.failed") {
        console.log(
          `Payment failed for order ${order.id}. Reservation retained for retry.`
        );

        // Keep paymentStatus as PENDING.
        // The customer can retry payment while the
        // stock reservation remains valid.

        await completeWebhookEvent(eventId, workerToken);

        return res.json({
          message: "Payment failure recorded. Retry is allowed.",
        });
      }

      /**
       * ===================================================
       * PAYMENT CAPTURED
       * ===================================================
       */

      if (
        paymentStatus !== "captured" ||
        paymentAmount !== order.total * 100 ||
        paymentCurrency !== "INR"
      ) {
        throw new Error(
          `Payment validation failed for order ${order.id}`,
        );
      }

      /**
 * Confirm payment using the existing stock reservation.
 * Stock must NOT be deducted a second time.
 */
      const result = await prisma.$transaction(async (tx) => {
        const currentOrder = await tx.order.findUnique({
          where: {
            id: order.id,
          },
          include: {
            items: true,
          },
        });

        if (!currentOrder) {
          throw new Error("ORDER_NOT_FOUND");
        }

        // Another process may already have confirmed payment.
        if (
          currentOrder.status === "CONFIRMED" &&
          currentOrder.paymentStatus === "PAID"
        ) {
          if (
            currentOrder.razorpayPaymentId &&
            currentOrder.razorpayPaymentId !== razorpayPaymentId
          ) {
            return {
              status: "ALREADY_PAID_DIFFERENT_PAYMENT" as const,
            };
          }
          return {
            status: "ALREADY_CONFIRMED" as const,
          };
        }

        if (
          currentOrder.status !== "PENDING" ||
          currentOrder.paymentStatus !== "PENDING"
        ) {
          return {
            status: "RESERVATION_UNAVAILABLE" as const,
          };
        }

        // Atomically claim the active stock reservation.
        const claimed = await tx.order.updateMany({
          where: {
            id: currentOrder.id,
            status: "PENDING",
            paymentStatus: "PENDING",
            stockReserved: true,
            reservationExpiresAt: {
              gt: new Date(),
            },
          },
          data: {
            status: "CONFIRMED",
            paymentStatus: "PAID",
            stockReserved: false,
            razorpayPaymentId,
          },
        });

        if (claimed.count !== 1) {
          // Check whether another process confirmed payment.
          const latestOrder = await tx.order.findUnique({
            where: {
              id: currentOrder.id,
            },
          });

          if (
            latestOrder?.status === "CONFIRMED" &&
            latestOrder.paymentStatus === "PAID"
          ) {
            if (
              latestOrder.razorpayPaymentId &&
              latestOrder.razorpayPaymentId !== razorpayPaymentId
            ) {
              return {
                status: "ALREADY_PAID_DIFFERENT_PAYMENT" as const,
              };
            }
            return {
              status: "ALREADY_CONFIRMED" as const,
            };
          }

          return {
            status: "RESERVATION_UNAVAILABLE" as const,
          };
        }

        // Clear the customer's cart after successful confirmation.
        await tx.cartItem.deleteMany({
          where: {
            cart: {
              userId: currentOrder.userId,
            },
          },
        });

        return {
          status: "CONFIRMED" as const,
        };
      });

      if (result.status === "ALREADY_PAID_DIFFERENT_PAYMENT") {
        console.warn(
          `Order ${order.id} is already paid under a different payment ID. Initiating automatic reconciliation refund for new payment ${razorpayPaymentId}.`
        );

        if (paymentAmount === null) {
          throw new Error(`Invalid payment amount for order ${order.id}`);
        }

        const refundResult = await processLateCaptureRefund({
          orderId: order.id,
          paymentId: razorpayPaymentId,
          amountPaise: paymentAmount,
        });

        if (!refundResult.success && refundResult.status === "FAILED") {
          throw new Error(
            `Reconciliation refund failed for duplicate payment on order ${order.id}: ${refundResult.message}`
          );
        }

        await completeWebhookEvent(eventId, workerToken);

        return res.json({
          message: "Order already paid with different payment ID. Automatic refund initiated for subsequent payment.",
          refundStatus: refundResult.status,
        });
      }

      if (result.status === "RESERVATION_UNAVAILABLE") {
        console.warn(
          `Late capture detected for order ${order.id}. Stock reservation expired. Initiating automatic refund.`
        );

        if (paymentAmount === null) {
          throw new Error(`Invalid payment amount for late capture order ${order.id}`);
        }

        const refundResult = await processLateCaptureRefund({
          orderId: order.id,
          paymentId: razorpayPaymentId,
          amountPaise: paymentAmount,
        });

        if (!refundResult.success && refundResult.status === "FAILED") {
          throw new Error(
            `Late capture automatic refund failed for order ${order.id}: ${refundResult.message}`
          );
        }

        await completeWebhookEvent(eventId, workerToken);

        return res.json({
          message: "Late payment detected. Automatic refund initiated.",
          refundStatus: refundResult.status,
        });
      }

      await completeWebhookEvent(eventId, workerToken);

      return res.json({
        message:
          result.status === "CONFIRMED"
            ? "Payment captured successfully"
            : "Payment already processed",
      });
    }

    /**
     * =====================================================
     * REFUND PROCESSED
     * =====================================================
     */

    if (event === "refund.processed") {
      const refund =
        getRefundEntity(payload);

      if (
        typeof refund !== "object" ||
        refund === null
      ) {
        throw new Error(
          "Missing refund entity in webhook payload",
        );
      }

      const refundId =
        "id" in refund &&
        typeof refund.id === "string"
          ? refund.id
          : "";

      const paymentId =
        "payment_id" in refund &&
          typeof refund.payment_id === "string"
          ? refund.payment_id
          : "";

      const refundAmountPaise =
        "amount" in refund &&
          typeof refund.amount === "number"
          ? refund.amount
          : null;

      const refundStatus =
        "status" in refund &&
          typeof refund.status === "string"
          ? refund.status
          : "";

      if (!refundId) {
        throw new Error(
          "Invalid Razorpay refund ID",
        );
      }

      if (!paymentId) {
        throw new Error(
          "Invalid refund payment ID",
        );
      }

      if (
        refundAmountPaise === null ||
        !Number.isInteger(
          refundAmountPaise,
        ) ||
        refundAmountPaise <= 0
      ) {
        throw new Error(
          "Invalid refund amount",
        );
      }

      if (refundStatus !== "processed") {
        await completeWebhookEvent(eventId, workerToken);

        return res.json({
          message:
            "Refund is not processed yet",
        });
      }

      await prisma.$transaction(
        async (tx) => {
          // 1. Check if this exact Razorpay refund ID was already recorded
          const existingRefundById =
            await tx.orderRefund.findUnique({
              where: {
                razorpayRefundId: refundId,
              },
            });

          if (existingRefundById) {
            // Validate that the existing record matches the incoming webhook's paymentId
            if (existingRefundById.paymentId !== paymentId) {
              throw new Error(
                `Refund ID ${refundId} belongs to payment ${existingRefundById.paymentId}, but webhook reported payment ${paymentId}`
              );
            }

            if (existingRefundById.status === "PROCESSED") {
              console.log(
                `Refund ${refundId} already processed. Idempotent webhook delivery.`,
              );
              return;
            }
          }

          // 2. Find eligible candidate refund record for this payment
          let candidateRefund = existingRefundById;

          if (!candidateRefund) {
            // Find all pending/submitted/failed candidate records matching paymentId and exact amountPaise
            const matchingCandidates = await tx.orderRefund.findMany({
              where: {
                paymentId,
                amountPaise: refundAmountPaise,
                razorpayRefundId: null,
                status: {
                  in: ["PENDING", "SUBMITTED", "FAILED"],
                },
              },
            });

            if (matchingCandidates.length === 1) {
              candidateRefund = matchingCandidates[0];
            } else if (matchingCandidates.length > 1) {
              // Ambiguous candidates: Cannot safely pick one or create duplicate due to @@unique([orderId, paymentId, reason])
              console.warn(
                `Ambiguous refund.processed: ${matchingCandidates.length} candidate records match payment ${paymentId} and amount ${refundAmountPaise}. Rejecting to preserve accounting.`
              );
              throw new Error(
                `Ambiguous candidate refunds for payment ${paymentId} and amount ${refundAmountPaise}. Manual reconciliation required.`
              );
            }
          }

          // 3. Find the associated order
          const order = candidateRefund
            ? await tx.order.findUnique({
                where: {
                  id: candidateRefund.orderId,
                },
              })
            : await tx.order.findFirst({
                where: {
                  OR: [
                    {
                      razorpayPaymentId: paymentId,
                    },
                    {
                      refunds: {
                        some: {
                          paymentId,
                        },
                      },
                    },
                  ],
                },
              });

          if (!order) {
            console.warn(
              `Order not found for refund ${refundId}, payment ${paymentId}`,
            );
            return;
          }

          // 4. Update candidate or create new OrderRefund record
          if (candidateRefund) {
            await tx.orderRefund.update({
              where: {
                id: candidateRefund.id,
              },
              data: {
                status: "PROCESSED",
                razorpayRefundId: refundId,
                amountPaise: refundAmountPaise,
                processedAt: new Date(),
                errorMessage: null,
              },
            });
          } else {
            // Check if a record already exists with (orderId, paymentId, reason: "LATE_CAPTURE")
            const existingForUniqueConstraint = await tx.orderRefund.findUnique({
              where: {
                orderId_paymentId_reason: {
                  orderId: order.id,
                  paymentId,
                  reason: "LATE_CAPTURE",
                },
              },
            });

            if (existingForUniqueConstraint) {
              if (existingForUniqueConstraint.razorpayRefundId && existingForUniqueConstraint.razorpayRefundId !== refundId) {
                throw new Error(
                  `Conflict: OrderRefund for order ${order.id} and payment ${paymentId} already bound to refund ${existingForUniqueConstraint.razorpayRefundId}`
                );
              }
              await tx.orderRefund.update({
                where: { id: existingForUniqueConstraint.id },
                data: {
                  status: "PROCESSED",
                  razorpayRefundId: refundId,
                  amountPaise: refundAmountPaise,
                  processedAt: new Date(),
                  errorMessage: null,
                },
              });
            } else {
              await tx.orderRefund.create({
                data: {
                  orderId: order.id,
                  paymentId,
                  razorpayRefundId: refundId,
                  idempotencyKey: `webhook_refund_${refundId}`,
                  amountPaise: refundAmountPaise,
                  reason: "LATE_CAPTURE",
                  status: "PROCESSED",
                  processedAt: new Date(),
                },
              });
            }
          }

          // 5. Calculate and apply refund to order
          const refundAmountRupees =
            new Prisma.Decimal(
              refundAmountPaise,
            ).div(100);

          const currentRefundedAmount =
            new Prisma.Decimal(
              order.refundedAmount,
            );

          const orderTotal =
            new Prisma.Decimal(order.total);

          const newRefundedAmount =
            currentRefundedAmount.plus(
              refundAmountRupees,
            );

          if (
            newRefundedAmount.gt(orderTotal)
          ) {
            throw new Error(
              `Refund amount exceeds order total for order ${order.id}. Current: ${currentRefundedAmount}, new: ${newRefundedAmount}, total: ${orderTotal}`,
            );
          }

          const isFullRefund =
            newRefundedAmount.equals(orderTotal);

          await tx.order.update({
            where: {
              id: order.id,
            },
            data: {
              refundedAmount:
                newRefundedAmount,
              ...(isFullRefund
                ? {
                    paymentStatus:
                      "REFUNDED",
                  }
                : {}),
            },
          });
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel
              .Serializable,
        },
      );

      await completeWebhookEvent(eventId, workerToken);

      return res.json({
        message:
          "Refund processed successfully",
      });
    }

    /**
     * =====================================================
     * REFUND FAILED
     * =====================================================
     */

    if (event === "refund.failed") {
      const refund =
        getRefundEntity(payload);

      if (
        typeof refund !== "object" ||
        refund === null
      ) {
        throw new Error(
          "Missing refund entity in webhook payload",
        );
      }

      const refundId =
        "id" in refund &&
        typeof refund.id === "string"
          ? refund.id
          : "";

      const paymentId =
        "payment_id" in refund &&
          typeof refund.payment_id === "string"
          ? refund.payment_id
          : "";

      const refundAmountPaise =
        "amount" in refund &&
          typeof refund.amount === "number"
          ? refund.amount
          : null;

      if (!refundId && !paymentId) {
        throw new Error(
          "Invalid refund or payment ID in refund.failed event",
        );
      }

      await prisma.$transaction(async (tx) => {
        if (refundId) {
          // If a refund ID is supplied, search strictly for that refund ID
          const existingRefund = await tx.orderRefund.findUnique({
            where: {
              razorpayRefundId: refundId,
            },
          });

          if (!existingRefund) {
            console.warn(
              `refund.failed received for unknown refund ID: ${refundId}. No unrelated record will be modified.`
            );
            return;
          }

          // Verify payment ID consistency if both are present
          if (paymentId && existingRefund.paymentId !== paymentId) {
            console.warn(
              `Payment ID mismatch on refund.failed: record has ${existingRefund.paymentId}, webhook reported ${paymentId}`
            );
            return;
          }

          await tx.orderRefund.update({
            where: { id: existingRefund.id },
            data: {
              status: "FAILED",
              errorMessage: "Refund failed according to Razorpay webhook notification",
            },
          });
        } else {
          // Matching without refundId: require unambiguous candidate matching paymentId and amountPaise
          const candidates = await tx.orderRefund.findMany({
            where: {
              paymentId,
              status: {
                in: ["PENDING", "SUBMITTED"],
              },
              ...(refundAmountPaise ? { amountPaise: refundAmountPaise } : {}),
            },
          });

          if (candidates.length === 1) {
            await tx.orderRefund.update({
              where: { id: candidates[0].id },
              data: {
                status: "FAILED",
                errorMessage: "Refund failed according to Razorpay webhook notification",
              },
            });
          } else {
            console.warn(
              `Cannot unambiguously match refund.failed without refund ID: found ${candidates.length} candidates for payment ${paymentId}.`
            );
          }
        }
      });

      await completeWebhookEvent(eventId, workerToken);

      return res.json({
        message: "Refund failure recorded successfully",
      });
    }

    await completeWebhookEvent(eventId, workerToken);

    return res.json({
      message: "Webhook processed successfully",
    });


  } catch (error) {
    console.error(
      "Razorpay webhook error:",
      error,
    );

    const eventId = req.header("x-razorpay-event-id");

    if (eventId) {
      try {
        await prisma.razorpayWebhookEvent.deleteMany({
          where: {
            id: eventId,
            processed: false,
          },
        });
      } catch (cleanupError) {
        console.error("Failed to release webhook claim:", cleanupError);
      }
    }

    /**
     * IMPORTANT:
     *
     * We deliberately do NOT mark the webhook as
     * processed here.
     *
     * Razorpay can retry the webhook, allowing a
     * failed operation to be processed again.
     */

    return res.status(500).json({
      message: "Webhook processing failed",
    });


  }
});

export default router;
