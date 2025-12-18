"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email && !phone) {
      setError("Please provide at least an email or phone number.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email || null,
          phone: phone || null,
          password,
          type: "grantor",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.message || "Unable to create account. Please try again.",
        );
      }

      // On successful registration, send user to login page
      router.push("/");
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
            Create Grantor Account
          </h1>
          {/* <p className="text-base md:text-lg text-slate-700 max-w-xl">
            Register your organization to start validating and managing
            scholarship applications in one secure workspace.
          </p> */}
        </div>

        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-md rounded-3xl bg-slate-950/20 backdrop-blur-xl border border-white/10 shadow-2xl shadow-purple-900/40 px-8 py-10">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold text-white mb-1">
                Create Account
              </h2>
              <p className="text-sm text-violet-100/80">
                Register as a grantor to access GrantIQ.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-violet-100/90">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-2xl bg-slate-900/60 border border-slate-700/80 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-violet-100/90">
                  Phone Number <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full rounded-2xl bg-slate-900/60 border border-slate-700/80 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-violet-100/90">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-2xl bg-slate-900/60 border border-slate-700/80 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-violet-100/90">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full rounded-2xl bg-slate-900/60 border border-slate-700/80 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
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
                {isLoading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-violet-100/80">
              Already have an account?
              {" "}
              <Link
                href="/"
                className="font-medium text-blue-700 hover:text-pink-200 underline underline-offset-4"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

