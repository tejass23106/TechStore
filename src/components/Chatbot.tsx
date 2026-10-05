import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface Message {
  role: "user" | "bot";
  text: string;
}

const chatbotExamples = [
  'Try: "Show me laptops"',
  'Try: "Find phones under ₹50,000"',
  'Try: "Add OnePlus 13 to the cart"',
  'Try: "Show me my cart"',
  'Try: "Compare available phones"',
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [exampleIndex, setExampleIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Hi! I'm the TechStore assistant. I can help you find products, answer product questions, and manage your cart.",
    },
  ]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setExampleIndex((index) =>
        index === chatbotExamples.length - 1 ? 0 : index + 1
      );
    }, 3000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  async function sendMessage() {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || loading) {
      return;
    }

    setMessages((previousMessages) => [
      ...previousMessages,
      {
        role: "user",
        text: trimmedMessage,
      },
    ]);

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/chatbot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          message: trimmedMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to contact the TechStore AI assistant."
        );
      }

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "bot",
          text:
            data.reply ||
            "Sorry, I couldn't generate a response.",
        },
      ]);
    } catch (error) {
      console.error("Chatbot error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Sorry, something went wrong. Please try again.";

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "bot",
          text: errorMessage,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      sendMessage();
    }
  }

  function useExample(example: string) {
    const cleanExample = example
      .replace(/^Try:\s*/, "")
      .replace(/^"|"$/g, "");

    setMessage(cleanExample);
  }

  return (
    <>
      {/* Chatbot Button */}
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-black text-sm font-medium text-white shadow-lg transition hover:scale-105 hover:bg-gray-800"
        aria-label="Open TechStore chatbot"
      >
        {isOpen ? "X" : "Chat"}
      </button>

      {/* Chatbot */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[360px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between bg-black px-4 py-4 text-white">
            <div>
              <h2 className="font-semibold">
                TechStore Assistant
              </h2>

              <p className="text-xs text-gray-300">
                Product & cart assistance
              </p>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-xl text-gray-300 hover:text-white"
              aria-label="Close chatbot"
            >
              X
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
            {messages.map((item, index) => (
              <div
                key={index}
                className={`flex ${
                  item.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    item.role === "user"
                      ? "rounded-br-md bg-black text-white"
                      : "rounded-bl-md bg-white text-gray-800 shadow-sm"
                  }`}
                >
                  {item.role === "bot" ? (
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => (
                          <h1 className="mb-2 text-base font-bold text-gray-900">
                            {children}
                          </h1>
                        ),

                        h2: ({ children }) => (
                          <h2 className="mb-2 text-sm font-bold text-gray-900">
                            {children}
                          </h2>
                        ),

                        h3: ({ children }) => (
                          <h3 className="mb-1 text-sm font-semibold text-gray-900">
                            {children}
                          </h3>
                        ),

                        p: ({ children }) => (
                          <p className="mb-2 leading-6 last:mb-0">
                            {children}
                          </p>
                        ),

                        ul: ({ children }) => (
                          <ul className="mb-2 list-disc space-y-1 pl-5">
                            {children}
                          </ul>
                        ),

                        ol: ({ children }) => (
                          <ol className="mb-2 list-decimal space-y-1 pl-5">
                            {children}
                          </ol>
                        ),

                        li: ({ children }) => (
                          <li className="leading-5">
                            {children}
                          </li>
                        ),

                        strong: ({ children }) => (
                          <strong className="font-semibold text-gray-900">
                            {children}
                          </strong>
                        ),
                      }}
                    >
                      {item.text}
                    </ReactMarkdown>
                  ) : (
                    item.text
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-white px-4 py-2 text-sm text-gray-500 shadow-sm">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input Section */}
          <div className="border-t border-gray-200 bg-white p-3">

            {/* Visible Example */}
            <button
              type="button"
              onClick={() =>
                useExample(chatbotExamples[exampleIndex])
              }
              className="mb-2 block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs text-gray-600 transition hover:border-gray-400 hover:bg-gray-100"
            >
              {chatbotExamples[exampleIndex]}
            </button>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="Ask about products or your cart..."
                disabled={loading}
                className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
              />

              <button
                type="button"
                onClick={sendMessage}
                disabled={loading || !message.trim()}
                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

