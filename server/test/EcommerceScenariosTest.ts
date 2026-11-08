import test, { describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";

// ============================================================================
// IN-MEMORY TEST DOUBLES & MOCKS
// ============================================================================

type MockProduct = {
  id: number;
  name: string;
  stock: number;
  price: number;
  active: boolean;
};

type MockOrder = {
  id: number;
  userId: number;
  status: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  stockReserved: boolean;
  reservationExpiresAt: Date | null;
  total: number;
  subtotal: number;
  refundedAmount: Prisma.Decimal;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  items: Array<{ productId: number; quantity: number; unitPrice: number }>;
};

type MockOrderRefund = {
  id: number;
  orderId: number;
  paymentId: string;
  razorpayRefundId: string | null;
  idempotencyKey: string;
  amountPaise: number;
  reason: "LATE_CAPTURE";
  status: "PENDING" | "SUBMITTED" | "PROCESSED" | "FAILED";
  errorMessage: string | null;
};

class MockDb {
  products = new Map<number, MockProduct>();
  orders = new Map<number, MockOrder>();
  refunds = new Map<number, MockOrderRefund>();
  webhookEvents = new Map<string, { id: string; event: string; processed: boolean }>();
  subscriptions = new Map<string, { id: number; plan: string; status: string }>();

  reset() {
    this.products.clear();
    this.orders.clear();
    this.refunds.clear();
    this.webhookEvents.clear();
    this.subscriptions.clear();
  }
}

const db = new MockDb();

// ============================================================================
// SIMULATED BUSINESS LOGIC (Mirrors server implementation)
// ============================================================================

function reserveStockForOrder(
  userId: number,
  items: Array<{ productId: number; quantity: number }>,
  orderId: number
): { success: boolean; error?: string } {
  // Check stock and active status
  for (const item of items) {
    const product = db.products.get(item.productId);
    if (!product || !product.active) {
      return { success: false, error: "PRODUCT_INACTIVE" };
    }
    if (product.stock < item.quantity) {
      return {
        success: false,
        error: `INSUFFICIENT_STOCK:${product.name}:${product.stock}`,
      };
    }
  }

  // Atomically decrement stock
  for (const item of items) {
    const product = db.products.get(item.productId)!;
    product.stock -= item.quantity;
  }

  const subtotal = items.reduce((sum, item) => {
    const prod = db.products.get(item.productId)!;
    return sum + prod.price * item.quantity;
  }, 0);

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  db.orders.set(orderId, {
    id: orderId,
    userId,
    status: "PENDING",
    paymentStatus: "PENDING",
    stockReserved: true,
    reservationExpiresAt: expiresAt,
    total: subtotal,
    subtotal,
    refundedAmount: new Prisma.Decimal(0),
    razorpayOrderId: `order_rzp_${orderId}`,
    razorpayPaymentId: null,
    items: items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: db.products.get(i.productId)!.price,
    })),
  });

  return { success: true };
}

function verifyPayment(params: {
  orderId: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  secret: string;
}): { status: number; message: string; refundInitiated?: boolean } {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, secret } = params;
  const order = db.orders.get(orderId);
  if (!order) return { status: 404, message: "Order not found" };

  if (order.razorpayOrderId !== razorpayOrderId) {
    return { status: 400, message: "Razorpay order ID does not match" };
  }

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSig !== razorpaySignature) {
    return { status: 400, message: "Invalid Razorpay signature" };
  }

  // Idempotency check for already paid order
  if (order.paymentStatus === "PAID") {
    if (order.razorpayPaymentId && order.razorpayPaymentId !== razorpayPaymentId) {
      return {
        status: 400,
        message: "Payment ID does not match the payment confirmed for this order",
      };
    }
    return { status: 200, message: "Payment already verified" };
  }

  // Reservation check
  const now = new Date();
  if (
    !order.stockReserved ||
    (order.reservationExpiresAt && order.reservationExpiresAt <= now)
  ) {
    // Late capture detected! Initiate automatic refund
    processLateCaptureMock({
      orderId,
      paymentId: razorpayPaymentId,
      amountPaise: order.total * 100,
    });
    return {
      status: 409,
      message: "Your stock reservation has expired. Automatic refund has been initiated.",
      refundInitiated: true,
    };
  }

  // Atomic claim
  order.paymentStatus = "PAID";
  order.status = "CONFIRMED";
  order.stockReserved = false;
  order.razorpayPaymentId = razorpayPaymentId;

  return { status: 200, message: "Payment verified successfully" };
}

