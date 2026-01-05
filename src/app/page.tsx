"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

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
    <div className="min-h-screen app-background flex items-center justify-center px-4 py-10">
      <div className="max-w-6xl w-full flex flex-col lg:flex-row items-center gap-16 relative z-10">
        <div className="flex-1 text-center lg:text-left">
          <div className="mb-6">
            <Image
              src="/logo_dark.svg"
              alt="GrantIQ Logo"
              width={180}
              height={54}
              priority
            />
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
          <div className="w-full max-w-md rounded-[20px] bg-slate-900 border border-slate-900 shadow-2xl px-8 py-10">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold text-white mb-1">
                Sign In
              </h2>
              <p className="text-sm text-slate-300">
                Use your grantor credentials to access GrantIQ.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Email or Phone
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full rounded-lg bg-slate-700 border border-slate-600 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg bg-slate-700 border border-slate-600 pl-10 pr-10 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-300 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-4 py-3 text-sm font-medium text-white shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? "Signing In..." : (
                  <>
                    Sign In
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-300">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-blue-400 hover:text-blue-300 underline underline-offset-4"
              >
                Register
              </Link>
            </div>

            <div className="mt-6 rounded-lg bg-slate-700/50 border border-slate-600 px-4 py-3 text-xs text-blue-400 flex items-center gap-2">
              <span className="text-blue-400 text-sm font-semibold">*</span>
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
