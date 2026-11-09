
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

  if (refundRecord) {
    // Validate record invariants match requested refund operation
    if (
      refundRecord.orderId !== orderId ||
      refundRecord.paymentId !== paymentId ||
      refundRecord.reason !== "LATE_CAPTURE"
    ) {
      throw new Error(
        `OrderRefund record ${refundRecord.id} mismatch: order ${refundRecord.orderId} vs ${orderId}, payment ${refundRecord.paymentId} vs ${paymentId}`
      );
    }

    if (refundRecord.amountPaise !== amountPaise) {
      throw new Error(
        `OrderRefund record ${refundRecord.id} amount mismatch: recorded ${refundRecord.amountPaise} vs requested ${amountPaise}`
      );
    }
  }

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

  // If already processed, return immediately without requiring credentials.
  if (refundRecord.status === "PROCESSED") {
    return {
      success: true,
      refundId: refundRecord.razorpayRefundId ?? undefined,
      status: "PROCESSED",
      message: "Refund already processed",
    };
  }

  // If previously marked FAILED, check if it was explicitly classified as a permanent rejection.
  if (refundRecord.status === "FAILED") {
    // Only permanent rejections (e.g. BAD_REQUEST_ERROR with non-retryable reason) are blocked from retry.
    const isPermanentRejection =
      refundRecord.errorMessage?.startsWith("PERMANENT_REJECTION:") ?? false;

    if (isPermanentRejection) {
      return {
        success: false,
        status: "FAILED",
        message: `Refund cannot be retried automatically due to permanent rejection: ${refundRecord.errorMessage}`,
      };
    }

    // Reset retryable/transient failure to PENDING for retry
    refundRecord = await prisma.orderRefund.update({
      where: { id: refundRecord.id },
      data: {
        status: "PENDING",
        errorMessage: null,
      },
    });
  }

  // Step 2: Ensure Razorpay credentials exist before making external call.
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured");
  }

  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

  // Call Razorpay Refund API with safe authenticated HTTP request and idempotency header.
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
      const msg = "IN_FLIGHT_CONFLICT: Refund request is currently being processed by Razorpay";
      const updated = await prisma.orderRefund.update({
        where: { id: refundRecord.id },
        data: {
          status: "SUBMITTED",
          errorMessage: msg,
        },
      });

      return {
        success: false,
        status: updated.status,
        message: msg,
      };
    }

    type RazorpayRefundResponse = {
      id?: string;
      status?: string;
      error?: {
        code?: string;
        description?: string;
        source?: string;
        step?: string;
        reason?: string;
      };
    };

    let responseData: RazorpayRefundResponse | null = null;

    try {
      responseData = (await response.json()) as RazorpayRefundResponse;
    } catch {
      responseData = null;
    }

    if (!response.ok) {
      const httpStatus = response.status;
      const errorCode = responseData?.error?.code ?? "";
      const errorDesc = responseData?.error?.description ?? `HTTP ${httpStatus}`;

      // Structured failure classification:
      // Permanent: 400 with BAD_REQUEST_ERROR (business/validation logic failure, e.g. payment already fully refunded)
      const isPermanent =
        httpStatus === 400 ||
        errorCode === "BAD_REQUEST_ERROR";

      const prefix = isPermanent ? "PERMANENT_REJECTION:" : "TRANSIENT_FAILURE:";
      const errorMsg = `${prefix} [${errorCode || httpStatus}] ${errorDesc}`;

      const updated = await prisma.orderRefund.update({
        where: { id: refundRecord.id },
        data: {
          status: isPermanent ? "FAILED" : "SUBMITTED",
          errorMessage: errorMsg,
        },
      });

      return {
        success: false,
        status: updated.status,
        message: errorMsg,
      };
    }

    const razorpayRefundId = responseData?.id ?? null;
    const isProcessed = responseData?.status === "processed";
    const nextStatus = isProcessed ? "PROCESSED" : "SUBMITTED";

    // Step 3: Atomic database reconciliation after successful external API response
    try {
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
    } catch (dbError) {
      // Database failure after successful external API call!
      // Must NOT be classified as network failure or marked FAILED.
      // Persist the external refund ID and SUBMITTED state so webhook or retry reconciles.
      console.error(
        `Database update error after successful Razorpay refund ${razorpayRefundId}:`,
        dbError
      );

      try {
        await prisma.orderRefund.update({
          where: { id: refundRecord.id },
          data: {
            status: "SUBMITTED",
            razorpayRefundId,
            errorMessage: `DATABASE_RECONCILIATION_PENDING: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
          },
        });
      } catch (logErr) {
        console.error("Failed to update OrderRefund with reconciliation error:", logErr);
      }

      return {
        success: false,
        refundId: razorpayRefundId ?? undefined,
        status: "SUBMITTED",
        message: "Refund accepted by Razorpay, but local database update is pending reconciliation.",
      };
    }

    const finalRecord = await prisma.orderRefund.findUnique({
      where: { id: refundRecord.id },
    });

    return {
      success: true,
      refundId: razorpayRefundId ?? undefined,
      status: finalRecord?.status ?? nextStatus,
      message: isProcessed
        ? "Refund processed successfully"
        : "Refund submitted to Razorpay",
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Network or execution error communicating with Razorpay refund API:", err);

    // Unknown outcome (network drop/timeout after request sent):
    // Keep status as PENDING or SUBMITTED so it can be retried with the exact same idempotencyKey
    const updated = await prisma.orderRefund.update({
      where: { id: refundRecord.id },
      data: {
        errorMessage: `UNKNOWN_OUTCOME: Network or timeout: ${errorMsg}`,
      },
    });

    return {
      success: false,
      status: updated.status,
      message: `Failed to communicate with Razorpay refund API: ${errorMsg}`,
    };
  }
}


