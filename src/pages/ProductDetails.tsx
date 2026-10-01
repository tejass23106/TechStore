import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  ShoppingCart,
  Star,
  Trash2,
  Pencil,
  X,
} from "lucide-react";

import {
  createReview,
  deleteReview,
  getMyReview,
  getProduct,
  getProductReviews,
  updateReview,
  type ApiReview,
} from "../lib/api";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";

import type { Product } from "../data/products";

export default function ProductDetails() {
  const { id } = useParams();

  const { addToCart } = useCart();
  const { user } = useAuth();

  const {
    isInWishlist,
    toggleWishlist,
  } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [wishlistLoading, setWishlistLoading] =
    useState(false);

  // Reviews
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [myReview, setMyReview] =
    useState<ApiReview | null>(null);

  const [reviewsLoading, setReviewsLoading] =
    useState(true);

  const [selectedRating, setSelectedRating] = useState(5);
  const [comment, setComment] = useState("");

  const [reviewSubmitting, setReviewSubmitting] =
    useState(false);

  const [reviewError, setReviewError] = useState("");
  const [reviewMessage, setReviewMessage] =
    useState("");

  const [editingReview, setEditingReview] =
    useState(false);

  // Load product
  useEffect(() => {
    if (!id) {
      setError("Invalid product.");
      setLoading(false);
      return;
    }

    getProduct(id)
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Product not found.");
        setLoading(false);
      });
  }, [id]);

  // Load reviews
  useEffect(() => {
    if (!product) return;

    async function loadReviews() {
      if (!product) return;
      try {
        setReviewsLoading(true);
        setReviewError("");

        const reviewData =
          await getProductReviews(product.id);

        setReviews(reviewData.reviews);

        if (user) {
          try {
            const myReviewData =
              await getMyReview(product.id);

            setMyReview(myReviewData.review);

            if (myReviewData.review) {
              setSelectedRating(
                myReviewData.review.rating
              );

              setComment(
                myReviewData.review.comment || ""
              );
            } else {
              setSelectedRating(5);
              setComment("");
            }
          } catch (error) {
            console.error(
              "Get my review error:",
              error
            );
          }
        } else {
          setMyReview(null);
          setSelectedRating(5);
          setComment("");
        }
      } catch (error) {
        console.error(
          "Get reviews error:",
          error
        );

        setReviewError(
          "Failed to load reviews."
        );
      } finally {
        setReviewsLoading(false);
      }
    }

    loadReviews();
  }, [product, user]);

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-6">
        <p className="text-gray-500">
          Loading product...
        </p>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold">
            Product not found
          </h1>

          <p className="mt-3 text-gray-500">
            {error}
          </p>

          <Link
            to="/products"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 font-semibold text-white"
          >
            <ArrowLeft size={18} />
            Back to products
          </Link>
        </div>
      </main>
    );
  }

  const wishlisted = isInWishlist(product.id);

  async function handleAddToCart() {
    if (!product) return;

    try {
      await addToCart(product);

      setAdded(true);

      setTimeout(() => {
        setAdded(false);
      }, 1500);
    } catch (error) {
      console.error(
        "Add to cart error:",
        error
      );
    }
  }

  async function handleWishlist() {
  if (!user || !product) {
    return;
  }

  try {
      setWishlistLoading(true);

      await toggleWishlist(product);
    } catch (error) {
      console.error(
        "Wishlist toggle error:",
        error
      );
    } finally {
      setWishlistLoading(false);
    }
  }

  async function refreshReviews() {
    if (!product) return;

    const reviewData =
      await getProductReviews(product.id);

    setReviews(reviewData.reviews);

    if (user) {
      const myReviewData =
        await getMyReview(product.id);

      setMyReview(myReviewData.review);

      if (myReviewData.review) {
        setSelectedRating(
          myReviewData.review.rating
        );

        setComment(
          myReviewData.review.comment || ""
        );
      } else {
        setSelectedRating(5);
        setComment("");
      }
    }

    // Refresh product rating/count
    const updatedProduct =
      await getProduct(String(product.id));

    setProduct(updatedProduct);
  }

 async function handleSubmitReview() {
  if (!user || !product) return;

    if (comment.length > 1000) {
      setReviewError(
        "Review cannot exceed 1000 characters."
      );
      return;
    }

    try {
      setReviewSubmitting(true);
      setReviewError("");
      setReviewMessage("");

      if (myReview && editingReview) {
        await updateReview(
          myReview.id,
          selectedRating,
          comment
        );

        setReviewMessage(
          "Review updated successfully."
        );

        setEditingReview(false);
      } else {
        await createReview(
          product.id,
          selectedRating,
          comment
        );

        setReviewMessage(
          "Review submitted successfully."
        );
      }

      await refreshReviews();
    } catch (error) {
      console.error(
        "Review submission error:",
        error
      );

      setReviewError(
        error instanceof Error
          ? error.message
          : "Failed to submit review."
      );
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function handleDeleteReview() {
    if (!myReview) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete your review?"
    );

    if (!confirmed) return;

    try {
      setReviewSubmitting(true);
      setReviewError("");
      setReviewMessage("");

      await deleteReview(myReview.id);

      setReviewMessage(
        "Review deleted successfully."
      );

      setEditingReview(false);

      await refreshReviews();
    } catch (error) {
      console.error(
        "Delete review error:",
        error
      );

      setReviewError(
        error instanceof Error
          ? error.message
          : "Failed to delete review."
      );
    } finally {
      setReviewSubmitting(false);
    }
  }

  function handleEditReview() {
    if (!myReview) return;

    setSelectedRating(myReview.rating);
    setComment(myReview.comment || "");
    setEditingReview(true);
    setReviewError("");
    setReviewMessage("");
  }

  function handleCancelEdit() {
    setEditingReview(false);

    if (myReview) {
      setSelectedRating(myReview.rating);
      setComment(myReview.comment || "");
    }
  }

  function renderStars(
    rating: number,
    size = 18
  ) {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            fill={
              star <= rating
                ? "currentColor"
                : "none"
            }
            className={
              star <= rating
                ? "text-yellow-500"
                : "text-gray-300"
            }
          />
        ))}
      </div>
    );
  }

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-black"
        >
          <ArrowLeft size={16} />
          Back to products
        </Link>

        {/* PRODUCT DETAILS */}

        <div className="mt-10 grid gap-12 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl bg-gray-100">
            <img
              src={product.image}
              alt={product.name}
              className="aspect-square h-full w-full object-cover"
            />
          </div>

          <div className="flex flex-col justify-center">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">
                  {product.category}
                </p>

                <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                  {product.name}
                </h1>
              </div>

              {user && (
                <button
                  type="button"
                  onClick={handleWishlist}
                  disabled={wishlistLoading}
                  aria-label={
                    wishlisted
                      ? "Remove from wishlist"
                      : "Add to wishlist"
                  }
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-200 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Heart
                    size={24}
                    fill={
                      wishlisted
                        ? "currentColor"
                        : "none"
                    }
                    className={
                      wishlisted
                        ? "text-red-500"
                        : "text-gray-700"
                    }
                  />
                </button>
              )}
            </div>

            {!user && (
              <p className="mt-4 text-sm text-gray-500">
                <Link
                  to="/login"
                  className="font-semibold text-black underline"
                >
                  Log in
                </Link>{" "}
                to add this product to your wishlist.
              </p>
            )}

            <div className="mt-5 flex items-center gap-2">
              <Star
                size={18}
                fill="currentColor"
              />

              <span className="font-semibold">
                {product.rating.toFixed(1)}
              </span>

              <span className="text-gray-500">
                ({product.reviews} reviews)
              </span>
            </div>

            <div className="mt-7 flex items-center gap-3">
              <p className="text-3xl font-bold">
                ₹
                {product.price.toLocaleString(
                  "en-IN"
                )}
              </p>

              {product.originalPrice >
                product.price && (
                <p className="text-lg text-gray-400 line-through">
                  ₹
                  {product.originalPrice.toLocaleString(
                    "en-IN"
                  )}
                </p>
              )}
            </div>

            <p className="mt-6 max-w-xl leading-8 text-gray-500">
              {product.description}
            </p>

            <div className="mt-8 rounded-2xl bg-gray-50 p-5">
              <p className="font-semibold">
                {product.stock} units available
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Order now while stock lasts.
              </p>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              className={`mt-8 flex w-full items-center justify-center gap-3 rounded-full px-7 py-4 font-semibold text-white transition ${
                product.stock <= 0
                  ? "cursor-not-allowed bg-gray-400"
                  : added
                    ? "bg-green-600"
                    : "bg-black hover:bg-gray-800"
              }`}
            >
              <ShoppingCart size={20} />

              {product.stock <= 0
                ? "Out of stock"
                : added
                  ? "Added to cart"
                  : "Add to cart"}
            </button>
          </div>
        </div>

        {/* REVIEWS */}

        <section className="mt-20 border-t border-gray-200 pt-16">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            {/* REVIEW SUMMARY */}

            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">
                Customer feedback
              </p>

              <h2 className="mt-3 text-3xl font-black">
                Reviews & Ratings
              </h2>

              <div className="mt-6 flex items-center gap-4">
                <span className="text-5xl font-black">
                  {product.rating.toFixed(1)}
                </span>

                <div>
                  {renderStars(
                    Math.round(product.rating),
                    22
                  )}

                  <p className="mt-2 text-sm text-gray-500">
                    Based on {product.reviews}{" "}
                    review
                    {product.reviews !== 1
                      ? "s"
                      : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* REVIEW FORM */}

            <div className="rounded-3xl border border-gray-200 p-6">
              {!user ? (
                <div>
                  <h3 className="text-xl font-bold">
                    Want to review this product?
                  </h3>

                  <p className="mt-2 text-gray-500">
                    You need to log in and purchase
                    this product before submitting a
                    review.
                  </p>

                  <Link
                    to="/login"
                    className="mt-5 inline-flex rounded-full bg-black px-6 py-3 font-semibold text-white"
                  >
                    Log in
                  </Link>
                </div>
              ) : myReview && !editingReview ? (
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xl font-bold">
                      Your review
                    </h3>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleEditReview}
                        className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteReview}
                        disabled={reviewSubmitting}
                        className="flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-5">
                    {renderStars(
                      myReview.rating
                    )}
                  </div>

                  {myReview.comment && (
                    <p className="mt-4 leading-7 text-gray-600">
                      {myReview.comment}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">
                      {editingReview
                        ? "Edit your review"
                        : "Write a review"}
                    </h3>

                    {editingReview && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="rounded-full p-2 hover:bg-gray-100"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-gray-500">
                    Only customers who have purchased
                    this product can submit a review.
                  </p>

                  <div className="mt-6">
                    <p className="mb-3 text-sm font-semibold">
                      Your rating
                    </p>

                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(
                        (star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() =>
                              setSelectedRating(
                                star
                              )
                            }
                            aria-label={`${star} star`}
                            className="transition hover:scale-110"
                          >
                            <Star
                              size={30}
                              fill={
                                star <=
                                selectedRating
                                  ? "currentColor"
                                  : "none"
                              }
                              className={
                                star <=
                                selectedRating
                                  ? "text-yellow-500"
                                  : "text-gray-300"
                              }
                            />
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <label
                      htmlFor="review"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Your review
                    </label>

                    <textarea
                      id="review"
                      value={comment}
                      onChange={(event) =>
                        setComment(
                          event.target.value
                        )
                      }
                      maxLength={1000}
                      rows={5}
                      placeholder="Share your experience with this product..."
                      className="w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-black"
                    />

                    <p className="mt-2 text-right text-xs text-gray-400">
                      {comment.length}/1000
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={reviewSubmitting}
                    className="mt-4 w-full rounded-full bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {reviewSubmitting
                      ? "Submitting..."
                      : editingReview
                        ? "Update review"
                        : "Submit review"}
                  </button>
                </div>
              )}

              {reviewError && (
                <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                  {reviewError}
                </p>
              )}

              {reviewMessage && (
                <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">
                  {reviewMessage}
                </p>
              )}
            </div>
          </div>

          {/* REVIEW LIST */}

          <div className="mt-14">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">
                Customer reviews
              </h3>

              <span className="text-sm text-gray-500">
                {reviews.length} review
                {reviews.length !== 1
                  ? "s"
                  : ""}
              </span>
            </div>

            {reviewsLoading ? (
              <p className="mt-8 text-gray-500">
                Loading reviews...
              </p>
            ) : reviewError && reviews.length === 0 ? (
              <p className="mt-8 text-red-500">
                {reviewError}
              </p>
            ) : reviews.length === 0 ? (
              <div className="mt-6 rounded-3xl bg-gray-50 p-10 text-center">
                <h4 className="text-xl font-bold">
                  No reviews yet
                </h4>

                <p className="mt-2 text-gray-500">
                  Be the first customer to review this
                  product.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                {reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-3xl border border-gray-200 p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <p className="font-bold">
                          {review.user?.name ||
                            "Customer"}
                        </p>

                        <div className="mt-2">
                          {renderStars(
                            review.rating
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-gray-400">
                        {new Date(
                          review.createdAt
                        ).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </p>
                    </div>

                    {review.comment && (
                      <p className="mt-5 leading-7 text-gray-600">
                        {review.comment}
                      </p>
                    )}

                    {review.userId === user?.id && (
                      <span className="mt-4 inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        Your review
                      </span>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}