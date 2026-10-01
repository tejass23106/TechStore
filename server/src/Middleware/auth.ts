import type { NextFunction, Request, Response } from "express";
import prisma from "../lib/prisma.js";

export interface AuthenticatedRequest extends Request {
userId?: number;
}

export async function requireAuth(
req: AuthenticatedRequest,
res: Response,
next: NextFunction
) {
try {
const sessionId = req.cookies?.techstore_session;

if (
  typeof sessionId !== "string" ||
  sessionId.length === 0 ||
  sessionId.length > 200
) {
  return res.status(401).json({
    message: "Authentication required",
  });
}

const session = await prisma.session.findUnique({
  where: {
    id: sessionId,
  },
  select: {
    id: true,
    userId: true,
    expiresAt: true,
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
    message: "Session expired",
  });
}

const user = await prisma.user.findUnique({
  where: {
    id: session.userId,
  },
  select: {
    id: true,
  },
});

if (!user) {
  await prisma.session.deleteMany({
    where: {
      id: session.id,
    },
  });

  res.clearCookie("techstore_session");

  return res.status(401).json({
    message: "User account not found",
  });
}

req.userId = session.userId;

return next();


} catch (error) {
console.error("Authentication middleware error:", error);


return res.status(500).json({
  message: "Authentication check failed",
});


}
}

export async function requireAdmin(
req: AuthenticatedRequest,
res: Response,
next: NextFunction
) {
try {
if (
typeof req.userId !== "number" ||
!Number.isInteger(req.userId) ||
req.userId <= 0
) {
return res.status(401).json({
message: "Authentication required",
});
}


const user = await prisma.user.findUnique({
  where: {
    id: req.userId,
  },
  select: {
    role: true,
  },
});

if (!user) {
  return res.status(401).json({
    message: "User not found",
  });
}

if (user.role !== "ADMIN") {
  return res.status(403).json({
    message: "Admin access required",
  });
}

return next();


} catch (error) {
console.error("Admin authorization error:", error);


return res.status(500).json({
  message: "Authorization check failed",
});


}
}
