import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import type { NextFunction, Request, Response } from "express";
import productsRouter from "./routes/products.js";
import authRouter from "./routes/auth.js";
import cartRouter from "./routes/cart.js";
import ordersRouter from "./routes/orders.js";
import paymentsRouter from "./routes/payments.js";
import wishlistRouter from "./routes/wishlist.js";
import reviewsRouter from "./routes/reviews.js";
import adminRouter from "./routes/admin.js";
import razorpayWebhookRouter from "./routes/razorpayWebhook.js";
import chatbotRouter from "./routes/chatbot.js";
import subscriptionRouter from "./routes/subscription.js";
import proFeaturesRouter from "./routes/proFeatures.js";

dotenv.config();

const app = express();

app.use(helmet());

const PORT = process.env.PORT || 5000;

const FRONTEND_URL =
process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
cors({
origin: FRONTEND_URL,
credentials: true,
})
);

app.use(
"/api/payments/webhook",
express.raw({
type: "application/json",
limit: "1mb",
}),
razorpayWebhookRouter
);

app.use(express.json());

app.use(cookieParser());

app.get("/", (_req, res) => {
res.json({
message: "TechStore API is running",
});
});

app.get("/api/health", (_req, res) => {
res.json({
status: "ok",
});
});

app.use("/api/products", productsRouter);
app.use("/api/auth", authRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/subscription", subscriptionRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/chatbot", chatbotRouter);
app.use("/api/pro", proFeaturesRouter);

// Handle unknown routes with a clean JSON response
app.use((_req: Request, res: Response) => {
return res.status(404).json({
message: "Route not found",
});
});

// Global error handler
app.use(
(
err: unknown,
_req: Request,
res: Response,
_next: NextFunction
) => {
if (
err &&
typeof err === "object" &&
"type" in err &&
err.type === "entity.parse.failed"
) {
return res.status(400).json({
message: "Invalid JSON request body",
});
}


console.error("Unhandled server error:", err);

return res.status(500).json({
  message: "Internal server error",
});


}
);

app.listen(PORT, () => {
console.log(
`TechStore server running on http://localhost:${PORT}`
);
});
