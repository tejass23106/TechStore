import {
  GoogleGenAI,
  FunctionCallingConfigMode,
  Type,
  type Tool,
} from "@google/genai";

import {
  searchProducts,
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
} from "../chatbot/tools.js";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined");
}

const ai = new GoogleGenAI({
  apiKey,
});

const GEMINI_MODEL = "gemini-3.6-flash";

/* -------------------------------------------------------------------------- */
/* PROMPTS                                                                    */
/* -------------------------------------------------------------------------- */

const CHATBOT_SYSTEM_PROMPT =
  "You are TechStore AI, a fast shopping assistant for TechStore. " +
  "Use tool results as the only source of truth for TechStore data. " +
  "Never invent products, prices, ratings, stock, cart contents, quantities, totals, or product details. " +
  "Use tools whenever the user asks about TechStore products, prices, stock, ratings, recommendations, or carts. " +
  "If login is required, clearly tell the user to log in. " +
  "Use concise Markdown. Use ₹ for prices. " +
  "For products, show name, price, stock, rating, category, and a short description when available. " +
  "For multiple products, use a numbered list. " +
  "Keep answers short and easy to scan.";

const FINAL_RESPONSE_PROMPT =
  "You are TechStore AI. " +
  "Use only the supplied tool results as factual store data. " +
  "Never invent products, prices, ratings, stock, cart contents, quantities, or totals. " +
  "If login is required, tell the user to log in. " +
  "Answer concisely in Markdown using ₹ for prices. " +
  "Do not call tools.";

/* -------------------------------------------------------------------------- */
/* ERROR HELPERS                                                              */
/* -------------------------------------------------------------------------- */

function getErrorText(error: unknown) {
  return [
    error instanceof Error ? error.message : "",
    String(error),
  ]
    .join(" ")
    .toLowerCase();
}

function isGeminiQuotaError(error: unknown) {
  const text = getErrorText(error);

  return (
    text.includes("quota_exceeded") ||
    text.includes("quota exceeded") ||
    text.includes("generate_content_free_tier_requests") ||
    text.includes("resource_exhausted")
  );
}

function isGeminiUnavailableError(error: unknown) {
  const text = getErrorText(error);

  return (
    text.includes("503") ||
    text.includes("service unavailable") ||
    text.includes("currently experiencing high demand") ||
    text.includes("status: unavailable") ||
    text.includes("unavailable")
  );
}

function createQuotaError() {
  return new Error(
    "TechStore AI is temporarily unavailable.\n\n" +
      "The Gemini daily AI quota has been reached.\n\n" +
      "Product search is still available directly from the TechStore catalog."
  );
}

