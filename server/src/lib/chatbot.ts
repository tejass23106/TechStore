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

function isGeminiQuotaError(error: unknown) {
  const text = [
    error instanceof Error ? error.message : "",
    String(error),
  ]
    .join(" ")
    .toLowerCase();

  return (
    text.includes("429") ||
    text.includes("resource_exhausted") ||
    text.includes("quota exceeded") ||
    text.includes("generate_content_free_tier_requests")
  );
}

function isGeminiUnavailableError(error: unknown) {
  const text = [
    error instanceof Error ? error.message : "",
    String(error),
  ]
    .join(" ")
    .toLowerCase();

  return (
    text.includes("503") ||
    text.includes("service unavailable") ||
    text.includes("currently experiencing high demand") ||
    text.includes("status: unavailable")
  );
}

function createQuotaError() {
  return new Error(
    "TechStore AI is temporarily unavailable.\n\n" +
      "The Gemini free-tier request quota has been reached.\n\n" +
      "Please try again after the quota resets."
  );
}

function createUnavailableError() {
  return new Error(
    "TechStore AI is temporarily busy.\n\n" +
      "The Gemini AI service is currently experiencing high demand.\n\n" +
      "Please try again in a few minutes. Your TechStore account, cart, and products are not affected."
  );
}

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "searchProducts",
        description:
          "Search active TechStore products by name, category, price, or rating. Use for product questions and recommendations.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: "Product keyword or name.",
            },
            category: {
              type: Type.STRING,
              description: "Product category.",
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

export async function generateChatbotResponse(
  message: string,
  userId?: number
) {
  const chatbotStart = performance.now();
  let response;

  // --------------------------------------------------
  // FIRST GEMINI REQUEST
  // Decide whether tools are required.
  // --------------------------------------------------

  try {
    response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: message.trim() }],
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
    });
    console.log(
      `Gemini first request: ${(performance.now() - chatbotStart).toFixed(0)} ms`
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

  // --------------------------------------------------
  // NO TOOL REQUIRED
  // --------------------------------------------------

  if (!functionCalls || functionCalls.length === 0) {
    return response.text ?? "Sorry, I could not generate a response.";
  }

  // --------------------------------------------------
  // EXECUTE TOOLS
  // Run independent tool calls in parallel.
  // --------------------------------------------------
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
  `Tool execution: ${(performance.now() - toolStart).toFixed(0)} ms`
);

  // --------------------------------------------------
  // SECOND GEMINI REQUEST
  // Generate the final natural-language response.
  // --------------------------------------------------

  let finalResponse;

  try {
    finalResponse = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: message.trim() }],
        },
        {
          role: "model",
          parts: response.candidates?.[0]?.content?.parts ?? [],
        },
        {
          role: "user",
          parts: functionResponses.map((item) => ({
            functionResponse: {
              ...item.functionResponse,
              response:
                item.functionResponse.response as Record<string, unknown>,
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
    });
    console.log(
      `Chatbot total time: ${(performance.now() - chatbotStart).toFixed(0)} ms`
    );
  } catch (error) {
    console.error("Gemini final request error:", error);

    if (isGeminiQuotaError(error)) {
      throw createQuotaError();
    }

    if (isGeminiUnavailableError(error)) {
      throw createUnavailableError();
    }

    throw error;
  }

  console.log("Final chatbot response:", {
    text: finalResponse.text,
    finishReason: finalResponse.candidates?.[0]?.finishReason,
  });

  return (
    finalResponse.text ??
    "I found the information, but I could not generate a response."
  );
}

