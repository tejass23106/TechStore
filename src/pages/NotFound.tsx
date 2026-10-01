import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-6xl font-bold">404</h1>

      <p className="mt-4">
        Page not found
      </p>

      <Link
        to="/"
        className="mt-6 rounded-lg bg-black px-5 py-3 text-white"
      >
        Go Home
      </Link>
    </main>
  );
}