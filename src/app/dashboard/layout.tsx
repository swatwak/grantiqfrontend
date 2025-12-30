"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import VerificationEvents from "@/utils/events";

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
  },
  {
    label: "Recommendation",
    href: "/dashboard/recommendation",
    disabled: false,
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
      const label = stored.includes("@") ? stored.split("@")[0] : stored;
      setDisplayName(label);
    }
  }, []);

  function handleLogout() {
    window.localStorage.removeItem("grantiq_token");
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <VerificationEvents />
      <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Image
            src="/logo_dark.png"
            alt="GrantIQ Logo"
            width={120}
            height={36}
          />
          {/* <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
            <span className="text-sm font-semibold text-white">IQ</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">GrantIQ</p>
            <p className="text-[11px] text-slate-600">
              Smart Scholarship Management Platform
            </p>
          </div> */}
        </div>

        <div className="relative flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
          >
            {/* <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
              <span className="text-[13px]">👤</span>
            </span> */}
            <span className="hidden sm:inline">{displayName}</span>
            <span className="text-[11px]">▾</span>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-12 w-40 rounded-lg bg-white border border-slate-200 shadow-lg py-1 text-xs text-slate-700">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 bg-white border-r border-slate-200 hidden md:flex flex-col">
          <div className="px-5 pt-6 pb-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-4 font-semibold">
              Grantor Console
            </p>
            <h2 className="text-lg font-semibold text-slate-900">
              Application Workflow
            </h2>
            <p className="text-xs text-slate-600 mt-1">
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
                  className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-3 text-sm transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-100"
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

          <div className="px-4 py-4 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span className="text-slate-500">
              Manage GrantIQ engine settings
            </span>
            <button
              type="button"
              onClick={() => router.push("/dashboard/engine-rules")}
              className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-300 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-200 transition-colors"
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
