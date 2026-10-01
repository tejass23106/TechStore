import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  MailCheck,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type VerificationState =
  | "verifying"
  | "success"
  | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();

  const [status, setStatus] =
    useState<VerificationState>("verifying");

  const [message, setMessage] = useState(
    "Verifying your email address..."
  );

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage(
        "The email verification link is invalid or incomplete."
      );
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(
          `${API_URL}/auth/verify-email?token=${encodeURIComponent(
            token
          )}`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to verify your email."
          );
        }

        setStatus("success");
        setMessage(
          data.message ||
            "Your email has been verified successfully."
        );
      } catch (error) {
        console.error(
          "Email verification error:",
          error
        );

        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to verify your email."
        );
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        {status === "verifying" && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <Loader2
                className="h-10 w-10 animate-spin text-black"
                aria-hidden="true"
              />
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              Verifying your email
            </h1>

            <p className="mt-3 text-gray-600">
              Please wait while we verify your
              email address.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2
                className="h-10 w-10 text-green-600"
                aria-hidden="true"
              />
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              Email verified
            </h1>

            <p className="mt-3 text-gray-600">
              {message}
            </p>

            <div className="mt-8">
              <Link
                to="/account"
                className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Go to Account
              </Link>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <XCircle
                className="h-10 w-10 text-red-600"
                aria-hidden="true"
              />
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              Verification failed
            </h1>

            <p className="mt-3 text-gray-600">
              {message}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/account"
                className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Go to Account
              </Link>

              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
              >
                <MailCheck
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