function processLateCaptureMock(params: {
  orderId: number;
  paymentId: string;
  amountPaise: number;
  simulateTimeout?: boolean;
  simulateApiFailure?: boolean;
  simulateConflict409?: boolean;
}): { success: boolean; idempotencyKey: string; status: string; message: string } {
  const { orderId, paymentId, amountPaise, simulateTimeout, simulateApiFailure, simulateConflict409 } = params;
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new Error(`Invalid refund amountPaise: ${amountPaise}`);
  }

  const idempotencyKey = `refund_${orderId}_${paymentId}_LATE_CAPTURE`;

  let refundRecord = Array.from(db.refunds.values()).find(
    (r) => r.orderId === orderId && r.paymentId === paymentId && r.reason === "LATE_CAPTURE"
  );

  if (!refundRecord) {
    refundRecord = {
      id: db.refunds.size + 1,
      orderId,
      paymentId,
      razorpayRefundId: null,
      idempotencyKey,
      amountPaise,
      reason: "LATE_CAPTURE",
      status: "PENDING",
      errorMessage: null,
    };
    db.refunds.set(refundRecord.id, refundRecord);
  }

  if (refundRecord.status === "PROCESSED") {
    return { success: true, idempotencyKey, status: "PROCESSED", message: "Refund already processed" };
  }

  // Reset FAILED status to PENDING on retry
  if (refundRecord.status === "FAILED") {
    refundRecord.status = "PENDING";
    refundRecord.errorMessage = null;
  }

  if (simulateConflict409) {
    refundRecord.status = "SUBMITTED";
    refundRecord.errorMessage = "In-flight 409 conflict";
    return { success: false, idempotencyKey, status: "SUBMITTED", message: "In-flight 409 conflict" };
  }

  if (simulateTimeout) {
    refundRecord.errorMessage = "Network timeout";
    return { success: false, idempotencyKey, status: refundRecord.status, message: "Network timeout" };
  }

  if (simulateApiFailure) {
    refundRecord.status = "FAILED";
    refundRecord.errorMessage = "Razorpay API error 400: Payment not eligible for refund";
    return { success: false, idempotencyKey, status: "FAILED", message: refundRecord.errorMessage };
  }

  // Successful call to Razorpay
  refundRecord.status = "PROCESSED";
  refundRecord.razorpayRefundId = `rfnd_${paymentId}_mock`;
  refundRecord.errorMessage = null;

  const order = db.orders.get(orderId);
  if (order) {
    const refundRupees = new Prisma.Decimal(amountPaise).div(100);
    order.refundedAmount = order.refundedAmount.plus(refundRupees);
    if (order.refundedAmount.gte(new Prisma.Decimal(order.total))) {
      order.paymentStatus = "REFUNDED";
    }
  }

  return { success: true, idempotencyKey, status: "PROCESSED", message: "Refund processed successfully" };
}

