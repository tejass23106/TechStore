import { Resend } from "resend";

console.log(
  "Resend API key loaded:",
  process.env.RESEND_API_KEY
    ? `YES (${process.env.RESEND_API_KEY.length} characters)`
    : "NO"
);

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL =
  process.env.APP_URL || "http://localhost:5173";

const FROM_EMAIL =
  process.env.FROM_EMAIL || "onboarding@resend.dev";

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("Resend email error:", {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      details: error,
    });

    throw new Error("Failed to send email");
  }

  return data;
}

/* =========================================================
   PASSWORD RESET
   ========================================================= */

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
) {
  const resetUrl =
    `${APP_URL}/reset-password?token=${encodeURIComponent(
      resetToken
    )}`;

  return sendEmail({
    to: email,
    subject: "Reset your TechStore password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #111;">
        <h2>Reset your TechStore password</h2>

        <p>
          We received a request to reset your TechStore password.
        </p>

        <p>
          Click the button below to create a new password:
        </p>

        <p>
          <a
            href="${resetUrl}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background: #000;
              color: #fff;
              text-decoration: none;
              border-radius: 999px;
              font-weight: 600;
            "
          >
            Reset Password
          </a>
        </p>

        <p>
          This link will expire in 30 minutes and can only be used once.
        </p>

        <p>
          If you did not request a password reset, you can safely ignore this email.
        </p>

        <p>
          — TechStore
        </p>
      </div>
    `,
  });
}

/* =========================================================
   EMAIL VERIFICATION
   ========================================================= */

export async function sendEmailVerificationEmail(
  email: string,
  verificationToken: string
) {
  const verificationUrl =
    `${APP_URL}/verify-email?token=${encodeURIComponent(
      verificationToken
    )}`;

  return sendEmail({
    to: email,
    subject: "Verify your TechStore email",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #111;">
        <h2>Verify your TechStore email</h2>

        <p>
          Welcome to TechStore.
        </p>

        <p>
          Please verify your email address by clicking the button below:
        </p>

        <p>
          <a
            href="${verificationUrl}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background: #000;
              color: #fff;
              text-decoration: none;
              border-radius: 999px;
              font-weight: 600;
            "
          >
            Verify Email
          </a>
        </p>

        <p>
          If you did not create a TechStore account, you can safely ignore this email.
        </p>

        <p>
          — TechStore
        </p>
      </div>
    `,
  });
}

/* =========================================================
   ORDER CONFIRMATION
   ========================================================= */

export async function sendOrderConfirmationEmail({
  email,
  orderId,
  total,
}: {
  email: string;
  orderId: number | string;
  total: number | string;
}) {
  return sendEmail({
    to: email,
    subject: `TechStore order #${orderId} confirmed`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #111;">
        <h2>Order confirmed</h2>

        <p>
          Thank you for shopping with TechStore.
        </p>

        <p>
          Your order has been successfully placed.
        </p>

        <div
          style="
            background: #f5f5f5;
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
          "
        >
          <p style="margin: 0 0 8px;">
            <strong>Order ID:</strong> #${orderId}
          </p>

          <p style="margin: 0;">
            <strong>Total:</strong> ₹${total}
          </p>
        </div>

        <p>
          You can view your order from your TechStore account.
        </p>

        <p>
          — TechStore
        </p>
      </div>
    `,
  });
}

/* =========================================================
   PAYMENT CONFIRMATION
   ========================================================= */

export async function sendPaymentConfirmationEmail({
  email,
  orderId,
  paymentId,
  amount,
}: {
  email: string;
  orderId: number | string;
  paymentId: string;
  amount: number | string;
}) {
  return sendEmail({
    to: email,
    subject: `Payment received for TechStore order #${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #111;">
        <h2>Payment successful</h2>

        <p>
          We have successfully received your payment for your TechStore order.
        </p>

        <div
          style="
            background: #f5f5f5;
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
          "
        >
          <p style="margin: 0 0 8px;">
            <strong>Order ID:</strong> #${orderId}
          </p>

          <p style="margin: 0 0 8px;">
            <strong>Amount:</strong> ₹${amount}
          </p>

          <p style="margin: 0;">
            <strong>Payment ID:</strong> ${paymentId}
          </p>
        </div>

        <p>
          Thank you for your purchase.
        </p>

        <p>
          — TechStore
        </p>
      </div>
    `,
  });
}

/* =========================================================
   PRO SUBSCRIPTION
   ========================================================= */

export async function sendProSubscriptionEmail({
  email,
  subscriptionId,
  amount = 199,
}: {
  email: string;
  subscriptionId: string;
  amount?: number | string;
}) {
  return sendEmail({
    to: email,
    subject: "Welcome to TechStore Pro",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #111;">
        <h2>Welcome to TechStore Pro 👑</h2>

        <p>
          Your TechStore Pro subscription is now active.
        </p>

        <div
          style="
            background: #f5f5f5;
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
          "
        >
          <p style="margin: 0 0 8px;">
            <strong>Plan:</strong> TechStore Pro
          </p>

          <p style="margin: 0 0 8px;">
            <strong>Amount:</strong> ₹${amount}/month
          </p>

          <p style="margin: 0;">
            <strong>Subscription ID:</strong> ${subscriptionId}
          </p>
        </div>

        <p>
          You now have access to your TechStore Pro features.
        </p>

        <p>
          — TechStore
        </p>
      </div>
    `,
  });
}

/* =========================================================
   PRO RENEWAL
   ========================================================= */

export async function sendProRenewalEmail({
  email,
  subscriptionId,
  amount = 199,
}: {
  email: string;
  subscriptionId: string;
  amount?: number | string;
}) {
  return sendEmail({
    to: email,
    subject: "Your TechStore Pro subscription was renewed",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #111;">
        <h2>TechStore Pro renewed</h2>

        <p>
          Your TechStore Pro subscription has been successfully renewed.
        </p>

        <div
          style="
            background: #f5f5f5;
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
          "
        >
          <p style="margin: 0 0 8px;">
            <strong>Plan:</strong> TechStore Pro
          </p>

          <p style="margin: 0 0 8px;">
            <strong>Amount:</strong> ₹${amount}
          </p>

          <p style="margin: 0;">
            <strong>Subscription ID:</strong> ${subscriptionId}
          </p>
        </div>

        <p>
          Your Pro membership remains active.
        </p>

        <p>
          — TechStore
        </p>
      </div>
    `,
  });
}

/* =========================================================
   PRO EXPIRATION / CANCELLATION
   ========================================================= */

export async function sendProSubscriptionEndedEmail({
  email,
  subscriptionId,
  reason,
}: {
  email: string;
  subscriptionId: string;
  reason: "expired" | "cancelled";
}) {
  const title =
    reason === "cancelled"
      ? "TechStore Pro subscription cancelled"
      : "TechStore Pro subscription expired";

  const message =
    reason === "cancelled"
      ? "Your TechStore Pro subscription has been cancelled."
      : "Your TechStore Pro subscription has expired.";

  return sendEmail({
    to: email,
    subject: title,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #111;">
        <h2>${title}</h2>

        <p>
          ${message}
        </p>

        <div
          style="
            background: #f5f5f5;
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
          "
        >
          <p style="margin: 0;">
            <strong>Subscription ID:</strong> ${subscriptionId}
          </p>
        </div>

        <p>
          You can upgrade to TechStore Pro again from your account whenever you want.
        </p>

        <p>
          — TechStore
        </p>
      </div>
    `,
  });
}

