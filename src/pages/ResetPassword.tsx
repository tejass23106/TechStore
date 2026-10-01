import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const API_URL =
import.meta.env.VITE_API_URL ||
"http://localhost:5000/api";

export default function ResetPassword() {
const navigate = useNavigate();
const [searchParams] = useSearchParams();

const token = searchParams.get("token");

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] =
useState("");

const [loading, setLoading] = useState(true);
const [resetting, setResetting] = useState(false);

const [error, setError] = useState("");
const [success, setSuccess] = useState("");

useEffect(() => {
async function verifyToken() {
if (!token) {
setError("Invalid or missing reset token.");
setLoading(false);
return;
}


  try {
    const response = await fetch(
      `${API_URL}/auth/verify-reset-token?token=${encodeURIComponent(
        token
      )}`,
      {
        method: "POST",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Invalid or expired reset token"
      );
    }

    setEmail(data.user.email);
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "Unable to verify reset token"
    );
  } finally {
    setLoading(false);
  }
}

verifyToken();


}, [token]);

async function handleSubmit(
event: FormEvent<HTMLFormElement>
) {
event.preventDefault();


setError("");
setSuccess("");

if (!token) {
  setError("Invalid or missing reset token.");
  return;
}

if (password.length < 6) {
  setError(
    "Password must be at least 6 characters."
  );
  return;
}

if (password !== confirmPassword) {
  setError("Passwords do not match.");
  return;
}

setResetting(true);

try {
  const response = await fetch(
    `${API_URL}/auth/reset-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        password,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to reset password"
    );
  }

  setSuccess(
    "Password reset successful. Redirecting to login..."
  );

  setTimeout(() => {
    navigate("/login");
  }, 1500);
} catch (error) {
  setError(
    error instanceof Error
      ? error.message
      : "Failed to reset password"
  );
} finally {
  setResetting(false);
}


}

return ( <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4"> <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg"> <div className="mb-8 text-center"> <h1 className="text-3xl font-bold text-gray-900">
Reset Password </h1>

```
      <p className="mt-2 text-gray-500">
        Create a new password for your TechStore
        account.
      </p>
    </div>

    {loading && (
      <div className="mb-5 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Verifying reset link...
      </div>
    )}

    {error && (
      <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
        {error}
      </div>
    )}

    {success && (
      <div className="mb-5 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
        {success}
      </div>
    )}

    {!loading && !error && !success && (
      <>
        {email && (
          <div className="mb-5 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Resetting password for{" "}
            <span className="font-semibold text-gray-900">
              {email}
            </span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              New Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter new password"
              minLength={6}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="Confirm new password"
              minLength={6}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
            />
          </div>

          <p className="text-xs text-gray-400">
            Password must contain at least 6 characters.
          </p>

          <button
            type="submit"
            disabled={resetting}
            className="w-full rounded-lg bg-black px-4 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resetting
              ? "Resetting..."
              : "Reset Password"}
          </button>
        </form>
      </>
    )}

    <p className="mt-6 text-center text-sm text-gray-500">
      <Link
        to="/login"
        className="font-semibold text-black hover:underline"
      >
        Back to Login
      </Link>
    </p>
  </div>
</main>

);
}
