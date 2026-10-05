# TechStore

A modern full-stack e-commerce platform built with React, TypeScript, Express, Prisma, PostgreSQL, Razorpay, Gemini AI, and Resend.

TechStore is designed as a complete production-style e-commerce application rather than a static shopping website. It includes customer authentication, product browsing, cart management, wishlist, checkout, orders, Razorpay payments, reviews, administration, AI-assisted shopping, email services, database persistence, security controls, and cloud deployment.

---

# Table of Contents

* [1. Project Overview](#1-project-overview)
* [2. Project Goals](#2-project-goals)
* [3. Main Features](#3-main-features)
* [4. Technology Stack](#4-technology-stack)
* [5. Why Each Technology Is Used](#5-why-each-technology-is-used)
* [6. High-Level Architecture](#6-high-level-architecture)
* [7. Complete Application Flow](#7-complete-application-flow)
* [8. Frontend Architecture](#8-frontend-architecture)
* [9. Backend Architecture](#9-backend-architecture)
* [10. Database Architecture](#10-database-architecture)
* [11. Database Models](#11-database-models)
* [12. Authentication System](#12-authentication-system)
* [13. Registration Flow](#13-registration-flow)
* [14. Login and Session Flow](#14-login-and-session-flow)
* [15. Logout Flow](#15-logout-flow)
* [16. Email Verification](#16-email-verification)
* [17. Password Reset](#17-password-reset)
* [18. Product System](#18-product-system)
* [19. Cart System](#19-cart-system)
* [20. Wishlist System](#20-wishlist-system)
* [21. Checkout and Address System](#21-checkout-and-address-system)
* [22. Order System](#22-order-system)
* [23. Razorpay Payment System](#23-razorpay-payment-system)
* [24. Razorpay Webhooks](#24-razorpay-webhooks)
* [25. Payment and Stock Flow](#25-payment-and-stock-flow)
* [26. Review System](#26-review-system)
* [27. Admin System](#27-admin-system)
* [28. Customer and Admin Separation](#28-customer-and-admin-separation)
* [29. Gemini AI Shopping Assistant](#29-gemini-ai-shopping-assistant)
* [30. Database-First AI Product Search](#30-database-first-ai-product-search)
* [31. TechStore Pro AI](#31-techstore-pro-ai)
* [32. Email System](#32-email-system)
* [33. Security Architecture](#33-security-architecture)
* [34. Validation](#34-validation)
* [35. Rate Limiting](#35-rate-limiting)
* [36. CORS and Browser Request Protection](#36-cors-and-browser-request-protection)
* [37. Error Handling](#37-error-handling)
* [38. Project Structure](#38-project-structure)
* [39. Frontend Pages](#39-frontend-pages)
* [40. Frontend Components](#40-frontend-components)
* [41. Backend Routes](#41-backend-routes)
* [42. API Reference](#42-api-reference)
* [43. Environment Variables](#43-environment-variables)
* [44. Local Development Setup](#44-local-development-setup)
* [45. Database Setup](#45-database-setup)
* [46. Running the Frontend](#46-running-the-frontend)
* [47. Running the Backend](#47-running-the-backend)
* [48. Building for Production](#48-building-for-production)
* [49. Production Architecture](#49-production-architecture)
* [50. Deployment](#50-deployment)
* [51. Testing](#51-testing)
* [52. Mobile and Responsive Testing](#52-mobile-and-responsive-testing)
* [53. End-to-End Customer Flow](#53-end-to-end-customer-flow)
* [54. End-to-End Admin Flow](#54-end-to-end-admin-flow)
* [55. Complete Payment Sequence](#55-complete-payment-sequence)
* [56. Complete AI Sequence](#56-complete-ai-sequence)
* [57. Important Design Decisions](#57-important-design-decisions)
* [58. Known Limitations](#58-known-limitations)
* [59. Troubleshooting](#59-troubleshooting)
* [60. Future Improvements](#60-future-improvements)
* [61. Current Project Status](#61-current-project-status)
* [62. Production URLs](#62-production-urls)
* [63. Git Workflow](#63-git-workflow)
* [64. How to Explain This Project in an Interview](#64-how-to-explain-this-project-in-an-interview)
* [65. License](#65-license)

---

# 1. Project Overview

TechStore is a full-stack e-commerce web application for selling technology products.

The application provides two primary experiences:

### Customer

A customer can:

* Create an account
* Log in
* Verify their email
* Reset their password
* Browse products
* View product details
* Add products to cart
* Change cart quantities
* Remove products
* Clear the cart
* Manage wishlist
* Enter checkout information
* Create orders
* Pay using Razorpay
* View orders
* View individual order details
* Submit product reviews after purchasing
* Update and delete their reviews
* Use the AI shopping assistant
* View their account information

### Administrator

An administrator can:

* Access the admin dashboard
* Manage products
* Manage product stock
* Activate/deactivate products
* Manage orders
* Update order status
* Manage reviews
* View registered users and their order information where supported by the administration interface
* Access administrative information unavailable to normal customers

The backend enforces authorization, so hiding the admin interface on the frontend is not the only protection.

---

# 2. Project Goals

The main goals of TechStore are:

1. Build a complete full-stack e-commerce application.
2. Use a real relational database rather than static frontend data.
3. Implement secure authentication and sessions.
4. Implement persistent carts and wishlists.
5. Implement real order creation.
6. Integrate real Razorpay payments.
7. Verify payments securely on the server.
8. Prevent unauthorized access to customer data.
9. Implement admin/customer role separation.
10. Implement verified-purchase reviews.
11. Integrate an AI shopping assistant.
12. Provide database-backed AI product information.
13. Implement email-based account functionality.
14. Deploy the application to production.
15. Test the complete customer purchasing flow.
16. Make the application responsive across desktop and mobile devices.

---

# 3. Main Features

## Customer Features

* Registration
* Login
* Logout
* Session authentication
* Email verification
* Forgot password
* Password reset
* Product catalog
* Product details
* Product availability
* Shopping cart
* Cart quantity management
* Wishlist
* Checkout
* Address information
* Order creation
* Razorpay payment
* Payment verification
* Order history
* Order details
* Product reviews
* Review editing
* Review deletion
* AI shopping assistant
* Account page
* Responsive UI

## Admin Features

* Admin authentication
* Admin-only route protection
* Product creation
* Product editing
* Product activation/deactivation
* Stock management
* Order management
* Order status management
* Review management
* Administrative access controls

## AI Features

* Product search
* Category detection
* Budget detection
* Product comparison
* Product recommendations
* Cart queries
* Add product to cart through natural language
* Remove product from cart through natural language
* Clear cart through natural language
* Gemini function calling
* Database-first product search
* Gemini quota fallback

## Payment Features

* Razorpay order creation
* Razorpay Checkout
* Payment signature verification
* Payment amount verification
* Payment currency verification
* Razorpay payment-status verification
* Payment ownership verification
* Payment idempotency
* Stock deduction after successful payment
* Cart clearing after successful payment
* Payment confirmation email
* Razorpay webhook processing
* Webhook event idempotency

## Security Features

* bcrypt password hashing
* HTTP-only session cookies
* Secure production cookies
* Session expiration
* Session invalidation
* Password reset token hashing
* Email verification token hashing
* Zod validation
* Authentication rate limiting
* General API rate limiting
* Chatbot rate limiting
* Helmet
* CORS
* Origin/CSRF-style browser request protection
* Role-based authorization
* Ownership checks
* Razorpay signature verification
* Webhook signature verification
* Webhook idempotency
* Production-safe error responses

---

# 4. Technology Stack

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* React Router
* React Markdown

## Backend

* Node.js
* Express
* TypeScript
* Prisma ORM

## Database

* PostgreSQL
* Neon PostgreSQL in production

## Authentication

* Custom session-based authentication
* bcrypt
* HTTP-only cookies
* Database-backed sessions

## Payments

* Razorpay

## AI

* Google Gemini API
* `@google/genai`

## Email

* Resend

## Validation

* Zod

## Security

* Helmet
* CORS
* express-rate-limit
* Node.js crypto

## Hosting

* Vercel for frontend
* Render for backend
* Neon for PostgreSQL

---

# 5. Why Each Technology Is Used

## React

Used to build the interactive frontend.

React handles:

* Pages
* Components
* Forms
* Product interfaces
* Cart UI
* Authentication UI
* Admin UI
* Chatbot UI

## TypeScript

Provides static typing across the frontend and backend.

This reduces common runtime mistakes and makes the project easier to maintain.

## Vite

Used as the frontend build tool and development server.

## Tailwind CSS

Used for responsive styling and UI layout.

## Express

Used to build the REST API backend.

## Prisma

Used as the ORM between the TypeScript backend and PostgreSQL database.

## PostgreSQL

Stores persistent application data such as:

* Users
* Products
* Sessions
* Carts
* Orders
* Reviews
* Wishlists
* Addresses
* Payment information
* Webhook events

## Razorpay

Handles payment processing.

The server does not trust frontend payment information blindly. Payment data is verified against Razorpay before the order is marked paid.

## Gemini

Provides AI capabilities for:

* Natural-language shopping assistance
* Cart operations
* Product recommendations
* Conversational interactions

## Resend

Used for transactional emails such as:

* Verification
* Password reset
* Order/payment notifications
* Other application emails

---

# 6. High-Level Architecture

```text
                    CUSTOMER
                       |
                       v
             +-------------------+
             |  React Frontend   |
             | Vite + TypeScript |
             | Tailwind CSS      |
             +---------+---------+
                       |
                       | HTTPS / REST API
                       v
             +-------------------+
             | Express Backend   |
             | Node + TypeScript |
             +---------+---------+
                       |
          +------------+-------------+
          |            |             |
          v            v             v
      PostgreSQL    Razorpay      Gemini
       / Neon        Payments        AI
          |
          v
       Prisma ORM

Additional external service:

Express Backend
       |
       v
     Resend
       |
       v
     Email
```

---

# 7. Complete Application Flow

The general application flow is:

```text
User
 |
 v
Vercel React Frontend
 |
 v
Express REST API
 |
 +---- Authentication
 |
 +---- Products
 |
 +---- Cart
 |
 +---- Wishlist
 |
 +---- Orders
 |
 +---- Reviews
 |
 +---- Admin
 |
 +---- Chatbot
 |
 +---- Payments
 |
 v
Prisma ORM
 |
 v
Neon PostgreSQL
```

External integrations:

```text
Backend
 |
 +---- Razorpay
 |
 +---- Gemini
 |
 +---- Resend
```

The frontend does not directly modify the PostgreSQL database.

The frontend communicates with the backend API.

The backend performs authorization, validation, business logic, and database operations.

---

# 8. Frontend Architecture

The frontend is a React single-page application.

Important frontend areas include:

```text
src/
├── App.tsx
├── main.tsx
├── index.css
│
├── components/
│   ├── AdminRoute.tsx
│   ├── Chatbot.tsx
│   ├── Footer.tsx
│   ├── Navbar.tsx
│   └── ProductCard.tsx
│
├── contexts/
│   ├── AuthContext.tsx
│   ├── CartContext.tsx
│   └── WishlistContext.tsx
│
├── layouts/
│   └── MainLayout.tsx
│
├── lib/
│   └── api.ts
│
├── pages/
│   ├── About.tsx
│   ├── Account.tsx
│   ├── Admin.tsx
│   ├── Cart.tsx
│   ├── Checkout.tsx
│   ├── ForgotPassword.tsx
│   ├── Home.tsx
│   ├── Login.tsx
│   ├── NotFound.tsx
│   ├── OrderDetails.tsx
│   ├── Orders.tsx
│   ├── ProductDetails.tsx
│   ├── Products.tsx
│   ├── Register.tsx
│   └── Wishlist.tsx
│
└── data/
    └── products.ts
```

---

# 9. Backend Architecture

The backend follows a route + middleware + library structure.

```text
server/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
└── src/
    ├── server.ts
    │
    ├── routes/
    │   ├── auth.ts
    │   ├── products.ts
    │   ├── cart.ts
    │   ├── wishlist.ts
    │   ├── orders.ts
    │   ├── payments.ts
    │   ├── razorpayWebhook.ts
    │   ├── reviews.ts
    │   ├── admin.ts
    │   ├── chatbot.ts
    │   ├── subscription.ts
    │   └── proFeatures.ts
    │
    ├── Middleware/
    │   ├── auth.ts
    │   ├── proAuth.ts
    │   ├── rateLimit.ts
    │   ├── validate.ts
    │   └── validation.ts
    │
    ├── lib/
    │   ├── prisma.ts
    │   ├── chatbot.ts
    │   └── email.ts
    │
    └── chatbot/
        └── tools.ts
```

---

# 10. Database Architecture

Prisma connects the Express backend to PostgreSQL.

The application uses relational data.

The main relationships are:

```text
User
 |
 +---- Session
 |
 +---- PasswordResetToken
 |
 +---- EmailVerificationToken
 |
 +---- Cart
 |       |
 |       +---- CartItem ---- Product
 |
 +---- Address
 |       |
 |       +---- Order
 |
 +---- Order
 |       |
 |       +---- OrderItem ---- Product
 |
 +---- WishlistItem ---- Product
 |
 +---- Review ---- Product
 |
 +---- Subscription
```

Products are also referenced by carts, orders, wishlists, and reviews.

---

# 11. Database Models

## Product

Stores the store catalog.

Important fields:

* `id`
* `name`
* `price`
* `category`
* `rating`
* `reviews`
* `stock`
* `image`
* `description`
* `active`
* `createdAt`
* `updatedAt`

`active` allows a product to be disabled without deleting it.

---

## User

Stores customer/admin accounts.

Important fields:

* `id`
* `name`
* `email`
* `passwordHash`
* `role`
* `emailVerified`
* `createdAt`
* `updatedAt`

Roles:

```text
USER
ADMIN
```

Passwords are never stored directly.

Only password hashes are stored.

---

## Session

Stores authenticated sessions.

Fields:

* `id`
* `userId`
* `expiresAt`
* `createdAt`

The session ID is stored in the HTTP-only cookie.

---

## PasswordResetToken

Used for password recovery.

The database stores a hash of the reset token rather than the raw token.

The token also has:

* expiration
* used status
* user relationship

---

## EmailVerificationToken

Used to verify user email addresses.

Like password reset tokens, the database stores the token hash.

---

## Cart

Represents one persistent cart for a user.

A user has at most one cart.

---

## CartItem

Connects a product to a cart.

Fields:

* cart
* product
* quantity

A unique constraint prevents duplicate product rows inside the same cart.

---

## WishlistItem

Connects users and products.

A user cannot add the same product to their wishlist twice.

---

## Address

Stores checkout/customer address information.

Fields include:

* first name
* last name
* phone
* address
* city
* state
* pincode
* default-address flag

---

## Order

Stores the customer's purchase.

Important fields include:

* user
* address
* status
* payment status
* subtotal
* delivery fee
* total
* Razorpay order ID
* Razorpay payment ID
* Razorpay signature
* refund amount
* timestamps

---

## OrderItem

Stores the products belonging to an order.

The important design decision is that `unitPrice` is stored with the order item.

This preserves the price that applied when the order was created rather than depending on the product's current price.

---

## Review

Stores customer product reviews.

A unique constraint prevents a user from creating multiple reviews for the same product.

---

## Subscription

The database contains subscription/Pro support.

It supports:

* FREE
* PRO

and:

* ACTIVE
* EXPIRED
* CANCELLED

> Note: Subscription and recurring Razorpay functionality exists in the
> codebase as an extended/experimental feature, but recurring subscriptions
> are not part of the current production scope.

---

## RazorpayWebhookEvent

Stores processed Razorpay webhook event IDs.

This provides webhook idempotency and prevents processing the same event multiple times.

---

# 12. Authentication System

TechStore uses custom session-based authentication.

It does not store a JWT in localStorage.

The basic model is:

```text
Login
  |
  v
Backend verifies password
  |
  v
Create database Session
  |
  v
Send HTTP-only cookie
  |
  v
Browser stores cookie
  |
  v
Future requests include cookie
  |
  v
Backend looks up session
  |
  v
Authenticated user
```

This makes the server the source of truth for authentication.

---

# 13. Registration Flow

```text
User opens Register
        |
        v
Enters name/email/password
        |
        v
Frontend sends registration request
        |
        v
Zod validation
        |
        v
Check whether email already exists
        |
        v
Hash password using bcrypt
        |
        v
Create User
        |
        v
Create email verification token
        |
        v
Attempt to send verification email
        |
        v
Account created
```

The account can exist even if email delivery is temporarily unavailable.

The account remains marked as unverified until verification succeeds.

---

# 14. Login and Session Flow

```text
Login form
   |
   v
POST /api/auth/login
   |
   v
Validate email/password
   |
   v
Find user
   |
   v
bcrypt password comparison
   |
   v
Create cryptographically random session ID
   |
   v
Store session in PostgreSQL
   |
   v
Set HTTP-only cookie
   |
   v
Authenticated frontend
```

The production cookie is configured with:

* `httpOnly`
* `secure`
* `sameSite`
* expiration
* `/` path

---

# 15. Logout Flow

```text
User clicks Logout
       |
       v
Backend receives session cookie
       |
       v
Session is deleted/invalidated
       |
       v
Cookie is cleared
       |
       v
Frontend returns to unauthenticated state
```

---

# 16. Email Verification

The verification system uses a temporary token.

Flow:

```text
Registration
    |
    v
Generate random verification token
    |
    v
Hash token
    |
    v
Store hash + expiration
    |
    v
Send verification email
    |
    v
User clicks verification link
    |
    v
Backend hashes submitted token
    |
    v
Find matching token
    |
    v
Check expiration/used status
    |
    v
Mark user emailVerified = true
    |
    v
Mark token used
```

The raw verification token is not stored in the database.

---

# 17. Password Reset

Flow:

```text
Forgot Password
       |
       v
Enter email
       |
       v
Backend generates reset token
       |
       v
Hash token
       |
       v
Store hash + expiration
       |
       v
Send reset email
       |
       v
User opens reset link
       |
       v
Backend verifies token
       |
       v
New password
       |
       v
bcrypt hash
       |
       v
Update password
       |
       v
Invalidate old sessions
       |
       v
Token becomes unusable
```

Reset tokens are:

* hashed
* expiring
* single-use

---

# 18. Product System

Products are stored in PostgreSQL.

The backend exposes active products through:

```text
GET /api/products
```

Individual products:

```text
GET /api/products/:id
```

Only active products are returned to normal customers.

A product contains:

```text
Name
Price
Category
Rating
Review count
Stock
Image
Description
Active status
```

---

# 19. Cart System

The cart is database-backed.

A customer must be authenticated to use the backend cart.

### Add item

```text
POST /api/cart/items
```

The backend:

1. Validates the product ID.
2. Validates quantity.
3. Finds the active product.
4. Checks stock.
5. Creates the cart if necessary.
6. Checks whether the product already exists.
7. Increases the quantity or creates the item.
8. Ensures the resulting quantity does not exceed stock.

### Update quantity

```text
PATCH /api/cart/items/:productId
```

The backend checks:

* product exists
* product is active
* requested quantity is valid
* requested quantity does not exceed stock
* cart belongs to the authenticated user
* cart item exists

### Remove item

```text
DELETE /api/cart/items/:productId
```

### Clear cart

```text
DELETE /api/cart
```

---

# 20. Wishlist System

Wishlist operations require authentication.

### Get wishlist

```text
GET /api/wishlist
```

### Add product

```text
POST /api/wishlist/:productId
```

### Remove product

```text
DELETE /api/wishlist/:productId
```

The database has a unique constraint on:

```text
userId + productId
```

so duplicate wishlist entries are prevented.

---

# 21. Checkout and Address System

The checkout page collects:

* First name
* Last name
* Phone
* Address
* City
* State
* Pincode

The backend validates checkout data before creating an order.

The order stores a reference to the address.

Address ownership is tied to the authenticated user.

---

# 22. Order System

An order begins as:

```text
status = PENDING
paymentStatus = PENDING
```

After successful payment:

```text
status = CONFIRMED
paymentStatus = PAID
```

Possible order statuses:

```text
PENDING
CONFIRMED
PROCESSING
SHIPPED
DELIVERED
CANCELLED
```

Possible payment statuses:

```text
PENDING
PAID
FAILED
REFUNDED
```

Customers can only retrieve their own orders.

---

# 23. Razorpay Payment System

TechStore uses Razorpay for one-time product payments.

The backend never trusts the frontend's payment-success message by itself.

The payment flow is:

```text
Customer Checkout
       |
       v
Create TechStore Order
       |
       v
POST /api/payments/create
       |
       v
Verify order ownership
       |
       v
Create Razorpay Order
       |
       v
Razorpay Checkout
       |
       v
Customer completes payment
       |
       v
Razorpay returns payment information
       |
       v
POST /api/payments/verify
```

---

# 24. Razorpay Webhooks

Razorpay webhooks provide server-to-server payment events.

The webhook endpoint is mounted before the normal JSON parser so the raw request body can be used for signature verification.

Conceptually:

```text
Razorpay
    |
    | Webhook
    v
POST /api/payments/webhook
    |
    v
Verify webhook signature
    |
    v
Check event ID
    |
    v
Check whether already processed
    |
    v
Process event
    |
    v
Mark event processed
```

The `RazorpayWebhookEvent` database table prevents duplicate event processing.

---

# 25. Payment and Stock Flow

Successful payment is handled as a protected transaction.

```text
Payment received
       |
       v
Verify user owns order
       |
       v
Verify Razorpay order ID
       |
       v
Verify HMAC signature
       |
       v
Fetch Razorpay order
       |
       v
Verify amount
       |
       v
Verify currency
       |
       v
Fetch Razorpay payment
       |
       v
Verify payment belongs to Razorpay order
       |
       v
Verify payment amount
       |
       v
Verify payment is captured
       |
       v
Database transaction
       |
       +---- Check stock
       |
       +---- Deduct stock
       |
       +---- Mark order PAID
       |
       +---- Mark order CONFIRMED
       |
       +---- Store payment ID
       |
       +---- Store signature
       |
       +---- Clear cart
       |
       v
Payment confirmation email
```

This is one of the most important flows in the application.

The backend does not simply trust:

```text
"payment successful"
```

from the browser.

It verifies the payment against Razorpay.

---

# 26. Review System

Reviews are restricted to customers who actually purchased the product.

To submit a review:

```text
User logged in
      |
      v
Product purchased?
      |
      v
Payment status = PAID
      |
      v
Order not cancelled
      |
      v
Review allowed
```

A customer can only have one review per product.

The rating is constrained between:

```text
1 and 5
```

Review comments are limited to 1000 characters.

When a review is created, updated, or deleted, the product rating and review count are recalculated.

Review operations use database transactions with serializable isolation and retry handling for transaction conflicts.

---

# 27. Admin System

The admin system is protected at two levels.

### Frontend

`AdminRoute` checks whether the authenticated user has the required role.

### Backend

The API uses:

```text
requireAuth
    +
requireAdmin
```

The backend is therefore the final authorization layer.

A normal customer cannot become an administrator simply by manually navigating to the admin URL.

---

# 28. Customer and Admin Separation

Roles are stored in the database:

```text
USER
ADMIN
```

Example:

```text
Customer
   |
   +---- Products
   +---- Cart
   +---- Wishlist
   +---- Checkout
   +---- Orders
   +---- Reviews
   +---- Chatbot

Admin
   |
   +---- Everything allowed to a customer
   |
   +---- Admin Dashboard
   +---- Product management
   +---- Stock management
   +---- Order management
   +---- Administrative operations
```

The backend checks the actual database role.

---

# 29. Gemini AI Shopping Assistant

TechStore includes an AI shopping assistant called TechStore AI.

The chatbot is connected to the backend rather than directly to the database.

The backend provides controlled tools to Gemini.

Available tools include:

```text
searchProducts
getCart
addToCart
removeFromCart
clearCart
```

Gemini is instructed not to invent:

* products
* prices
* ratings
* stock
* cart contents
* quantities
* totals
* product details

The application treats the database as the source of truth for store information.

---

# 30. Database-First AI Product Search

A major architectural improvement was made to prevent product searches from depending completely on Gemini availability.

For example:

```text
"Show me laptops"
```

does not necessarily need Gemini.

The backend detects product intent and directly queries PostgreSQL through Prisma.

Examples include:

```text
Show me laptops
Show me phones
Find phones under ₹50,000
Show gaming products
Compare available phones
Show products under ₹10,000
```

The flow becomes:

```text
User
 |
 v
Chatbot
 |
 v
Detect product intent
 |
 v
Prisma / PostgreSQL
 |
 v
Verified products
 |
 v
Formatted response
```

This means catalog search can continue working even if Gemini's free-tier quota is exhausted.

---

# 31. TechStore Pro AI

The repository contains a Pro subscription architecture and Pro AI recommendation endpoint.

The Pro recommendation flow is:

```text
Authenticated Pro user
        |
        v
Pro authorization middleware
        |
        v
User requirement + optional budget
        |
        v
Fetch active products from PostgreSQL
        |
        v
Rank catalog candidates
        |
        v
Send verified catalog to Gemini
        |
        v
Gemini generates recommendation
        |
        v
Return recommendation + products
```

The AI is explicitly instructed to recommend only products supplied by the database.

The subscription infrastructure exists in the repository, but recurring Pro subscription is not treated as the main active production scope.

---

# 32. Email System

The backend contains a reusable email layer.

Email functionality is used for application events such as:

* Email verification
* Password reset
* Payment confirmation
* Order-related communication
* Pro-related communication where applicable

Resend is used as the email provider.

The sender address is configured through environment variables.

A production limitation currently exists with Resend's unverified-domain/testing configuration: sending to arbitrary external recipients requires an appropriately verified sending domain.

The application is therefore designed so that email delivery failure does not unnecessarily break core account creation/payment flows.

### Email delivery note

TechStore uses Resend for transactional email delivery.

Without a verified sending domain, Resend's production sending restrictions
may limit verification emails to the account owner's email address.

The application still allows account creation when email delivery is
temporarily unavailable, while keeping the account unverified until
verification is completed.

---

# 33. Security Architecture

Security was treated as a backend responsibility rather than a frontend-only feature.

Important controls include:

### Password hashing

Passwords are hashed with bcrypt.

### Session security

Session IDs are generated securely and stored server-side.

### HTTP-only cookies

The authentication cookie is inaccessible to normal frontend JavaScript.

### Secure production cookies

Production cookies use secure transport settings.

### Authorization

Every protected resource checks the authenticated user.

### Admin authorization

Admin APIs verify the database role.

### Ownership checks

Customers cannot access another customer's:

* cart
* orders
* payment records
* reviews

### Payment verification

Razorpay signatures are verified using HMAC SHA-256.

### Webhook verification

Webhook requests are signature verified.

### Validation

Zod validates important request bodies.

### Helmet

HTTP security headers are configured using Helmet.

### CORS

The backend restricts browser API access to the configured frontend origin.

### Rate limiting

API, authentication, and chatbot traffic have rate limits.

---

# 34. Validation

Zod schemas are used for important inputs.

Validation includes:

## Authentication

* name
* email
* password
* reset tokens

## Cart

* product ID
* quantity

## Orders

* name
* phone
* address
* city
* state
* pincode

## Payments

* order ID
* Razorpay order ID
* payment ID
* signature

## Reviews

* product ID
* rating
* comment

## Admin products

* name
* price
* category
* rating
* stock
* image
* description

Validation prevents malformed requests from reaching business logic.

---

# 35. Rate Limiting

TechStore uses `express-rate-limit`.

There are separate limits for:

### General API

Limits excessive API requests.

### Authentication

Protects login/registration-related endpoints against excessive attempts.

### Chatbot

Protects the AI endpoint from abuse and unnecessary Gemini requests.

Rate limiting is particularly important for the chatbot because Gemini is an external paid/quota-controlled service.

---

# 36. CORS and Browser Request Protection

The backend uses CORS with credentials.

The configured frontend origin is allowed to communicate with the API.

State-changing browser requests are also checked for an expected `Origin`.

The Razorpay webhook is mounted before this middleware because webhook requests originate from Razorpay rather than the browser frontend.

This prevents the browser-facing CSRF/origin protection from incorrectly blocking the webhook.

---

# 37. Error Handling

The server has centralized handling for unknown routes and unexpected errors.

Invalid JSON is handled separately.

Production responses avoid unnecessarily exposing internal server details.

The backend logs technical errors while returning controlled messages to the client.

Example:

```text
Internal server error
```

rather than returning database internals or stack traces to customers.

---

# 38. Project Structure

High-level structure:

```text
TechStore/
│
├── public/
│
├── src/
│   ├── components/
│   ├── contexts/
│   ├── data/
│   ├── layouts/
│   ├── lib/
│   ├── pages/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
│
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   ├── src/
│   │   ├── chatbot/
│   │   ├── lib/
│   │   ├── Middleware/
│   │   ├── routes/
│   │   └── server.ts
│   │
│   └── package.json
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vercel.json
```

---

# 39. Frontend Pages

## Home

Main landing page for TechStore.

## Products

Displays the product catalog.

## Product Details

Displays detailed information for a selected product.

## Cart

Shows:

* selected products
* quantities
* prices
* totals
* removal/update controls

## Login

Customer authentication.

## Register

New customer registration.

## Forgot Password

Starts the password-reset process.

## Checkout

Collects delivery information and starts the order/payment process.

## Orders

Shows authenticated user's orders.

## Order Details

Shows a particular order and its products/status/payment information.

## Wishlist

Shows saved products.

## Account

Shows customer account information and account-related controls.

## Admin

Administrative dashboard.

## About

Project/company information.

## Not Found

Fallback route for unknown frontend paths.

---

# 40. Frontend Components

## Navbar

Main application navigation.

It changes available actions depending on authentication state and user role.

## Footer

Application footer.

## ProductCard

Reusable product display component.

## Chatbot

AI shopping assistant UI.

It supports:

* messages
* Markdown responses
* example prompts
* loading state
* user interaction

The chatbot also displays rotating example prompts such as:

```text
Show me laptops
Find phones under ₹50,000
Add a product to the cart
Show me my cart
Compare available phones
```

## AdminRoute

Protects the frontend admin route.

## MainLayout

Provides common application layout.

---

# 41. Backend Routes

The main backend route groups are:

```text
/api/auth
/api/products
/api/cart
/api/wishlist
/api/orders
/api/payments
/api/payments/webhook
/api/reviews
/api/admin
/api/chatbot
/api/subscription
/api/pro
```

---

# 42. API Reference

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/forgot-password
POST /api/auth/reset-password
...
```

Authentication routes also support email-verification functionality implemented in the authentication module.

---

## Products

```text
GET /api/products
GET /api/products/:id
```

---

## Cart

```text
GET    /api/cart
POST   /api/cart/items
PATCH  /api/cart/items/:productId
DELETE /api/cart/items/:productId
DELETE /api/cart
```

---

## Wishlist

```text
GET    /api/wishlist
POST   /api/wishlist/:productId
DELETE /api/wishlist/:productId
```

---

## Orders

```text
GET  /api/orders
GET  /api/orders/:id
POST /api/orders
```

Order creation requires authentication.

---

## Payments

```text
POST /api/payments/create
POST /api/payments/verify
```

---

## Webhook

```text
POST /api/payments/webhook
```

---

## Reviews

```text
GET    /api/reviews/product/:productId
GET    /api/reviews/product/:productId/my-review
POST   /api/reviews
PUT    /api/reviews/:id
DELETE /api/reviews/:id
```

---

## Admin

The admin route provides protected administrative product, stock, order, review, and user operations according to the current admin implementation.

All admin operations require authenticated admin authorization.

---

## Chatbot

```text
POST /api/chatbot
```

---

## Subscription

The repository contains:

```text
POST /api/subscription/create
GET  /api/subscription/status
```

These support the Pro subscription architecture.

---

## Pro AI

```text
POST /api/pro/recommendations
```

Requires Pro authorization.

---

# 43. Environment Variables

The backend requires environment configuration similar to:

```env
DATABASE_URL=your_postgresql_connection_string

FRONTEND_URL=https://tech-store-seven-brown.vercel.app

RESEND_API_KEY=your_resend_api_key

FROM_EMAIL=your_sender_email

GEMINI_API_KEY=your_gemini_api_key

RAZORPAY_KEY_ID=your_razorpay_key_id

RAZORPAY_KEY_SECRET=your_razorpay_key_secret

RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

RAZORPAY_PRO_PLAN_ID=your_razorpay_pro_plan_id
```

Never commit real credentials to GitHub.

Never place secret keys in frontend code.

---

# 44. Local Development Setup

## Requirements

Recommended environment:

* Node.js
* npm
* PostgreSQL database
* Git
* A code editor/IDE such as Antigravity
* Razorpay account for payment testing
* Gemini API key for AI
* Resend API key for email functionality

---

## Clone the repository

```powershell
git clone https://github.com/tejass23106/TechStore.git
cd TechStore
```

---

# 45. Database Setup

Enter the backend:

```powershell
cd server
```

Install dependencies:

```powershell
npm install
```

Configure:

```env
DATABASE_URL=...
```

Generate Prisma Client:

```powershell
npx prisma generate
```

Run the required database migrations/schema workflow for the current Prisma setup.

Seed the database if the seed configuration is being used:

```powershell
npx prisma db seed
```

The project uses Prisma as the database abstraction layer.

---

# 46. Running the Frontend

From:

```text
D:\projects\stack_website\techstore
```

install dependencies:

```powershell
npm install
```

Start development:

```powershell
npm run dev
```

The Vite development server normally runs at:

```text
http://localhost:5173
```

---

# 47. Running the Backend

From:

```powershell
cd D:\projects\stack_website\techstore\server
```

run:

```powershell
npm install
npm run dev
```

The backend normally runs on:

```text
http://localhost:5000
```

The health endpoint is:

```text
/api/health
```

For example:

```text
http://localhost:5000/api/health
```

Expected response:

```json
{
  "status": "ok"
}
```

---

# 48. Building for Production

Frontend:

```powershell
cd D:\projects\stack_website\techstore
npm run build
```

Backend:

```powershell
cd D:\projects\stack_website\techstore\server
npm run build
```

Both builds should complete without TypeScript/build errors before deployment.

---

# 49. Production Architecture

Current production architecture:

```text
                 Internet
                    |
                    v
       +-------------------------+
       | Vercel                  |
       | React + Vite Frontend   |
       +------------+------------+
                    |
                    | HTTPS
                    v
       +-------------------------+
       | Render                  |
       | Express + TypeScript    |
       +------------+------------+
                    |
          +---------+---------+
          |         |         |
          v         v         v
       Neon      Razorpay   Gemini
    PostgreSQL     API        API
          |
          |
       Prisma

Render
   |
   v
Resend
   |
   v
Email
```

---

# 50. Deployment

## Frontend

The frontend is deployed on Vercel.

Production frontend:

```text
https://tech-store-seven-brown.vercel.app/
```

Vercel handles the frontend build and deployment.

---

## Backend

The backend is deployed on Render.

Production backend:

```text
https://techstore-backend-ds0f.onrender.com
```

The backend exposes:

```text
https://techstore-backend-ds0f.onrender.com/api
```

---

## Database

Production PostgreSQL is hosted using Neon.

The backend connects through Prisma.

---

# 51. Testing

The application has been tested across the major customer and administrative flows.

Testing includes:

* Authentication
* Login
* Logout
* Products
* Product details
* Cart
* Cart quantities
* Cart removal
* Checkout
* Razorpay payment
* Order creation
* Payment verification
* Stock deduction
* Cart clearing
* Orders
* Wishlist
* Reviews
* Admin access
* Admin/customer separation
* Chatbot
* Production deployment

---

# 52. Mobile and Responsive Testing

The frontend was checked using browser responsive/device emulation.

Tested viewport categories include:

```text
375 × 667
390 × 844
768 × 1024
1280 × 720
```

The application was checked for:

* horizontal overflow
* content leaving the viewport
* navigation issues
* product-card sizing
* button sizing
* form width
* image overflow
* chatbot placement
* checkout layout
* page spacing

The final mobile audit confirmed that the pages remain within the viewport without horizontal overflow.

---

# 53. End-to-End Customer Flow

A complete customer purchase can be understood as:

```text
Register
   |
   v
Login
   |
   v
Browse Products
   |
   v
Open Product
   |
   v
Add to Cart
   |
   v
Open Cart
   |
   v
Adjust Quantity
   |
   v
Checkout
   |
   v
Enter Address
   |
   v
Create Order
   |
   v
Create Razorpay Order
   |
   v
Razorpay Checkout
   |
   v
Complete Payment
   |
   v
Verify Payment
   |
   v
Confirm Order
   |
   +---- Deduct Stock
   |
   +---- Clear Cart
   |
   +---- Send Payment Email
   |
   v
My Orders
   |
   v
Open Order Details
   |
   v
Review Purchased Product
```

---

# 54. End-to-End Admin Flow

```text
Admin Login
     |
     v
Admin Role Checked
     |
     v
Admin Dashboard
     |
     +---- Products
     |       |
     |       +---- Create
     |       +---- Update
     |       +---- Activate/Deactivate
     |       +---- Stock
     |
     +---- Orders
     |       |
     |       +---- View
     |       +---- Update status
     |
     +---- Reviews
     |
     +---- Administrative operations
```

The backend independently verifies administrator authorization.

---

# 55. Complete Payment Sequence

```text
1. Customer adds product to cart
             |
2. Customer opens checkout
             |
3. Backend creates pending TechStore order
             |
4. Frontend requests Razorpay order
             |
5. Backend verifies order ownership
             |
6. Backend creates Razorpay order
             |
7. Razorpay Checkout opens
             |
8. Customer pays
             |
9. Razorpay returns payment information
             |
10. Frontend sends payment data to backend
             |
11. Backend verifies signature
             |
12. Backend verifies Razorpay order
             |
13. Backend verifies amount
             |
14. Backend verifies currency
             |
15. Backend verifies payment belongs to order
             |
16. Backend verifies payment is captured
             |
17. Database transaction starts
             |
18. Stock is checked
             |
19. Stock is decremented
             |
20. Order becomes CONFIRMED
             |
21. Payment becomes PAID
             |
22. Cart is cleared
             |
23. Transaction completes
             |
24. Payment confirmation email is attempted
```

This architecture prevents a client-side payment-success response from being sufficient to mark an order as paid.

---

# 56. Complete AI Sequence

For a normal product search:

```text
User
 |
 v
Chatbot UI
 |
 v
POST /api/chatbot
 |
 v
Backend analyzes intent
 |
 v
Is this a product search?
 |
 +---- YES
 |      |
 |      v
 |   Detect category
 |   Detect minimum price
 |   Detect maximum price
 |      |
 |      v
 |   Prisma
 |      |
 |      v
 |   PostgreSQL
 |      |
 |      v
 |   Verified product data
 |      |
 |      v
 |   Response
 |
 +---- NO
        |
        v
     Gemini
        |
        v
     Function calling
        |
        v
     Backend tool
        |
        v
     Database
        |
        v
     Tool result
        |
        v
     Gemini final response
```

The AI layer is deliberately prevented from becoming the source of truth for store data.

---

# 57. Important Design Decisions

## Database is the source of truth

Prices, stock, products, reviews, carts, and orders come from PostgreSQL.

## Server owns authorization

The frontend cannot grant itself permissions.

## Payment is verified server-side

The backend verifies Razorpay information before changing order/payment state.

## Order prices are preserved

`OrderItem.unitPrice` records the purchase-time price.

## Reviews require purchase

This prevents arbitrary users from creating product reviews without purchasing.

## Product search can work without Gemini

The database-first architecture protects core catalog search from Gemini quota exhaustion.

## Webhooks are idempotent

Webhook IDs are stored so duplicate events are not processed repeatedly.

## Payment verification is idempotent

If the order is already paid, the verification endpoint does not repeat the payment operation.

## Stock changes are transactional

Stock deduction and order/payment updates occur together.

## Admin protection exists on the server

Admin UI hiding is not considered sufficient security.

---

# 58. Known Limitations

## Resend production email

Sending email to arbitrary external recipients requires the appropriate verified Resend sending-domain configuration.

## Gemini quota

Gemini usage can be limited by the provider's quota.

Core product search has a database-first fallback so product catalog searches can continue without Gemini.

Gemini-dependent conversational operations can still become temporarily unavailable if the provider quota is exhausted.

## Pro recurring subscription

The repository contains subscription/Pro infrastructure, but recurring Pro subscription is not treated as the main active production feature.

## External service dependencies

Some functionality depends on external services:

* Razorpay
* Gemini
* Resend
* Neon

If one of those services becomes unavailable, the corresponding functionality may be affected.

---

# 59. Troubleshooting

## Frontend does not start

Check that you are in:

```powershell
D:\projects\stack_website\techstore
```

Then:

```powershell
npm install
npm run dev
```

Do not run frontend commands from:

```text
D:\projects\stack_website
```

unless the required `package.json` exists there.

---

## Backend does not start

Go to:

```powershell
D:\projects\stack_website\techstore\server
```

Then:

```powershell
npm install
npm run dev
```

---

## Database connection error

Check:

```env
DATABASE_URL
```

and verify that the PostgreSQL database is accessible.

---

## Prisma error

Regenerate Prisma Client:

```powershell
npx prisma generate
```

Then rebuild the backend.

---

## Razorpay error

Check:

```env
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
```

Also verify that the frontend and backend are using the intended Razorpay environment.

---

## Gemini error

Check:

```env
GEMINI_API_KEY
```

If Gemini quota is exhausted, normal product searches can still use the database-first fallback.

---

## Email error

Check:

```env
RESEND_API_KEY
FROM_EMAIL
```

Also check whether the sender/domain configuration is permitted by Resend.

---

## Authentication problems in production

Check that:

```text
FRONTEND_URL
```

exactly matches the deployed frontend origin.

The production cookie configuration depends on the frontend/backend being configured correctly for cross-origin credentials.

---

# 60. Future Improvements

Potential future improvements include:

* Full production recurring Pro subscription
* Verified custom email domain
* More advanced product filtering
* Product search indexing
* Better AI recommendation ranking
* More payment/refund automation
* Shipping integration
* Inventory alerts
* Order tracking
* Coupon system
* Product categories
* Product variants
* Image upload/storage
* Automated testing suite
* CI/CD pipeline
* More detailed analytics
* Admin reporting
* Customer notifications
* Better recommendation personalization
* Automated monitoring
* Error tracking
* Performance optimization

These are future improvements and should not be interpreted as currently completed functionality.

---

# 61. Current Project Status

| Module                          | Status                                    |
| ------------------------------- | ----------------------------------------- |
| React frontend                  | Complete                                  |
| TypeScript frontend             | Complete                                  |
| Responsive UI                   | Complete                                  |
| Product catalog                 | Complete                                  |
| Product details                 | Complete                                  |
| Authentication                  | Complete                                  |
| Sessions                        | Complete                                  |
| Email verification              | Implemented                               |
| Password reset                  | Complete                                  |
| Cart                            | Complete                                  |
| Wishlist                        | Complete                                  |
| Checkout                        | Complete                                  |
| Addresses                       | Complete                                  |
| Orders                          | Complete                                  |
| Reviews                         | Complete                                  |
| Admin dashboard                 | Complete                                  |
| Admin authorization             | Complete                                  |
| Razorpay one-time payments      | Complete                                  |
| Razorpay payment verification   | Complete                                  |
| Razorpay webhook system         | Implemented                               |
| Stock deduction                 | Complete                                  |
| Payment emails                  | Implemented                               |
| Gemini chatbot                  | Implemented                               |
| Database-first AI search        | Complete                                  |
| Chatbot rate limiting           | Implemented                               |
| Security hardening              | Complete                                  |
| Production deployment           | Complete                                  |
| Mobile audit                    | Passed                                    |
| Production E2E testing          | Passed                                    |
| Pro subscription infrastructure | Implemented / not active production focus |
| Custom email domain             | Not configured                            |

---

# 62. Production URLs

## Frontend

https://tech-store-seven-brown.vercel.app/

## Backend

https://techstore-backend-ds0f.onrender.com

## Products API

https://techstore-backend-ds0f.onrender.com/api/products

## GitHub

https://github.com/tejass23106/TechStore

---

# 63. Git Workflow

The project uses Git and GitHub.

Typical frontend change:

```powershell
cd D:\projects\stack_website\techstore

git status

git add .

git commit -m "Describe the change"

git push origin main
```

After pushing:

```text
GitHub
   |
   v
Vercel/Render deployment
   |
   v
Production
```

Always check `git status` before committing.

Do not commit:

```text
.env
API keys
database passwords
Razorpay secrets
Gemini keys
Resend keys
```

---

# 64. How to Explain This Project in an Interview

## Short explanation

> TechStore is a full-stack e-commerce application built using React, TypeScript, Express, Prisma, and PostgreSQL. It implements authentication, product management, cart, wishlist, checkout, orders, Razorpay payments, reviews, admin authorization, and a Gemini-powered AI shopping assistant. The frontend is deployed on Vercel, the backend on Render, and the production database uses Neon PostgreSQL.

---

## Architecture explanation

> The React frontend communicates with an Express REST API. The Express backend contains authentication, authorization, validation, business logic, payment processing, AI integration, and administrative routes. Prisma acts as the ORM and connects the backend to PostgreSQL. Razorpay handles payments, Gemini handles AI functionality, and Resend handles transactional email.

---

## Authentication explanation

> I used database-backed session authentication instead of storing authentication tokens in localStorage. After login, the backend creates a secure session and sends the session identifier through an HTTP-only cookie. Protected requests use that cookie to identify the user. The backend verifies the session against the database before allowing access.

---

## Payment explanation

> The checkout first creates a pending TechStore order. The backend then creates a corresponding Razorpay order. After the customer pays, the backend verifies the Razorpay signature, amount, currency, payment ownership, and captured status. Only after those checks pass does the database transaction mark the order as paid, confirm the order, reduce stock, and clear the cart.

---

## AI explanation

> The AI assistant uses Gemini function calling for natural-language interactions such as cart operations. However, I made product search database-first so that product information always comes from PostgreSQL and does not depend entirely on Gemini. This also allows catalog search to continue working when the Gemini quota is exhausted.

---

## Security explanation

> Security is enforced primarily on the backend. Passwords are bcrypt-hashed, sessions use HTTP-only cookies, protected resources check ownership, admin APIs verify roles, request bodies are validated using Zod, APIs are rate-limited, Helmet is enabled, CORS is configured, and Razorpay payments and webhooks are cryptographically verified.

---

# 65. License

This project is currently provided for educational, portfolio, and demonstration purposes.

---

# Final Project Summary

TechStore is not just a frontend shopping interface.

It is a complete full-stack application with:

```text
React
   ↓
TypeScript
   ↓
REST API
   ↓
Express
   ↓
Authentication / Authorization
   ↓
Business Logic
   ↓
Prisma
   ↓
PostgreSQL
```

with external integrations:

```text
Razorpay → Payments
Gemini   → AI
Resend   → Email
Vercel   → Frontend Hosting
Render   → Backend Hosting
Neon     → PostgreSQL Hosting
```

The core customer journey is:

```text
Register
→ Login
→ Browse
→ Product Details
→ Cart
→ Checkout
→ Order
→ Razorpay
→ Payment Verification
→ Stock Update
→ Cart Clear
→ Confirmed Order
→ Review
```

The core administrative journey is:

```text
Admin Login
→ Role Verification
→ Admin Dashboard
→ Products
→ Stock
→ Orders
→ Reviews
```

The AI journey is:

```text
User
→ Chatbot
→ Intent Detection
→ Database Search / Gemini
→ Verified Product or Cart Data
→ Response
```

The project has been deployed and the major customer, payment, administrative, security, AI, and responsive flows have been tested.

The repository is intended to serve both as the source code for the application and as the technical reference for understanding how the entire system works.
