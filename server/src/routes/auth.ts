import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { validate } from "../Middleware/validate.js";
import {
registerSchema,
loginSchema,
forgotPasswordSchema,
resetPasswordSchema,
} from "../Middleware/validation.js";
import prisma from "../lib/prisma.js";
import {
sendPasswordResetEmail,
sendEmailVerificationEmail,
} from "../lib/email.js";
import { authRateLimiter } from "../Middleware/rateLimit.js";

const router = Router();

const SESSION_DURATION_DAYS = 7;

function createSessionId() {
return crypto.randomBytes(32).toString("hex");
}

function getSessionExpiry() {
const expiresAt = new Date();

expiresAt.setDate(
expiresAt.getDate() + SESSION_DURATION_DAYS
);

return expiresAt;
}

function setSessionCookie(
res: any,
sessionId: string
) {
res.cookie("techstore_session", sessionId, {
httpOnly: true,
secure: process.env.NODE_ENV === "production",
sameSite: "lax",
maxAge:
SESSION_DURATION_DAYS *
24 *
60 *
60 *
1000,
path: "/",
});
}

/*

* =========================================================
* REGISTER
* POST /api/auth/register
* =========================================================
  */

router.post(
"/register",
authRateLimiter,
validate(registerSchema),
async (req, res) => {
try {
const { name, email, password } = req.body;


  if (!name || !email || !password) {
    return res.status(400).json({
      message:
        "Name, email and password are required",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message:
        "Password must be at least 6 characters",
    });
  }

  const normalizedEmail =
    email.trim().toLowerCase();

  const existingUser =
    await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

  if (existingUser) {
    return res.status(409).json({
      message: "Email is already registered",
    });
  }

  const passwordHash =
    await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      emailVerified: false,
    },
  });

  await prisma.emailVerificationToken.deleteMany({
    where: {
      userId: user.id,
    },
  });

  const verificationToken =
    crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const expiresAt = new Date(
    Date.now() + 24 * 60 * 60 * 1000
  );

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  await sendEmailVerificationEmail(
    user.email,
    verificationToken
  );

  const sessionId = createSessionId();

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      expiresAt: getSessionExpiry(),
    },
  });

  setSessionCookie(res, sessionId);

  return res.status(201).json({
    message:
      "Registration successful. Please verify your email address.",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    },
  });
} catch (error) {
  console.error("Registration error:", error);

  return res.status(500).json({
    message: "Registration failed",
  });
}


}
);

/*

* =========================================================
* LOGIN
* POST /api/auth/login
* =========================================================
  */

router.post(
"/login",
authRateLimiter,
validate(loginSchema),
async (req, res) => {
try {
const { email, password } = req.body;


  if (!email || !password) {
    return res.status(400).json({
      message:
        "Email and password are required",
    });
  }

  const normalizedEmail =
    email.trim().toLowerCase();

  const user =
    await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

  if (!user) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  const passwordMatches =
    await bcrypt.compare(
      password,
      user.passwordHash
    );

  if (!passwordMatches) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  const sessionId = createSessionId();

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      expiresAt: getSessionExpiry(),
    },
  });

  setSessionCookie(res, sessionId);

  return res.json({
    message: "Login successful",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    },
  });
} catch (error) {
  console.error("Login error:", error);

  return res.status(500).json({
    message: "Login failed",
  });
}


}
);

/*

* =========================================================
* FORGOT PASSWORD
* POST /api/auth/forgot-password
* =========================================================
  */

