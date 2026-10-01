import { Router } from "express";
import { Prisma } from "@prisma/client";

import prisma from "../lib/prisma.js";

import {
requireAuth,
type AuthenticatedRequest,
} from "../Middleware/auth.js";

import { validate } from "../Middleware/validate.js";

import {
createReviewSchema,
updateReviewSchema,
} from "../Middleware/validation.js";

const router = Router();

function parsePositiveInteger(value: string) {
const number = Number(value);

return Number.isInteger(number) && number > 0
? number
: null;
}

async function refreshProductRating(
tx: Prisma.TransactionClient,
productId: number
) {
const aggregate = await tx.review.aggregate({
where: {
productId,
},
_avg: {
rating: true,
},
_count: {
id: true,
},
});

await tx.product.update({
where: {
id: productId,
},
data: {
rating: aggregate._avg.rating ?? 0,
reviews: aggregate._count.id,
},
});
}

async function runReviewTransaction<T>(
callback: (
tx: Prisma.TransactionClient
) => Promise<T>
) {
const maxAttempts = 3;

for (
let attempt = 1;
attempt <= maxAttempts;
attempt++
) {
try {
return await prisma.$transaction(
callback,
{
isolationLevel:
Prisma.TransactionIsolationLevel.Serializable,
}
);
} catch (error) {
if (
error instanceof
Prisma.PrismaClientKnownRequestError &&
error.code === "P2034" &&
attempt < maxAttempts
) {
continue;
}


  throw error;
}


}

throw new Error(
"Review transaction failed after retries"
);
}

/**

* GET /api/reviews/product/:productId
*
* Get all reviews for a product.
  */
  router.get(
  "/product/:productId",
  async (req, res) => {
  try {
  const productId = parsePositiveInteger(
  req.params.productId
  );

  if (productId === null) {
  return res.status(400).json({
  message: "Invalid product ID",
  });
  }

  const reviews =
  await prisma.review.findMany({
  where: {
  productId,
  },
  orderBy: {
  createdAt: "desc",
  },
  include: {
  user: {
  select: {
  id: true,
  name: true,
  },
  },
  },
  });

  return res.json({
  reviews,
  });
  } catch (error) {
  console.error(
  "Get product reviews error:",
  error
  );

  return res.status(500).json({
  message: "Failed to fetch reviews",
  });
  }
  }
  );

/**

* GET /api/reviews/product/:productId/my-review
*
* Get the authenticated user's review for a product.
  */
  router.get(
  "/product/:productId/my-review",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
  try {
  const userId = req.userId!;

  const productId = parsePositiveInteger(
  String(req.params.productId)
);
  if (productId === null) {
  return res.status(400).json({
  message: "Invalid product ID",
  });
  }

  const review =
  await prisma.review.findUnique({
  where: {
  userId_productId: {
  userId,
  productId,
  },
  },
  });

  return res.json({
  review,
  });
  } catch (error) {
  console.error(
  "Get my review error:",
  error
  );

  return res.status(500).json({
  message: "Failed to fetch your review",
  });
  }
  }
  );

/**

* POST /api/reviews
*
* Create a verified-purchase review.
  */
  router.post(
  "/",
  requireAuth,
  validate(createReviewSchema),
  async (req: AuthenticatedRequest, res) => {
  try {
  const userId = req.userId!;

  const productId = Number(
  req.body.productId
  );

  const rating = Number(
  req.body.rating
  );

  const comment =
  typeof req.body.comment === "string"
  ? req.body.comment.trim()
  : "";

  if (
  !Number.isInteger(productId) ||
  productId <= 0
  ) {
  return res.status(400).json({
  message: "Invalid product ID",
  });
  }

  if (
  !Number.isInteger(rating) ||
  rating < 1 ||
  rating > 5
  ) {
  return res.status(400).json({
  message:
  "Rating must be between 1 and 5",
  });
  }

  if (comment.length > 1000) {
  return res.status(400).json({
  message:
  "Review cannot exceed 1000 characters",
  });
  }

  const product =
  await prisma.product.findUnique({
  where: {
  id: productId,
  },
  select: {
  id: true,
  },
  });

  if (!product) {
  return res.status(404).json({
  message: "Product not found",
  });
  }

  const purchasedProduct =
  await prisma.orderItem.findFirst({
  where: {
  productId,
  order: {
  userId,
  paymentStatus: "PAID",
  status: {
  not: "CANCELLED",
  },
  },
  },
  select: {
  id: true,
  },
  });

  if (!purchasedProduct) {
  return res.status(403).json({
  message:
  "You can review this product only after purchasing it",
  });
  }

  const review =
  await runReviewTransaction(
  async (tx) => {
  const existingReview =
  await tx.review.findUnique({
  where: {
  userId_productId: {
  userId,
  productId,
  },
  },
  select: {
  id: true,
  },
  });

  
       if (existingReview) {
         throw new Error(
           "REVIEW_ALREADY_EXISTS"
         );
       }

       const createdReview =
         await tx.review.create({
           data: {
             userId,
             productId,
             rating,
             comment: comment || null,
           },
           include: {
             user: {
               select: {
                 id: true,
                 name: true,
               },
             },
           },
         });

       await refreshProductRating(
         tx,
         productId
       );

       return createdReview;
     }
   );
  

  return res.status(201).json({
  message:
  "Review submitted successfully",
  review,
  });
  } catch (error) {
  if (
  error instanceof Error &&
  error.message ===
  "REVIEW_ALREADY_EXISTS"
  ) {
  return res.status(409).json({
  message:
  "You have already reviewed this product",
  });
  }

  if (
  error instanceof
  Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002"
  ) {
  return res.status(409).json({
  message:
  "You have already reviewed this product",
  });
  }

  console.error(
  "Create review error:",
  error
  );

  return res.status(500).json({
  message: "Failed to submit review",
  });
  }
  }
  );

