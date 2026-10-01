import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),

  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email is too long"),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password is too long"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email is too long"),

  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password is too long"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email is too long"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password is too long"),
});

/* CART */

export const addCartItemSchema = z.object({
  productId: z.coerce
    .number()
    .int()
    .positive("Product ID must be a positive integer"),

  quantity: z.coerce
    .number()
    .int()
    .min(1, "Quantity must be at least 1")
    .max(99, "Quantity cannot exceed 99"),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce
    .number()
    .int()
    .min(1, "Quantity must be at least 1")
    .max(99, "Quantity cannot exceed 99"),
});

/* ORDERS */

export const createOrderSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(100, "First name is too long"),

  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(100, "Last name is too long"),

  phone: z
    .string()
    .trim()
    .min(7, "Invalid phone number")
    .max(20, "Phone number is too long"),

  address: z
    .string()
    .trim()
    .min(1, "Address is required")
    .max(500, "Address is too long"),

  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .max(100, "City is too long"),

  state: z
    .string()
    .trim()
    .min(1, "State is required")
    .max(100, "State is too long"),

  pincode: z
    .string()
    .trim()
    .min(3, "Invalid pincode")
    .max(10, "Pincode is too long"),
});

/* PAYMENTS */

export const createPaymentSchema = z.object({
  orderId: z.coerce
    .number()
    .int()
    .positive("Order ID must be a positive integer"),
});

export const verifyPaymentSchema = z.object({
  orderId: z.coerce
    .number()
    .int()
    .positive("Order ID must be a positive integer"),

  razorpayOrderId: z
    .string()
    .trim()
    .min(1, "Razorpay order ID is required")
    .max(100, "Razorpay order ID is too long"),

  razorpayPaymentId: z
    .string()
    .trim()
    .min(1, "Razorpay payment ID is required")
    .max(100, "Razorpay payment ID is too long"),

  razorpaySignature: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{64}$/, "Invalid Razorpay signature"),
});

/* REVIEWS */

export const createReviewSchema = z.object({
  productId: z.coerce
    .number()
    .int()
    .positive("Product ID must be a positive integer"),

  rating: z.coerce
    .number()
    .int()
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),

  comment: z
    .string()
    .trim()
    .max(1000, "Review cannot exceed 1000 characters")
    .optional()
    .default(""),
});

export const updateReviewSchema = z.object({
  rating: z.coerce
    .number()
    .int()
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),

  comment: z
    .string()
    .trim()
    .max(1000, "Review cannot exceed 1000 characters")
    .optional()
    .default(""),
});

/* ADMIN PRODUCTS */

export const adminCreateProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Product name is required")
    .max(200, "Product name is too long"),

  price: z.coerce
    .number()
    .int()
    .min(0, "Price cannot be negative"),

  category: z
    .string()
    .trim()
    .min(1, "Category is required")
    .max(100, "Category is too long"),

  rating: z.coerce
    .number()
    .min(0, "Rating cannot be negative")
    .max(5, "Rating cannot exceed 5")
    .default(0),

  stock: z.coerce
    .number()
    .int()
    .min(0, "Stock cannot be negative"),

  image: z
    .string()
    .trim()
    .min(1, "Image is required")
    .max(1000, "Image path is too long"),

  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(5000, "Description is too long"),
});

export const adminUpdateProductSchema =
  adminCreateProductSchema.partial();

export const adminStockSchema = z.object({
  stock: z.coerce
    .number()
    .int()
    .min(0, "Stock must be a non-negative integer"),
});

export const adminActiveSchema = z.object({
  active: z.boolean({
    message: "Active must be a boolean",
  }),
});

export const adminOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ]),
});