import "dotenv/config";

import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";

import prisma from "../lib/prisma.js";

import { validate } from "../Middleware/validate.js";

import {
createPaymentSchema,
verifyPaymentSchema,
} from "../Middleware/validation.js";

import {
requireAuth,
type AuthenticatedRequest,
} from "../Middleware/auth.js";

import { sendPaymentConfirmationEmail } from "../lib/email.js";

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

* POST /api/payments/create
*
* Creates a Razorpay order for an existing pending
* TechStore order.
  */
  router.post(
  "/create",
  requireAuth,
  validate(createPaymentSchema),
  async (req: AuthenticatedRequest, res) => {
  try {
  const userId = req.userId!;
  const razorpay = getRazorpayClient();

  if (!razorpay) {
  return res.status(500).json({
  message: "Razorpay is not configured",
  });
  }

  const { orderId } = req.body;
  const parsedOrderId = Number(orderId);

  if (
  !Number.isInteger(parsedOrderId) ||
  parsedOrderId <= 0
  ) {
  return res.status(400).json({
  message: "Invalid order ID",
  });
  }

  const order = await prisma.order.findFirst({
  where: {
  id: parsedOrderId,
  userId,
  },
  });

  if (!order) {
  return res.status(404).json({
  message: "Order not found",
  });
  }

  if (order.status !== "PENDING") {
  return res.status(400).json({
  message: "This order is no longer pending",
  });
  }

  if (order.paymentStatus !== "PENDING") {
  return res.status(400).json({
  message: "Payment has already been processed for this order",
  });
  }

  /**
  * Reuse an existing Razorpay order.
  */
  if (order.razorpayOrderId) {
  return res.json({
  message: "Razorpay order already exists",
  orderId: order.id,
  razorpayOrderId: order.razorpayOrderId,
  amount: order.total * 100,
  currency: "INR",
  keyId: process.env.RAZORPAY_KEY_ID,
  });
  }

  /**
  * TechStore stores prices in rupees.
  * Razorpay expects paise.
  */
  const amountInPaise = order.total * 100;

  if (
  !Number.isInteger(amountInPaise) ||
  amountInPaise <= 0
  ) {
  return res.status(400).json({
  message: "Invalid order amount",
  });
  }

  const razorpayOrder = await razorpay.orders.create({
  amount: amountInPaise,
  currency: "INR",
  receipt: `techstore_order_${order.id}`,
  notes: {
  techstoreOrderId: String(order.id),
  userId: String(userId),
  },
  });

  /**
  * Only attach the Razorpay order if another request
  * has not already attached one.
  */
  const updateResult = await prisma.order.updateMany({
  where: {
  id: order.id,
  userId,
  paymentStatus: "PENDING",
  status: "PENDING",
  razorpayOrderId: null,
  },
  data: {
  razorpayOrderId: razorpayOrder.id,
  },
  });

  /**
  * If another concurrent request won the race,
  * return the Razorpay order already stored in the DB.
  */
  if (updateResult.count !== 1) {
  const currentOrder = await prisma.order.findFirst({
  where: {
  id: order.id,
  userId,
  },
  select: {
  id: true,
  total: true,
  razorpayOrderId: true,
  paymentStatus: true,
  status: true,
  },
  });

  
   if (
     currentOrder?.razorpayOrderId &&
     currentOrder.paymentStatus === "PENDING" &&
     currentOrder.status === "PENDING"
   ) {
     return res.json({
       message: "Razorpay order already exists",
       orderId: currentOrder.id,
       razorpayOrderId:
         currentOrder.razorpayOrderId,
       amount: currentOrder.total * 100,
       currency: "INR",
       keyId: process.env.RAZORPAY_KEY_ID,
     });
   }

   return res.status(400).json({
     message: "This order is no longer available for payment",
   });
  

  }

  return res.status(201).json({
  message: "Razorpay order created successfully",
  orderId: order.id,
  razorpayOrderId: razorpayOrder.id,
  amount: amountInPaise,
  currency: "INR",
  keyId: process.env.RAZORPAY_KEY_ID,
  });
  } catch (error) {
  console.error("Create Razorpay order error:", error);

  return res.status(500).json({
  message: "Failed to create Razorpay order",
  });
  }
  }
  );