function createUnavailableError() {
  return new Error(
    "TechStore AI is temporarily busy.\n\n" +
      "The Gemini AI service is currently unavailable.\n\n" +
      "Your TechStore account, cart, orders, and products are not affected."
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry only genuine transient Gemini service failures.
 *
 * IMPORTANT:
 * Daily quota exhaustion is NOT retried.
 * Retrying a daily quota error only wastes time and creates
 * unnecessary requests.
 */
async function generateWithRetry<T>(
  request: () => Promise<T>,
  label: string,
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await request();
    } catch (error) {
      lastError = error;

      // Never retry a daily quota exhaustion error.
      if (isGeminiQuotaError(error)) {
        throw error;
      }

      const isTransient = isGeminiUnavailableError(error);

      if (!isTransient || attempt === maxAttempts) {
        throw error;
      }

      const delay = 1000 * 2 ** (attempt - 1);

      console.warn(
        `${label} failed with a transient Gemini error. ` +
          `Retrying in ${delay}ms... ` +
          `(attempt ${attempt}/${maxAttempts})`
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

/* -------------------------------------------------------------------------- */
/* PRODUCT QUERY DETECTION                                                    */
/* -------------------------------------------------------------------------- */

const CATEGORY_ALIASES: Record<string, string> = {
  laptop: "Laptops",
  laptops: "Laptops",

  phone: "Phones",
  phones: "Phones",
  smartphone: "Phones",
  smartphones: "Phones",
  mobile: "Phones",
  mobiles: "Phones",

  gaming: "Gaming",
  game: "Gaming",
  games: "Gaming",

  audio: "Audio",
  headphone: "Audio",
  headphones: "Audio",
  earphone: "Audio",
  earphones: "Audio",
  earbuds: "Audio",

  accessory: "Accessories",
  accessories: "Accessories",

  storage: "Storage",
  ssd: "Storage",
};

/**
 * Returns a known TechStore category when the user explicitly mentions one.
 */
function detectCategory(message: string): string | undefined {
  const lower = message.toLowerCase();

  for (const [alias, category] of Object.entries(CATEGORY_ALIASES)) {
    const pattern = new RegExp(`\\b${alias}\\b`, "i");

    if (pattern.test(lower)) {
      return category;
    }
  }

  return undefined;
}

/**
 * Converts Indian-style money strings:
 *
 * 10000
 * 10,000
 * ₹10,000
 * 1 lakh
 * ₹1 lakh
 */
function parseMoneyValue(value: string): number | undefined {
  let cleaned = value
    .toLowerCase()
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .trim();

  const lakhMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*l(?:akh)?$/i);

  if (lakhMatch) {
    const amount = Number(lakhMatch[1]);

    if (Number.isFinite(amount)) {
      return amount * 100000;
    }
  }

  cleaned = cleaned.replace(/[^\d.]/g, "");

  if (!cleaned) {
    return undefined;
  }

  const amount = Number(cleaned);

  return Number.isFinite(amount) ? amount : undefined;
}

/**
 * Detect max-price queries such as:
 *
 * under ₹10,000
 * below 10000
 * less than 1 lakh
 * within ₹50,000
 * up to 50000
 */
function detectMaxPrice(message: string): number | undefined {
  const lower = message.toLowerCase();

  const patterns = [
    /(?:under|below|less than|up to|upto|within|max(?:imum)?(?: price)?(?: of)?|budget(?: of)?|around)\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(lakh|l)?/i,

    /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(lakh|l)?\s*(?:or less|and below|maximum|max)?/i,
  ];

  for (const pattern of patterns) {
    const match = lower.match(pattern);

    if (!match) {
      continue;
    }

    const numberPart = match[1];
    const suffix = match[2];

    const rawValue = suffix
      ? `${numberPart} ${suffix}`
      : numberPart;

    const value = parseMoneyValue(rawValue);

    if (typeof value === "number") {
      return value;
    }
  }

  return undefined;
}

/**
 * Detect minimum-price queries such as:
 *
 * above 50000
 * over ₹1 lakh
 * more than 50000
 */
function detectMinPrice(message: string): number | undefined {
  const lower = message.toLowerCase();

  const pattern =
    /(?:above|over|more than|greater than|starting from|from)\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(lakh|l)?/i;

  const match = lower.match(pattern);

  if (!match) {
    return undefined;
  }

  const rawValue = match[2]
    ? `${match[1]} ${match[2]}`
    : match[1];

  return parseMoneyValue(rawValue);
}

/**
 * Product-related words that strongly indicate the user is asking
 * about the TechStore catalog rather than general conversation.
 */
function isProductSearchIntent(message: string): boolean {
  const lower = message.toLowerCase();

  // Explicit cart operations should remain handled by Gemini tools.
  if (
    lower.includes("add to cart") ||
    lower.includes("remove from cart") ||
    lower.includes("clear cart") ||
    lower.includes("empty cart") ||
    lower.includes("my cart") ||
    /\bcart\b/.test(lower)
  ) {
    return false;
  }

  if (
    detectCategory(message) ||
    detectMaxPrice(message) !== undefined ||
    detectMinPrice(message) !== undefined
  ) {
    return true;
  }

  const productWords = [
    "product",
    "products",
    "buy",
    "available",
    "availability",
    "show me",
    "list",
    "find",
    "search",
    "recommend",
    "recommendation",
    "compare",
    "comparison",
    "catalog",
    "price",
    "prices",
    "stock",
    "rating",
    "ratings",
  ];

  return productWords.some((word) => lower.includes(word));
}

/* -------------------------------------------------------------------------- */
/* VERIFIED DATABASE PRODUCT RESPONSE                                         */
/* -------------------------------------------------------------------------- */

type ProductResult = {
  id?: number;
  name: string;
  price: number;
  category: string;
  rating: number;
  reviews: number;
  stock: number;
  description: string;
};

function formatProductsFallback(
  products: ProductResult[],
  message?: string
) {
  if (products.length === 0) {
    return (
      "I couldn't find any matching products in TechStore.\n\n" +
      "Try a different category, product name, or budget."
    );
  }

  const lower = message?.toLowerCase() ?? "";

  const wantsRecommendation =
    lower.includes("recommend") ||
    lower.includes("best") ||
    lower.includes("suggest") ||
    lower.includes("which one");

  const wantsComparison =
    lower.includes("compare") ||
    lower.includes("comparison") ||
    lower.includes("difference") ||
    lower.includes(" vs ");

  const productList = products
    .map((product, index) => {
      const availability =
        product.stock > 0
          ? `${product.stock} available`
          : "Currently out of stock";

      return (
        `### ${index + 1}. ${product.name}\n\n` +
        `**₹${product.price.toLocaleString("en-IN")}**\n\n` +
        `${product.description}\n\n` +
        `**Category:** ${product.category}  \n` +
        `**Availability:** ${availability}`
      );
    })
    .join("\n\n---\n\n");

  if (wantsComparison) {
    return (
      `## Product Comparison\n\n` +
      `Here are the products currently available in the TechStore catalog:\n\n` +
      productList
    );
  }

  if (wantsRecommendation) {
    return (
      `## Recommended Options\n\n` +
      `I found ${products.length} matching products in the TechStore catalog:\n\n` +
      productList +
      `\n\n---\n\n` +
      `**Recommendation:** I don't have enough reliable review data in the current catalog to make a meaningful rating-based recommendation. ` +
      `You can compare the products above based on price, specifications, and availability.`
    );
  }

  return (
    `## Available Products\n\n` +
    `I found ${products.length} matching products in the TechStore catalog:\n\n` +
    productList
  );
}

/* -------------------------------------------------------------------------- */
/* GEMINI TOOLS                                                               */
/* -------------------------------------------------------------------------- */

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "searchProducts",
        description:
          "Search active TechStore products by name, category, price, or rating. " +
          "Use this for all product questions and recommendations. " +
          "If the user asks for products from a category such as laptops, phones, gaming, audio, accessories, or storage, use the category field.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description:
                "Optional product keyword or name. Do not use a category name here when category can be used.",
            },
            category: {
              type: Type.STRING,
              description:
                "Optional product category such as Laptops, Phones, Gaming, Audio, Accessories, or Storage.",
            },
            minPrice: {
              type: Type.NUMBER,
              description: "Minimum price in INR.",
            },
            maxPrice: {
              type: Type.NUMBER,
              description: "Maximum price in INR.",
            },
            minRating: {
              type: Type.NUMBER,
              description: "Minimum rating from 0 to 5.",
            },
          },
        },
      },
      {
        name: "getCart",
        description:
          "Get the authenticated user's current cart and subtotal.",
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: "addToCart",
        description:
          "Add one active TechStore product to the authenticated user's cart.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            productName: {
              type: Type.STRING,
              description: "Exact or distinctive product name.",
            },
            quantity: {
              type: Type.NUMBER,
              description: "Quantity to add. Defaults to 1.",
            },
          },
          required: ["productName"],
        },
      },
      {
        name: "removeFromCart",
        description:
          "Remove one product from the authenticated user's cart.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            productName: {
              type: Type.STRING,
              description: "Product name to remove.",
            },
          },
          required: ["productName"],
        },
      },
      {
        name: "clearCart",
        description:
          "Remove all items from the authenticated user's cart.",
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* MAIN CHATBOT                                                               */
/* -------------------------------------------------------------------------- */

export async function generateChatbotResponse(
  message: string,
  userId?: number
) {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return "Please tell me what you're looking for.";
  }

  /*
   * ------------------------------------------------------------------------
   * DATABASE-FIRST PRODUCT SEARCH
   * ------------------------------------------------------------------------
   *
   * This is the most important change.
   *
   * Product searches no longer need Gemini just to retrieve products.
   * This means:
   *
   *   "show me laptops"
   *   "show me all laptops"
   *   "phones under 80000"
   *   "what can I buy under 10000"
   *   "compare phones"
   *
   * continue working even when Gemini's API quota is exhausted.
   *
   * Product information always comes directly from Prisma/Neon.
   */

  if (isProductSearchIntent(trimmedMessage)) {
    const category = detectCategory(trimmedMessage);
    const maxPrice = detectMaxPrice(trimmedMessage);
    const minPrice = detectMinPrice(trimmedMessage);

    const productResults = await searchProducts({
      category,
      minPrice,
      maxPrice,
    });

    console.log("Database-first product search:", {
      message: trimmedMessage,
      category,
      minPrice,
      maxPrice,
      resultCount: productResults.length,
    });

    return formatProductsFallback(
      productResults as ProductResult[],
      trimmedMessage
    );
  }

  /*
   * ------------------------------------------------------------------------
   * GEMINI
   * ------------------------------------------------------------------------
   *
   * Gemini is still used for:
   *
   * - natural-language questions
   * - cart operations
   * - authenticated cart queries
   * - more complex conversations
   *
   * Product catalog retrieval is no longer dependent on this section.
   */

  const chatbotStart = performance.now();

  let response;

  try {
    response = await generateWithRetry(
      () =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [
            {
              role: "user",
              parts: [{ text: trimmedMessage }],
            },
          ],
          config: {
            systemInstruction: CHATBOT_SYSTEM_PROMPT,
            tools,
            toolConfig: {
              functionCallingConfig: {
                mode: FunctionCallingConfigMode.AUTO,
              },
            },
            maxOutputTokens: 300,
          },
        }),
      "Gemini initial request"
    );

    console.log(
      `Gemini first request: ${(
        performance.now() - chatbotStart
      ).toFixed(0)} ms`
    );
  } catch (error) {
    console.error("Gemini initial request error:", error);

    if (isGeminiQuotaError(error)) {
      throw createQuotaError();
    }

    if (isGeminiUnavailableError(error)) {
      throw createUnavailableError();
    }

    throw error;
  }

  const functionCalls = response.functionCalls;

  /*
   * Gemini answered without using a tool.
   */
  if (!functionCalls || functionCalls.length === 0) {
    return (
      response.text ??
      "Sorry, I could not generate a response."
    );
  }

  /* ---------------------------------------------------------------------- */
  /* TOOL EXECUTION                                                         */
  /* ---------------------------------------------------------------------- */

  const toolStart = performance.now();

  const functionResponses = await Promise.all(
    functionCalls.map(async (call) => {
      if (call.name === "searchProducts") {
        const args = (call.args ?? {}) as {
          query?: string;
          category?: string;
          minPrice?: number;
          maxPrice?: number;
          minRating?: number;
        };

        const result = await searchProducts(args);

        return {
          functionResponse: {
            name: call.name,
            id: call.id,
            response: {
              products: result,
            },
          },
          searchResult: result,
        };
      }

      if (
        call.name === "getCart" ||
        call.name === "addToCart" ||
        call.name === "removeFromCart" ||
        call.name === "clearCart"
      ) {
        if (!userId) {
          return {
            functionResponse: {
              name: call.name,
              id: call.id,
              response: {
                success: false,
                requiresLogin: true,
                message:
                  "The user must log in before accessing or modifying their cart.",
              },
            },
          };
        }

        let result: Record<string, unknown>;

        if (call.name === "getCart") {
          result = await getCart(userId);
        } else if (call.name === "addToCart") {
          result = await addToCart(
            userId,
            (call.args ?? {}) as {
              productName: string;
              quantity?: number;
            }
          );
        } else if (call.name === "removeFromCart") {
          result = await removeFromCart(
            userId,
            (call.args ?? {}) as {
              productName: string;
            }
          );
        } else {
          result = await clearCart(userId);
        }

        return {
          functionResponse: {
            name: call.name,
            id: call.id,
            response: result,
          },
        };
      }

      return {
        functionResponse: {
          name: call.name,
          id: call.id,
          response: {
            success: false,
            message: "Unsupported chatbot operation.",
          },
        },
      };
    })
  );

  console.log(
    `Tool execution: ${(
      performance.now() - toolStart
    ).toFixed(0)} ms`
  );

  /* ---------------------------------------------------------------------- */
  /* VERIFIED DATABASE FALLBACK                                             */
  /* ---------------------------------------------------------------------- */

  const productSearchResults = functionResponses
    .filter(
      (
        item
      ): item is typeof item & {
        searchResult: ProductResult[];
      } => Array.isArray(item.searchResult)
    )
    .flatMap((item) => item.searchResult);

  /*
   * If Gemini itself fails after a successful database search,
   * return the already verified database results.
   */
  let finalResponse;

  try {
    finalResponse = await generateWithRetry(
      () =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [
            {
              role: "user",
              parts: [{ text: trimmedMessage }],
            },
            {
              role: "model",
              parts:
                response.candidates?.[0]?.content?.parts ?? [],
            },
            {
              role: "user",
              parts: functionResponses.map((item) => ({
                functionResponse: {
                  ...item.functionResponse,
                  response:
                    item.functionResponse.response as Record<
                      string,
                      unknown
                    >,
                },
              })),
            },
          ],
          config: {
            systemInstruction: FINAL_RESPONSE_PROMPT,
            toolConfig: {
              functionCallingConfig: {
                mode: FunctionCallingConfigMode.NONE,
              },
            },
            maxOutputTokens: 250,
          },
        }),
      "Gemini final request"
    );

    console.log(
      `Chatbot total time: ${(
        performance.now() - chatbotStart
      ).toFixed(0)} ms`
    );
  } catch (error) {
    console.error("Gemini final request error:", error);

    /*
     * Database product data already exists, so Gemini does not
     * need to succeed for us to provide a useful product response.
     */
    if (
      isGeminiUnavailableError(error) ||
      isGeminiQuotaError(error)
    ) {
      if (productSearchResults.length > 0) {
        console.warn(
          "Using verified database product fallback because Gemini final response failed."
        );

        return formatProductsFallback(
          productSearchResults,
          trimmedMessage
        );
      }

      if (isGeminiQuotaError(error)) {
        throw createQuotaError();
      }

      throw createUnavailableError();
    }

    throw error;
  }

  console.log("Final chatbot response:", {
    text: finalResponse.text,
    finishReason:
      finalResponse.candidates?.[0]?.finishReason,
  });

  if (finalResponse.text) {
    return finalResponse.text;
  }

  if (productSearchResults.length > 0) {
    return formatProductsFallback(
      productSearchResults,
      trimmedMessage
    );
  }

  return "I found the information, but I could not generate a response.";
}