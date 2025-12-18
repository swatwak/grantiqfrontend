"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
};

const navItems = [
  {
    label: "Application Validation",
    href: "/dashboard/application-validation",
  },
  {
    label: "Scrutiny",
    href: "/dashboard/scrutiny",
    disabled: true,
  },
  {
    label: "Recommendation",
    href: "/dashboard/recommendation",
    disabled: true,
  },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState("Grantor");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored =
      window.localStorage.getItem("grantiq_user_label") ||
      window.localStorage.getItem("grantiq_email");
    if (stored && stored.trim().length > 0) {
      const label = stored.includes("@")
        ? stored.split("@")[0]
        : stored;
      setDisplayName(label);
    }
  }, []);

  function handleLogout() {
    window.localStorage.removeItem("grantiq_token");
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#349FC9] via-[#e5e7eb] to-[#e0f2fe] flex flex-col">
      <header className="h-16 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-[#fb7185] to-[#f97316] flex items-center justify-center shadow-lg shadow-pink-500/40">
            <span className="text-sm font-semibold text-white">IQ</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">GrantIQ</p>
            <p className="text-[11px] text-pink-200/80">
              Smart Scholarship Management Platform
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#fb7185] to-[#f97316] px-4 py-1.5 shadow-lg shadow-pink-500/30 text-white text-xs font-medium"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
              {/* simple person icon */}
              <span className="text-[13px]">👤</span>
            </span>
            <span className="hidden sm:inline">{displayName}</span>
            <span className="text-[11px]">▾</span>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-11 w-40 rounded-2xl bg-slate-950 border border-slate-700/80 shadow-xl shadow-slate-900/70 py-1 text-xs text-slate-100">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-slate-900/80 rounded-2xl"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 bg-slate-950/50 border-r border-white/10 backdrop-blur-xl hidden md:flex flex-col">
          <div className="px-5 pt-6 pb-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400 mb-4">
              Grantor Console
            </p>
            <h2 className="text-lg font-semibold text-white">
              Application Workflow
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Track and manage scholarship applications across all stages.
            </p>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);

              return (
                <button
                  key={item.label}
                  disabled={item.disabled}
                  onClick={() => {
                    if (!item.disabled) router.push(item.href);
                  }}
                  className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-3 text-sm transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-pink-500/90 to-orange-400/90 text-white shadow-lg shadow-pink-500/40"
                      : "text-slate-200 hover:bg-slate-900/70"
                  } ${item.disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] uppercase tracking-wide">
                    {item.disabled ? "Coming soon" : "Active"}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="px-4 py-4 border-t border-white/10 text-xs text-slate-300 flex items-center justify-between">
            <span className="text-slate-400">Manage GrantIQ engine settings</span>
            <button
              type="button"
              onClick={() => router.push("/dashboard/engine-rules")}
              className="inline-flex items-center rounded-full bg-slate-900/80 border border-slate-600/80 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-800/90"
            >
              Config
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