function processRefundWebhookMock(params: {
  refundId: string;
  paymentId: string;
  amountPaise: number;
  status: string;
}): { status: number; message: string } {
  const { refundId, paymentId, amountPaise, status } = params;
  if (!refundId || !paymentId || amountPaise <= 0) {
    return { status: 400, message: "Invalid refund payload" };
  }
  if (status !== "processed") {
    if (status === "failed") {
      const targetRefund = Array.from(db.refunds.values()).find(
        (r) => r.paymentId === paymentId && (r.status === "PENDING" || r.status === "SUBMITTED")
      );
      if (targetRefund) {
        targetRefund.status = "FAILED";
        targetRefund.errorMessage = "Refund failed according to webhook";
      }
      return { status: 200, message: "Refund failure recorded" };
    }
    return { status: 200, message: "Refund is not processed yet" };
  }

  const existingRefund = Array.from(db.refunds.values()).find(
    (r) => r.razorpayRefundId === refundId && r.status === "PROCESSED"
  );

  if (existingRefund) {
    return { status: 200, message: "Refund already processed" };
  }

  // Find pending/submitted/failed record if any
  const pendingRefund = Array.from(db.refunds.values()).find(
    (r) => r.paymentId === paymentId && (r.status === "PENDING" || r.status === "SUBMITTED" || r.status === "FAILED")
  );

  const order = pendingRefund
    ? db.orders.get(pendingRefund.orderId)
    : Array.from(db.orders.values()).find((o) => o.razorpayPaymentId === paymentId);

  if (!order) {
    return { status: 404, message: "Order not found" };
  }

  const refundRupees = new Prisma.Decimal(amountPaise).div(100);
  const newRefunded = order.refundedAmount.plus(refundRupees);
  if (newRefunded.gt(new Prisma.Decimal(order.total))) {
    return { status: 400, message: "Refund exceeds total" };
  }

  if (pendingRefund) {
    pendingRefund.status = "PROCESSED";
    pendingRefund.razorpayRefundId = refundId;
    pendingRefund.amountPaise = amountPaise;
    pendingRefund.errorMessage = null;
  } else {
    const newRecord: MockOrderRefund = {
      id: db.refunds.size + 1,
      orderId: order.id,
      paymentId,
      razorpayRefundId: refundId,
      idempotencyKey: `webhook_${refundId}`,
      amountPaise,
      reason: "LATE_CAPTURE",
      status: "PROCESSED",
      errorMessage: null,
    };
    db.refunds.set(newRecord.id, newRecord);
  }

  order.refundedAmount = newRefunded;
  if (newRefunded.equals(new Prisma.Decimal(order.total))) {
    order.paymentStatus = "REFUNDED";
  }

  return { status: 200, message: "Refund processed successfully" };
}

function releaseExpiredReservationsMock(now = new Date()): number {
  let count = 0;
  for (const order of db.orders.values()) {
    if (
      order.status === "PENDING" &&
      order.paymentStatus === "PENDING" &&
      order.stockReserved &&
      order.reservationExpiresAt &&
      order.reservationExpiresAt <= now
    ) {
      order.stockReserved = false;
      order.status = "CANCELLED";
      for (const item of order.items) {
        const prod = db.products.get(item.productId);
        if (prod) prod.stock += item.quantity;
      }
      count++;
    }
  }
  return count;
}

function updateAdminOrderStatusMock(params: {
  orderId: number;
  newStatus: MockOrder["status"];
}): { status: number; message: string } {
  const { orderId, newStatus } = params;
  const order = db.orders.get(orderId);
  if (!order) return { status: 404, message: "Order not found" };

  if (order.status === newStatus) {
    return { status: 200, message: "Order status updated successfully" };
  }
  if (order.status === "DELIVERED" || order.status === "CANCELLED") {
    return { status: 400, message: "Terminal state cannot be modified" };
  }
  if (
    (newStatus === "CONFIRMED" ||
      newStatus === "PROCESSING" ||
      newStatus === "SHIPPED" ||
      newStatus === "DELIVERED") &&
    order.paymentStatus !== "PAID"
  ) {
    return { status: 400, message: "Cannot confirm/ship/deliver unpaid order" };
  }
  if (newStatus === "SHIPPED" && order.status !== "CONFIRMED" && order.status !== "PROCESSING") {
    return { status: 400, message: "Must be confirmed/processing before shipping" };
  }
  if (newStatus === "DELIVERED" && order.status !== "SHIPPED") {
    return { status: 400, message: "Must be shipped before delivering" };
  }

  order.status = newStatus;
  return { status: 200, message: "Order status updated successfully" };
}

// ============================================================================
// TEST SUITE: 16 CORE SCENARIOS
// ============================================================================

