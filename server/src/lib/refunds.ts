import { Prisma } from "@prisma/client";
import prisma from "./prisma.js";

export type LateCaptureRefundResult = {
  success: boolean;
  refundId?: string;
  status: "PENDING" | "SUBMITTED" | "PROCESSED" | "FAILED";
  message: string;
};

/**
 * Initiates or reconciles an automatic refund for a late-captured payment
 * where stock reservation expired or became unavailable.
 *
 * Implements strict idempotency using OrderRefund and the X-Refund-Idempotency header
 * (Razorpay Refunds API requirement).
 */
export async function processLateCaptureRefund(params: {
  orderId: number;
  paymentId: string;
  amountPaise: number;
}): Promise<LateCaptureRefundResult> {
  const { orderId, paymentId, amountPaise } = params;

  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new Error(`Invalid refund amountPaise: ${amountPaise}`);
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured");
  }

  // Razorpay X-Refund-Idempotency must be at least 10 chars, alphabets, numbers, hyphens, underscores.
  const idempotencyKey = `refund_${orderId}_${paymentId}_LATE_CAPTURE`;

  // Step 1: Persist or retrieve the refund operation in database before external API request.
  let refundRecord = await prisma.orderRefund.findUnique({
    where: {
      orderId_paymentId_reason: {
        orderId,
        paymentId,
        reason: "LATE_CAPTURE",
      },
    },
  });

  if (!refundRecord) {
    try {
      refundRecord = await prisma.orderRefund.create({
        data: {
          orderId,
          paymentId,
          reason: "LATE_CAPTURE",
          amountPaise,
          idempotencyKey,
          status: "PENDING",
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        refundRecord = await prisma.orderRefund.findUniqueOrThrow({
          where: {
            orderId_paymentId_reason: {
              orderId,
              paymentId,
              reason: "LATE_CAPTURE",
            },
          },
        });
      } else {
        throw error;
      }
    }
  }

  // If already processed, return immediately.
  if (refundRecord.status === "PROCESSED") {
    return {
      success: true,
      refundId: refundRecord.razorpayRefundId ?? undefined,
      status: "PROCESSED",
      message: "Refund already processed",
    };
  }

  // If previously marked FAILED, reset to PENDING so retry can proceed with the same idempotency key
  if (refundRecord.status === "FAILED") {
    refundRecord = await prisma.orderRefund.update({
      where: { id: refundRecord.id },
      data: {
        status: "PENDING",
        errorMessage: null,
      },
    });
  }

  // Step 2: Call Razorpay Refund API with safe authenticated HTTP request and idempotency header.
  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

  try {
    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          "X-Refund-Idempotency": refundRecord.idempotencyKey,
        },
        body: JSON.stringify({
          amount: refundRecord.amountPaise,
          notes: {
            orderId: String(orderId),
            reason: "LATE_CAPTURE",
          },
        }),
      }
    );

    // Handle 409 Conflict: Razorpay is currently processing this idempotency key in-flight
    if (response.status === 409) {
      const msg = "Refund request is currently being processed by Razorpay (in-flight conflict)";
      await prisma.orderRefund.update({
        where: { id: refundRecord.id },
        data: {
          status: "SUBMITTED",
          errorMessage: msg,
        },
      });

      return {
        success: false,
        status: "SUBMITTED",
        message: msg,
      };
    }

    const responseData = (await response.json()) as {
      id?: string;
      status?: string;
      error?: {
        description?: string;
        code?: string;
      };
    };

    if (!response.ok) {
      const errorMsg =
        responseData.error?.description ||
        `Razorpay refund API error (${response.status})`;

      await prisma.orderRefund.update({
        where: { id: refundRecord.id },
        data: {
          status: "FAILED",
          errorMessage: errorMsg,
        },
      });

      return {
        success: false,
        status: "FAILED",
        message: errorMsg,
      };
    }

    const razorpayRefundId = responseData.id ?? null;
    const isProcessed = responseData.status === "processed";
    const nextStatus = isProcessed ? "PROCESSED" : "SUBMITTED";

    await prisma.$transaction(
      async (tx) => {
        await tx.orderRefund.update({
          where: { id: refundRecord.id },
          data: {
            status: nextStatus,
            razorpayRefundId,
            errorMessage: null,
            ...(isProcessed ? { processedAt: new Date() } : {}),
          },
        });

        if (isProcessed) {
          const order = await tx.order.findUnique({
            where: { id: orderId },
          });

          if (order) {
            const refundRupees = new Prisma.Decimal(refundRecord.amountPaise).div(100);
            const currentRefunded = new Prisma.Decimal(order.refundedAmount);
            const orderTotal = new Prisma.Decimal(order.total);
            const newRefunded = currentRefunded.plus(refundRupees);

            if (newRefunded.gt(orderTotal)) {
              throw new Error(
                `Refund amount exceeds order total for order ${order.id}. Current: ${currentRefunded}, refund: ${refundRupees}, total: ${orderTotal}`
              );
            }

            await tx.order.update({
              where: { id: orderId },
              data: {
                refundedAmount: newRefunded,
                ...(newRefunded.equals(orderTotal)
                  ? { paymentStatus: "REFUNDED" }
                  : {}),
              },
            });
          }
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return {
      success: true,
      refundId: razorpayRefundId ?? undefined,
      status: nextStatus,
      message: isProcessed
        ? "Refund processed successfully"
        : "Refund submitted to Razorpay",
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Error communicating with Razorpay refund API:", err);

    // Keep status as PENDING or SUBMITTED so it can be retried with the exact same idempotencyKey
    await prisma.orderRefund.update({
      where: { id: refundRecord.id },
      data: {
        errorMessage: `Network or API timeout: ${errorMsg}`,
      },
    });

    return {
      success: false,
      status: refundRecord.status,
      message: `Failed to communicate with Razorpay refund API: ${errorMsg}`,
    };
  }
}