/**

* PUT /api/reviews/:id
*
* Update the authenticated user's review.
  */
  router.put(
  "/:id",
  requireAuth,
  validate(updateReviewSchema),
  async (req: AuthenticatedRequest, res) => {
  try {
  const userId = req.userId!;

 const reviewId = parsePositiveInteger(
  String(req.params.id)
);
  const rating = Number(
  req.body.rating
  );

  const comment =
  typeof req.body.comment === "string"
  ? req.body.comment.trim()
  : "";

  if (reviewId === null) {
  return res.status(400).json({
  message: "Invalid review ID",
  });
  }

  if (
  !Number.isInteger(rating) ||
  rating < 1 ||
  rating > 5
  ) {
  return res.status(400).json({
  message:
  "Rating must be between 1 and 5",
  });
  }

  if (comment.length > 1000) {
  return res.status(400).json({
  message:
  "Review cannot exceed 1000 characters",
  });
  }

  const review =
  await runReviewTransaction(
  async (tx) => {
  const existingReview =
  await tx.review.findFirst({
  where: {
  id: reviewId,
  userId,
  },
  select: {
  id: true,
  productId: true,
  },
  });

  
       if (!existingReview) {
         throw new Error(
           "REVIEW_NOT_FOUND"
         );
       }

       const updatedReview =
         await tx.review.update({
           where: {
             id: reviewId,
           },
           data: {
             rating,
             comment: comment || null,
           },
           include: {
             user: {
               select: {
                 id: true,
                 name: true,
               },
             },
           },
         });

       await refreshProductRating(
         tx,
         existingReview.productId
       );

       return updatedReview;
     }
   );
  

  return res.json({
  message:
  "Review updated successfully",
  review,
  });
  } catch (error) {
  if (
  error instanceof Error &&
  error.message ===
  "REVIEW_NOT_FOUND"
  ) {
  return res.status(404).json({
  message: "Review not found",
  });
  }

  console.error(
  "Update review error:",
  error
  );

  return res.status(500).json({
  message:
  "Failed to update review",
  });
  }
  }
  );

/**

* DELETE /api/reviews/:id
*
* Delete the authenticated user's review.
  */
  router.delete(
  "/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
  try {
  const userId = req.userId!;

  const reviewId = parsePositiveInteger(
  String(req.params.id)
);

  if (reviewId === null) {
  return res.status(400).json({
  message: "Invalid review ID",
  });
  }

  await runReviewTransaction(
  async (tx) => {
  const existingReview =
  await tx.review.findFirst({
  where: {
  id: reviewId,
  userId,
  },
  select: {
  id: true,
  productId: true,
  },
  });

  
     if (!existingReview) {
       throw new Error(
         "REVIEW_NOT_FOUND"
       );
     }

     await tx.review.delete({
       where: {
         id: reviewId,
       },
     });

     await refreshProductRating(
       tx,
       existingReview.productId
     );
   }
  

  );

  return res.json({
  message:
  "Review deleted successfully",
  });
  } catch (error) {
  if (
  error instanceof Error &&
  error.message ===
  "REVIEW_NOT_FOUND"
  ) {
  return res.status(404).json({
  message: "Review not found",
  });
  }

  console.error(
  "Delete review error:",
  error
  );

  return res.status(500).json({
  message:
  "Failed to delete review",
  });
  }
  }
  );

export default router;
