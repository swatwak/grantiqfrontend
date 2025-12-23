"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export default function Home() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!identifier || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);
    try {
      const body = identifier.includes("@")
        ? { email: identifier, phone: null, password, type: "grantor" }
        : { email: null, phone: identifier, password, type: "grantor" };

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to sign in. Please try again.");
      }

      const data = await response.json().catch(() => null);
      if (data && data.token) {
        window.localStorage.setItem("grantiq_token", data.token);
        const userLabel = identifier.includes("@")
          ? identifier.split("@")[0]
          : identifier;
        window.localStorage.setItem("grantiq_user_label", userLabel);
      }

      router.push("/dashboard/application-validation");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="max-w-6xl w-full flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <span className="text-2xl font-semibold text-white">IQ</span>
            </div>
            <div>
              <p className="text-sm uppercase tracking-wider text-blue-600 font-semibold">
                GrantIQ
              </p>
              <p className="text-base font-semibold text-slate-700">
                Smart Scholarship Management for Grantors
              </p>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-4 text-slate-900">
            Welcome Back,
            <br />
            <span className="text-blue-600">Grantor</span>
          </h1>
          <p className="text-base md:text-lg text-slate-600 max-w-xl">
            Sign in to validate, scrutinize, and recommend scholarship
            applications with a streamlined workflow.
          </p>
        </div>

        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-lg px-8 py-10">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold text-slate-900 mb-1">
                Sign In
              </h2>
              <p className="text-sm text-slate-600">
                Use your grantor credentials to access GrantIQ.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Email or Phone
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your email or phone"
                    className="w-full rounded-lg bg-white border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg bg-white border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-blue-600 hover:text-blue-700 underline underline-offset-4"
              >
                Register
              </Link>
            </div>

            <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-slate-700 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold">
                ⚡
              </span>
              <p>
                Your validation progress is saved automatically. You can sign in
                anytime to continue reviewing applications.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