router.post(
"/forgot-password",
authRateLimiter,
validate(forgotPasswordSchema),
async (req, res) => {
try {
const { email } = req.body;


  if (!email) {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  const normalizedEmail =
    email.trim().toLowerCase();

  const user =
    await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

  if (!user) {
    return res.json({
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  }

  await prisma.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
  });

  const resetToken =
    crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const expiresAt = new Date(
    Date.now() + 30 * 60 * 1000
  );

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  await sendPasswordResetEmail(
    user.email,
    resetToken
  );

  return res.json({
    message:
      "If an account exists with this email, a password reset link has been sent.",
  });
} catch (error) {
  console.error(
    "Forgot password error:",
    error
  );

  return res.status(500).json({
    message:
      "Unable to process password reset request",
  });
}


}
);

/*

* =========================================================
* RESET PASSWORD TOKEN VERIFICATION
* POST /api/auth/verify-reset-token
* =========================================================
  */

router.post(
"/verify-reset-token",
authRateLimiter,
async (req, res) => {
try {
const token =
typeof req.query.token === "string"
? req.query.token
: undefined;


  if (!token) {
    return res.status(400).json({
      message: "Token is required",
    });
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const tokenRecord =
    await prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    });

  if (!tokenRecord) {
    return res.status(404).json({
      message: "Invalid or expired token",
    });
  }

  if (tokenRecord.expiresAt <= new Date()) {
    return res.status(404).json({
      message: "Token has expired",
    });
  }

  if (tokenRecord.usedAt) {
    return res.status(404).json({
      message: "Token has already been used",
    });
  }

  return res.json({
    message: "Token is valid",
    user: {
      id: tokenRecord.user.id,
      email: tokenRecord.user.email,
    },
  });
} catch (error) {
  console.error(
    "Password reset verify error:",
    error
  );

  return res.status(500).json({
    message: "Failed to verify token",
  });
}


}
);

/*

* =========================================================
* RESET PASSWORD
* POST /api/auth/reset-password
* =========================================================
  */

router.post(
"/reset-password",
authRateLimiter,
validate(resetPasswordSchema),
async (req, res) => {
try {
const { token, password } = req.body;


  if (!token || !password) {
    return res.status(400).json({
      message:
        "Token and password are required",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message:
        "Password must be at least 6 characters",
    });
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const passwordHash =
    await bcrypt.hash(password, 12);

  const result =
    await prisma.$transaction(async (tx) => {
      const tokenRecord =
        await tx.passwordResetToken.findUnique({
          where: {
            tokenHash,
          },
          select: {
            id: true,
            userId: true,
            expiresAt: true,
            usedAt: true,
          },
        });

      if (!tokenRecord) {
        return {
          success: false,
          reason: "invalid",
        } as const;
      }

      if (tokenRecord.expiresAt <= new Date()) {
        return {
          success: false,
          reason: "expired",
        } as const;
      }

      if (tokenRecord.usedAt) {
        return {
          success: false,
          reason: "used",
        } as const;
      }

      const consumed =
        await tx.passwordResetToken.updateMany({
          where: {
            id: tokenRecord.id,
            usedAt: null,
            expiresAt: {
              gt: new Date(),
            },
          },
          data: {
            usedAt: new Date(),
          },
        });

      if (consumed.count !== 1) {
        return {
          success: false,
          reason: "used",
        } as const;
      }

      await tx.user.update({
        where: {
          id: tokenRecord.userId,
        },
        data: {
          passwordHash,
        },
      });

      await tx.passwordResetToken.deleteMany({
        where: {
          userId: tokenRecord.userId,
          id: {
            not: tokenRecord.id,
          },
          usedAt: null,
        },
      });

      await tx.session.deleteMany({
        where: {
          userId: tokenRecord.userId,
        },
      });

      return {
        success: true,
      } as const;
    });

  if (!result.success) {
    if (result.reason === "expired") {
      return res.status(404).json({
        message: "Token has expired",
      });
    }

    if (result.reason === "used") {
      return res.status(404).json({
        message:
          "Token has already been used",
      });
    }

    return res.status(404).json({
      message: "Invalid or expired token",
    });
  }

  return res.json({
    message:
      "Password reset successful. You can now login with your new password.",
  });
} catch (error) {
  console.error(
    "Password reset error:",
    error
  );

  return res.status(500).json({
    message: "Failed to reset password",
  });
}


}
);

/*

* =========================================================
* VERIFY EMAIL
* GET /api/auth/verify-email?token=...
* =========================================================
  */

router.get(
"/verify-email",
async (req, res) => {
try {
const token =
typeof req.query.token === "string"
? req.query.token
: undefined;


  if (!token) {
    return res.status(400).json({
      message:
        "Verification token is required",
    });
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const tokenRecord =
    await prisma.emailVerificationToken.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

  if (!tokenRecord) {
    return res.status(404).json({
      message:
        "Invalid or expired verification token",
    });
  }

  if (tokenRecord.usedAt) {
    return res.status(400).json({
      message:
        "This verification link has already been used",
    });
  }

  if (tokenRecord.expiresAt <= new Date()) {
    return res.status(400).json({
      message:
        "This verification link has expired",
    });
  }

  const result =
    await prisma.$transaction(async (tx) => {
      const consumed =
        await tx.emailVerificationToken.updateMany({
          where: {
            id: tokenRecord.id,
            usedAt: null,
            expiresAt: {
              gt: new Date(),
            },
          },
          data: {
            usedAt: new Date(),
          },
        });

      if (consumed.count !== 1) {
        return false;
      }

      await tx.user.update({
        where: {
          id: tokenRecord.userId,
        },
        data: {
          emailVerified: true,
        },
      });

      await tx.emailVerificationToken.deleteMany({
        where: {
          userId: tokenRecord.userId,
          id: {
            not: tokenRecord.id,
          },
        },
      });

      return true;
    });

  if (!result) {
    return res.status(400).json({
      message:
        "This verification link has already been used or has expired",
    });
  }

  return res.json({
    message:
      "Email verified successfully",
    user: {
      id: tokenRecord.user.id,
      email: tokenRecord.user.email,
    },
  });
} catch (error) {
  console.error(
    "Email verification error:",
    error
  );

  return res.status(500).json({
    message: "Failed to verify email",
  });
}


}
);

/*

* =========================================================
* RESEND EMAIL VERIFICATION
* POST /api/auth/resend-verification
* =========================================================
  */

router.post(
"/resend-verification",
authRateLimiter,
async (req, res) => {
try {
const sessionId =
req.cookies?.techstore_session;


  if (
    typeof sessionId !== "string" ||
    sessionId.length === 0 ||
    sessionId.length > 200
  ) {
    return res.status(401).json({
      message: "Login required",
    });
  }

  const session =
    await prisma.session.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        user: true,
      },
    });

  if (!session) {
    res.clearCookie("techstore_session");

    return res.status(401).json({
      message: "Session not found",
    });
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.deleteMany({
      where: {
        id: session.id,
      },
    });

    res.clearCookie("techstore_session");

    return res.status(401).json({
      message:
        "Session expired. Please log in again.",
    });
  }

  if (session.user.emailVerified) {
    return res.json({
      message: "Email is already verified",
      emailVerified: true,
    });
  }

  await prisma.emailVerificationToken.deleteMany({
    where: {
      userId: session.userId,
      usedAt: null,
    },
  });

  const verificationToken =
    crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const expiresAt = new Date(
    Date.now() + 24 * 60 * 60 * 1000
  );

  await prisma.emailVerificationToken.create({
    data: {
      userId: session.userId,
      tokenHash,
      expiresAt,
    },
  });

  await sendEmailVerificationEmail(
    session.user.email,
    verificationToken
  );

  return res.json({
    message:
      "Verification email sent successfully",
  });
} catch (error) {
  console.error(
    "Resend verification error:",
    error
  );

  return res.status(500).json({
    message:
      "Failed to resend verification email",
  });
}


}
);