/**

* POST /api/payments/verify
*
* Verifies the Razorpay payment signature and confirms
* the corresponding TechStore order.
  */
  router.post(
  "/verify",
  requireAuth,
  validate(verifyPaymentSchema),
  async (req: AuthenticatedRequest, res) => {
  try {
  const userId = req.userId!;

  const {
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  } = req.body;

  const parsedOrderId = Number(orderId);

  if (
  !Number.isInteger(parsedOrderId) ||
  parsedOrderId <= 0 ||
  !razorpayOrderId ||
  !razorpayPaymentId ||
  !razorpaySignature
  ) {
  return res.status(400).json({
  message: "Invalid payment verification data",
  });
  }

  const order = await prisma.order.findFirst({
  where: {
  id: parsedOrderId,
  userId,
  },
  });

  if (!order) {
  return res.status(404).json({
  message: "Order not found",
  });
  }

  /**
  * Idempotency.
  */
  if (order.paymentStatus === "PAID") {
  return res.json({
  message: "Payment already verified",
  orderId: order.id,
  paymentStatus: order.paymentStatus,
  status: order.status,
  });
  }

  if (order.status !== "PENDING") {
  return res.status(400).json({
  message: "This order is no longer pending",
  });
  }

  if (order.paymentStatus !== "PENDING") {
  return res.status(400).json({
  message: "Payment has already been processed",
  });
  }

  /**
  * Make sure the Razorpay order belongs to this
  * TechStore order.
  */
  if (order.razorpayOrderId !== razorpayOrderId) {
  return res.status(400).json({
  message: "Razorpay order ID does not match",
  });
  }

  const razorpayKeySecret =
  process.env.RAZORPAY_KEY_SECRET;

  if (!razorpayKeySecret) {
  return res.status(500).json({
  message: "Razorpay is not configured",
  });
  }

  /**
  * Verify Razorpay signature.
  */
  const generatedSignature = crypto
  .createHmac("sha256", razorpayKeySecret)
  .update(
  `${razorpayOrderId}|${razorpayPaymentId}`
  )
  .digest("hex");

  if (
  generatedSignature.length !==
  razorpaySignature.length ||
  !crypto.timingSafeEqual(
  Buffer.from(generatedSignature, "utf8"),
  Buffer.from(razorpaySignature, "utf8")
  )
  ) {
  return res.status(400).json({
  message: "Invalid Razorpay signature",
  });
  }

  const razorpay = getRazorpayClient();

  if (!razorpay) {
  return res.status(500).json({
  message: "Razorpay is not configured",
  });
  }

  /**
  * Verify Razorpay order details directly.
  */
  const razorpayOrder =
  await razorpay.orders.fetch(razorpayOrderId);

  const expectedAmount = order.total * 100;

  if (
  razorpayOrder.amount !== expectedAmount ||
  razorpayOrder.currency !== "INR"
  ) {
  return res.status(400).json({
  message:
  "Razorpay order amount or currency mismatch",
  });
  }

  /**
  * Verify the payment belongs to the Razorpay order
  * and has actually been captured.
  */
  const razorpayPayment =
  await razorpay.payments.fetch(
  razorpayPaymentId
  );

  if (
  razorpayPayment.order_id !==
  razorpayOrderId
  ) {
  return res.status(400).json({
  message:
  "Razorpay payment does not belong to this order",
  });
  }

  /**
  * Explicitly verify the actual payment amount.
  */
  if (
  razorpayPayment.amount !== expectedAmount ||
  razorpayPayment.currency !== "INR"
  ) {
  return res.status(400).json({
  message:
  "Razorpay payment amount or currency mismatch",
  });
  }

  if (razorpayPayment.status !== "captured") {
  return res.status(400).json({
  message:
  `Payment is not captured. Current status: ${razorpayPayment.status}`,
  });
  }

  /**
  * Confirm payment, reduce stock and clear cart
  * atomically.
  */
  const result = await prisma.$transaction(
  async (tx) => {
  const currentOrder =
  await tx.order.findFirst({
  where: {
  id: parsedOrderId,
  userId,
  },
  include: {
  items: true,
  },
  });

  
     if (!currentOrder) {
       throw new Error("Order not found");
     }

     /**
      * Another process, such as the Razorpay webhook,
      * may have completed this payment first.
      *
      * In that case, do not send another confirmation
      * email from this request.
      */
     if (currentOrder.paymentStatus === "PAID") {
       return {
         order: currentOrder,
         paymentConfirmedByThisRequest: false,
       };
     }

     if (
       currentOrder.status !== "PENDING" ||
       currentOrder.paymentStatus !== "PENDING"
     ) {
       throw new Error("ORDER_NOT_PENDING");
     }

     /**
      * Reduce stock only if sufficient stock exists.
      */
     for (const item of currentOrder.items) {
       const updatedProduct =
         await tx.product.updateMany({
           where: {
             id: item.productId,
             stock: {
               gte: item.quantity,
             },
           },
           data: {
             stock: {
               decrement: item.quantity,
             },
           },
         });

       if (updatedProduct.count !== 1) {
         throw new Error(
           `Insufficient stock for product ${item.productId}`
         );
       }
     }

     /**
      * Mark order as paid and confirmed.
      */
     const updatedOrder =
       await tx.order.update({
         where: {
           id: currentOrder.id,
         },
         data: {
           paymentStatus: "PAID",
           status: "CONFIRMED",
           razorpayPaymentId,
           razorpaySignature,
         },
       });

     /**
      * Clear the authenticated user's cart.
      */
     await tx.cartItem.deleteMany({
       where: {
         cart: {
           userId,
         },
       },
     });

     return {
       order: updatedOrder,
       paymentConfirmedByThisRequest: true,
     };
   }
  

  );

  /**
  * Only send the payment confirmation email if
  * THIS request actually completed the payment.
  *
  * This prevents duplicate emails when the webhook
  * wins the race.
  */
  if (result.paymentConfirmedByThisRequest) {
  try {
  const user = await prisma.user.findUnique({
  where: {
  id: userId,
  },
  select: {
  email: true,
  },
  });

  
     if (user?.email) {
       await sendPaymentConfirmationEmail({
         email: user.email,
         orderId: result.order.id,
         paymentId: razorpayPaymentId,
         amount: result.order.total,
       });
     }
   } catch (emailError) {
     console.error(
       "Payment confirmation email failed:",
       emailError
     );
   }
  

  }

  return res.json({
  message: "Payment verified successfully",
  orderId: result.order.id,
  paymentStatus:
  result.order.paymentStatus,
  status: result.order.status,
  });
  } catch (error) {
  if (
  error instanceof Error &&
  error.message === "ORDER_NOT_PENDING"
  ) {
  return res.status(400).json({
  message:
  "This order is no longer pending",
  });
  }

  console.error(
  "Verify Razorpay payment error:",
  error
  );

  return res.status(500).json({
  message: "Payment verification failed",
  });
  }
  }
  );

export default router;
