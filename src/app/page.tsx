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
      const body =
        identifier.includes("@")
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
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#349FC9] via-[#e5e7eb] to-[#e0f2fe] flex items-center justify-center px-4 py-10">
      <div className="max-w-6xl w-full flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 text-center lg:text-left text-slate-900">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#fb7185] to-[#f97316] flex items-center justify-center shadow-lg shadow-pink-500/40">
              <span className="text-2xl font-semibold">IQ</span>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-pink-500/80">
                GrantIQ
              </p>
              <p className="text-base font-semibold text-pink-600">
                Smart Scholarship Management for Grantors
              </p>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-4 text-slate-900">
            Welcome Back,
            <br />
            <span className="text-pink-600">Grantor</span>
          </h1>
          <p className="text-base md:text-lg text-slate-700 max-w-xl">
            Sign in to validate, scrutinize, and recommend scholarship applications
            with a streamlined workflow.
          </p>
        </div>

        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-md rounded-3xl bg-slate-950/20 backdrop-blur-xl border border-white/10 shadow-2xl shadow-purple-900/40 px-8 py-10">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold text-white mb-1">
                Sign In
              </h2>
              <p className="text-sm text-violet-100/80">
                Use your grantor credentials to access GrantIQ.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-violet-100/90">
                  Email or Phone
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your email or phone"
                    className="w-full rounded-2xl bg-slate-900/60 border border-slate-700/80 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-violet-100/90">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-2xl bg-slate-900/60 border border-slate-700/80 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-pink-300 bg-pink-950/40 border border-pink-500/40 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#fb7185] to-[#f97316] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-pink-500/40 transition-transform hover:translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-violet-100/80">
              Don&apos;t have an account?
              {" "}
              <Link
                href="/register"
                className="font-medium text-blue-700 hover:text-pink-200 underline underline-offset-4"
              >
                Register
              </Link>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-900/80 border border-slate-700/70 px-4 py-3 text-xs text-slate-300 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-pink-500/20 text-pink-300 text-xs font-semibold">
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