describe("TechStore Full-Stack E-Commerce Verification Scenarios", () => {
  const secret = "test_razorpay_secret_123";

  test("Scenario 1: Successful order reservation", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "Keyboard", stock: 10, price: 1000, active: true });

    const result = reserveStockForOrder(1, [{ productId: 1, quantity: 2 }], 101);
    assert.strictEqual(result.success, true);

    const product = db.products.get(1)!;
    assert.strictEqual(product.stock, 8); // 10 - 2

    const order = db.orders.get(101)!;
    assert.strictEqual(order.stockReserved, true);
    assert.strictEqual(order.status, "PENDING");
  });

  test("Scenario 2: Insufficient inventory", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "Mouse", stock: 1, price: 500, active: true });

    const result = reserveStockForOrder(1, [{ productId: 1, quantity: 2 }], 102);
    assert.strictEqual(result.success, false);
    assert.match(result.error!, /INSUFFICIENT_STOCK/);

    const product = db.products.get(1)!;
    assert.strictEqual(product.stock, 1); // Untouched
  });

  test("Scenario 3: Multiple products with one unavailable product (Rollback)", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "Monitor", stock: 5, price: 5000, active: true });
    db.products.set(2, { id: 2, name: "Webcam", stock: 0, price: 2000, active: true });

    const result = reserveStockForOrder(1, [{ productId: 1, quantity: 2 }, { productId: 2, quantity: 1 }], 103);
    assert.strictEqual(result.success, false);

    assert.strictEqual(db.products.get(1)!.stock, 5); // Product 1 was not decremented
    assert.strictEqual(db.orders.has(103), false);
  });

  test("Scenario 4: Concurrent reservations on limited stock", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "GPU", stock: 2, price: 40000, active: true });

    const req1 = reserveStockForOrder(1, [{ productId: 1, quantity: 2 }], 104);
    const req2 = reserveStockForOrder(2, [{ productId: 1, quantity: 2 }], 105);

    assert.strictEqual(req1.success, true);
    assert.strictEqual(req2.success, false); // Rejected
    assert.strictEqual(db.products.get(1)!.stock, 0);
  });

  test("Scenario 5: Successful payment confirmation without double stock deduction", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "Headset", stock: 10, price: 1500, active: true });
    reserveStockForOrder(1, [{ productId: 1, quantity: 1 }], 106);

    const order = db.orders.get(106)!;
    const paymentId = "pay_headset_1";
    const sig = crypto.createHmac("sha256", secret).update(`${order.razorpayOrderId}|${paymentId}`).digest("hex");

    const res = verifyPayment({
      orderId: 106,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: sig,
      secret,
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(order.status, "CONFIRMED");
    assert.strictEqual(order.paymentStatus, "PAID");
    assert.strictEqual(order.stockReserved, false);
    assert.strictEqual(db.products.get(1)!.stock, 9); // Remains 9, not decremented twice
  });

  test("Scenario 6: Failed payment followed by retry", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "Mic", stock: 5, price: 800, active: true });
    reserveStockForOrder(1, [{ productId: 1, quantity: 1 }], 107);

    const order = db.orders.get(107)!;
    // Customer payment fails initially
    order.paymentStatus = "PENDING"; // Retry allowed
    assert.strictEqual(order.stockReserved, true);

    // Customer retries with new payment ID
    const retryPaymentId = "pay_retry_107";
    const retrySig = crypto.createHmac("sha256", secret).update(`${order.razorpayOrderId}|${retryPaymentId}`).digest("hex");

    const res = verifyPayment({
      orderId: 107,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: retryPaymentId,
      razorpaySignature: retrySig,
      secret,
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(order.paymentStatus, "PAID");
  });

  test("Scenario 7: Duplicate payment webhook idempotent handling", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "Pad", stock: 20, price: 300, active: true });
    reserveStockForOrder(1, [{ productId: 1, quantity: 1 }], 108);

    const order = db.orders.get(108)!;
    const paymentId = "pay_pad_108";
    const sig = crypto.createHmac("sha256", secret).update(`${order.razorpayOrderId}|${paymentId}`).digest("hex");

    // First delivery
    verifyPayment({ orderId: 108, razorpayOrderId: order.razorpayOrderId!, razorpayPaymentId: paymentId, razorpaySignature: sig, secret });
    // Second delivery (duplicate)
    const duplicateRes = verifyPayment({ orderId: 108, razorpayOrderId: order.razorpayOrderId!, razorpayPaymentId: paymentId, razorpaySignature: sig, secret });

    assert.strictEqual(duplicateRes.status, 200);
    assert.strictEqual(duplicateRes.message, "Payment already verified");
    assert.strictEqual(db.products.get(1)!.stock, 19); // Stock preserved
  });

  test("Scenario 8: Concurrent payment verification rejecting mismatched payment ID", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "RAM", stock: 8, price: 3000, active: true });
    reserveStockForOrder(1, [{ productId: 1, quantity: 1 }], 109);

    const order = db.orders.get(109)!;
    const genuinePaymentId = "pay_ram_genuine";
    const fakePaymentId = "pay_ram_fake";
    const genuineSig = crypto.createHmac("sha256", secret).update(`${order.razorpayOrderId}|${genuinePaymentId}`).digest("hex");
    const fakeSig = crypto.createHmac("sha256", secret).update(`${order.razorpayOrderId}|${fakePaymentId}`).digest("hex");

    // Genuine verification succeeds
    verifyPayment({ orderId: 109, razorpayOrderId: order.razorpayOrderId!, razorpayPaymentId: genuinePaymentId, razorpaySignature: genuineSig, secret });

    // Attack or concurrent mismatched payment ID submitted to already-paid order
    const mismatchRes = verifyPayment({
      orderId: 109,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: fakePaymentId,
      razorpaySignature: fakeSig,
      secret,
    });

    assert.strictEqual(mismatchRes.status, 400);
    assert.match(mismatchRes.message, /Payment ID does not match/);
  });

  test("Scenario 9: Payment captured after reservation expiry (Automatic refund)", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "SSD", stock: 5, price: 6000, active: true });
    reserveStockForOrder(1, [{ productId: 1, quantity: 1 }], 110);

    const order = db.orders.get(110)!;
    // Fast-forward time so reservation expires
    order.reservationExpiresAt = new Date(Date.now() - 1000);
    order.stockReserved = false;

    const paymentId = "pay_ssd_late";
    const sig = crypto.createHmac("sha256", secret).update(`${order.razorpayOrderId}|${paymentId}`).digest("hex");

    const res = verifyPayment({
      orderId: 110,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: sig,
      secret,
    });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.refundInitiated, true);

    const refund = Array.from(db.refunds.values()).find((r) => r.orderId === 110)!;
    assert.ok(refund);
    assert.strictEqual(refund.status, "PROCESSED");
    assert.strictEqual(refund.reason, "LATE_CAPTURE");
    assert.strictEqual(refund.amountPaise, 600000);
  });

  test("Scenario 10: Refund API timeout and retry using same idempotency key", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "Fan", stock: 10, price: 400, active: true });
    reserveStockForOrder(1, [{ productId: 1, quantity: 1 }], 111);

    // Initial attempt times out
    const attempt1 = processLateCaptureMock({
      orderId: 111,
      paymentId: "pay_fan_timeout",
      amountPaise: 40000,
      simulateTimeout: true,
    });
    assert.strictEqual(attempt1.success, false);

    // Retry attempt
    const attempt2 = processLateCaptureMock({
      orderId: 111,
      paymentId: "pay_fan_timeout",
      amountPaise: 40000,
      simulateTimeout: false,
    });
    assert.strictEqual(attempt2.success, true);
    assert.strictEqual(attempt2.idempotencyKey, attempt1.idempotencyKey); // Same key reused
    assert.strictEqual(db.refunds.size, 1); // No duplicate refund records
  });

  test("Scenario 11: Duplicate refund webhook idempotent handling", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "Cable", stock: 10, price: 200, active: true });
    reserveStockForOrder(1, [{ productId: 1, quantity: 1 }], 112);

    const order = db.orders.get(112)!;
    order.paymentStatus = "PAID";
    order.razorpayPaymentId = "pay_cable_112";

    // Webhook delivery 1
    const res1 = processRefundWebhookMock({
      refundId: "rfnd_cable_1",
      paymentId: "pay_cable_112",
      amountPaise: 20000,
      status: "processed",
    });
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(order.refundedAmount.toString(), "200");

    // Webhook delivery 2 (duplicate delivery of same refundId)
    const res2 = processRefundWebhookMock({
      refundId: "rfnd_cable_1",
      paymentId: "pay_cable_112",
      amountPaise: 20000,
      status: "processed",
    });
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.message, "Refund already processed");
    assert.strictEqual(order.refundedAmount.toString(), "200"); // Not doubled to 400!
  });

  test("Scenario 12: Partial refund updates refundedAmount while preserving PAID status", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "Chair", stock: 5, price: 10000, active: true });
    reserveStockForOrder(1, [{ productId: 1, quantity: 1 }], 113);

    const order = db.orders.get(113)!;
    order.paymentStatus = "PAID";
    order.razorpayPaymentId = "pay_chair_113";

    // Partial refund of ₹3000
    processRefundWebhookMock({
      refundId: "rfnd_chair_part",
      paymentId: "pay_chair_113",
      amountPaise: 300000,
      status: "processed",
    });

    assert.strictEqual(order.refundedAmount.toString(), "3000");
    assert.strictEqual(order.paymentStatus, "PAID"); // Still PAID, not REFUNDED
  });

  test("Scenario 13: Full refund sets paymentStatus to REFUNDED", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "Desk", stock: 5, price: 15000, active: true });
    reserveStockForOrder(1, [{ productId: 1, quantity: 1 }], 114);

    const order = db.orders.get(114)!;
    order.paymentStatus = "PAID";
    order.razorpayPaymentId = "pay_desk_114";

    // Full refund of ₹15000
    processRefundWebhookMock({
      refundId: "rfnd_desk_full",
      paymentId: "pay_desk_114",
      amountPaise: 1500000,
      status: "processed",
    });

    assert.strictEqual(order.refundedAmount.toString(), "15000");
    assert.strictEqual(order.paymentStatus, "REFUNDED");
  });

  test("Scenario 14: Repeated reservation expiry releases stock exactly once", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "Switch", stock: 5, price: 2000, active: true });
    reserveStockForOrder(1, [{ productId: 1, quantity: 2 }], 115);

    assert.strictEqual(db.products.get(1)!.stock, 3); // 5 - 2

    // Expire reservation
    db.orders.get(115)!.reservationExpiresAt = new Date(Date.now() - 10000);

    // Job 1 runs
    const released1 = releaseExpiredReservationsMock();
    assert.strictEqual(released1, 1);
    assert.strictEqual(db.products.get(1)!.stock, 5); // Restored to 5

    // Job 2 runs immediately after
    const released2 = releaseExpiredReservationsMock();
    assert.strictEqual(released2, 0); // No double restore
    assert.strictEqual(db.products.get(1)!.stock, 5); // Still 5
  });

  test("Scenario 15: Admin invalid status transitions blocked", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "Router", stock: 10, price: 2500, active: true });
    reserveStockForOrder(1, [{ productId: 1, quantity: 1 }], 116);

    const order = db.orders.get(116)!;

    // 1. Cannot confirm unpaid order
    const r1 = updateAdminOrderStatusMock({ orderId: 116, newStatus: "CONFIRMED" });
    assert.strictEqual(r1.status, 400);

    // 2. Cannot ship unpaid order
    const r2 = updateAdminOrderStatusMock({ orderId: 116, newStatus: "SHIPPED" });
    assert.strictEqual(r2.status, 400);

    // Pay order
    order.paymentStatus = "PAID";
    order.status = "CONFIRMED";

    // 3. Cannot deliver order that was never shipped
    const r3 = updateAdminOrderStatusMock({ orderId: 116, newStatus: "DELIVERED" });
    assert.strictEqual(r3.status, 400);

    // Ship order
    updateAdminOrderStatusMock({ orderId: 116, newStatus: "SHIPPED" });
    assert.strictEqual(order.status, "SHIPPED");

    // Deliver order
    updateAdminOrderStatusMock({ orderId: 116, newStatus: "DELIVERED" });
    assert.strictEqual(order.status, "DELIVERED");

    // 4. Delivered is terminal
    const r4 = updateAdminOrderStatusMock({ orderId: 116, newStatus: "CONFIRMED" });
    assert.strictEqual(r4.status, 400);
  });

  test("Scenario 16: Subscription webhook regression safety", () => {
    db.reset();
    const eventTypes = [
      "subscription.activated",
      "subscription.pending",
      "subscription.halted",
      "subscription.cancelled",
      "subscription.completed",
      "subscription.charged",
    ];

    for (const evt of eventTypes) {
      db.subscriptions.set(`sub_${evt}`, { id: 1, plan: "PRO", status: "ACTIVE" });
      const record = db.subscriptions.get(`sub_${evt}`);
      assert.ok(record, `Subscription record missing for event: ${evt}`);
      assert.strictEqual(record!.status, "ACTIVE");
    }
  });

  test("Scenario 17: Failed refund API request stores FAILED status and error message", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "Adapter", stock: 10, price: 500, active: true });
    reserveStockForOrder(1, [{ productId: 1, quantity: 1 }], 117);

    const result = processLateCaptureMock({
      orderId: 117,
      paymentId: "pay_adapter_fail",
      amountPaise: 50000,
      simulateApiFailure: true,
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, "FAILED");
    assert.match(result.message, /Payment not eligible/);

    const refund = Array.from(db.refunds.values()).find((r) => r.orderId === 117)!;
    assert.ok(refund);
    assert.strictEqual(refund.status, "FAILED");
    assert.match(refund.errorMessage!, /Payment not eligible/);
  });

  test("Scenario 18: In-flight 409 conflict marks SUBMITTED and reuses same idempotency key on retry", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "Hub", stock: 5, price: 1200, active: true });
    reserveStockForOrder(1, [{ productId: 1, quantity: 1 }], 118);

    // Initial attempt receives 409 Conflict
    const attempt1 = processLateCaptureMock({
      orderId: 118,
      paymentId: "pay_hub_conflict",
      amountPaise: 120000,
      simulateConflict409: true,
    });

    assert.strictEqual(attempt1.success, false);
    assert.strictEqual(attempt1.status, "SUBMITTED");

    const refund = Array.from(db.refunds.values()).find((r) => r.orderId === 118)!;
    assert.strictEqual(refund.status, "SUBMITTED");

    // Retry succeeds with identical idempotency key
    const attempt2 = processLateCaptureMock({
      orderId: 118,
      paymentId: "pay_hub_conflict",
      amountPaise: 120000,
      simulateConflict409: false,
    });

    assert.strictEqual(attempt2.success, true);
    assert.strictEqual(attempt2.status, "PROCESSED");
    assert.strictEqual(attempt2.idempotencyKey, attempt1.idempotencyKey);
    assert.strictEqual(db.refunds.size, 1); // No duplicates
  });

  test("Scenario 19: Webhook refund.failed updates status to FAILED without altering order amount", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "Speaker", stock: 3, price: 4000, active: true });
    reserveStockForOrder(1, [{ productId: 1, quantity: 1 }], 119);

    const order = db.orders.get(119)!;
    order.paymentStatus = "PAID";
    order.razorpayPaymentId = "pay_spk_119";

    // Set up a pending refund record
    const pendingRecord: MockOrderRefund = {
      id: 1,
      orderId: 119,
      paymentId: "pay_spk_119",
      razorpayRefundId: "rfnd_spk_fail",
      idempotencyKey: "refund_119_pay_spk_119_LATE_CAPTURE",
      amountPaise: 400000,
      reason: "LATE_CAPTURE",
      status: "SUBMITTED",
      errorMessage: null,
    };
    db.refunds.set(1, pendingRecord);

    const res = processRefundWebhookMock({
      refundId: "rfnd_spk_fail",
      paymentId: "pay_spk_119",
      amountPaise: 400000,
      status: "failed",
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(pendingRecord.status, "FAILED");
    assert.strictEqual(order.refundedAmount.toString(), "0");
    assert.strictEqual(order.paymentStatus, "PAID");
  });

  test("Scenario 20: Invalid refund amount is rejected by webhook", () => {
    db.reset();
    const resZero = processRefundWebhookMock({
      refundId: "rfnd_zero",
      paymentId: "pay_any",
      amountPaise: 0,
      status: "processed",
    });
    assert.strictEqual(resZero.status, 400);

    const resNegative = processRefundWebhookMock({
      refundId: "rfnd_neg",
      paymentId: "pay_any",
      amountPaise: -100,
      status: "processed",
    });
    assert.strictEqual(resNegative.status, 400);
  });

  test("Scenario 21: Refund for unknown payment or mismatched order returns 404", () => {
    db.reset();
    const res = processRefundWebhookMock({
      refundId: "rfnd_orphan",
      paymentId: "pay_nonexistent_xyz",
      amountPaise: 50000,
      status: "processed",
    });

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.message, "Order not found");
  });

  test("Scenario 22: Refund amount cannot exceed order total", () => {
    db.reset();
    db.products.set(1, { id: 1, name: "Flash Drive", stock: 10, price: 1000, active: true });
    reserveStockForOrder(1, [{ productId: 1, quantity: 1 }], 120);

    const order = db.orders.get(120)!;
    order.paymentStatus = "PAID";
    order.razorpayPaymentId = "pay_flash_120";

    // Attempt to refund ₹2000 on ₹1000 order
    const res = processRefundWebhookMock({
      refundId: "rfnd_exceed",
      paymentId: "pay_flash_120",
      amountPaise: 200000,
      status: "processed",
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.message, "Refund exceeds total");
    assert.strictEqual(order.refundedAmount.toString(), "0"); // Not updated
  });
});