/*

* =========================================================
* CURRENT USER
* GET /api/auth/me
* =========================================================
  */

router.get(
"/me",
async (req, res) => {
try {
const sessionId =
req.cookies?.techstore_session;


  if (
    typeof sessionId !== "string" ||
    sessionId.length === 0 ||
    sessionId.length > 200
  ) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  const session =
    await prisma.session.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        user: true,
      },
    });

  if (!session) {
    res.clearCookie(
      "techstore_session"
    );

    return res.status(401).json({
      message: "Session not found",
    });
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.deleteMany({
      where: {
        id: session.id,
      },
    });

    res.clearCookie(
      "techstore_session"
    );

    return res.status(401).json({
      message: "Session expired",
    });
  }

  return res.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      emailVerified:
        session.user.emailVerified,
    },
  });
} catch (error) {
  console.error(
    "Session check error:",
    error
  );

  return res.status(500).json({
    message:
      "Failed to check authentication",
  });
}


}
);

/*

* =========================================================
* LOGOUT
* POST /api/auth/logout
* =========================================================
  */

router.post(
"/logout",
async (req, res) => {
try {
const sessionId =
req.cookies?.techstore_session;


  if (
    typeof sessionId === "string" &&
    sessionId.length > 0 &&
    sessionId.length <= 200
  ) {
    await prisma.session.deleteMany({
      where: {
        id: sessionId,
      },
    });
  }

  res.clearCookie(
    "techstore_session"
  );

  return res.json({
    message: "Logout successful",
  });
} catch (error) {
  console.error(
    "Logout error:",
    error
  );

  return res.status(500).json({
    message: "Logout failed",
  });
}


}
);

export default router;
