"use client";

import { useState } from "react";

type CategoryType = "SC" | "ST" | "Minority" | "Open" | "all";

export default function EngineRulesPage() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("all");
  const [totalSeats, setTotalSeats] = useState("");
  const [academicThreshold, setAcademicThreshold] = useState("");
  const [incomeThreshold, setIncomeThreshold] = useState("");
  const [ageThreshold, setAgeThreshold] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Fake submit - just log the values
    console.log("Form submitted:", {
      category: selectedCategory,
      totalSeats,
      academicThreshold,
      incomeThreshold,
      ageThreshold,
    });
    // You can add a toast notification here if needed
    alert("Rules saved successfully! (This is a fake submit)");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
            Engine Rules
          </h1>
          <p className="text-sm text-slate-700 mt-1 max-w-xl">
            Configure and manage the decision rules that power GrantIQ&apos;s
            validation and recommendation engine.
          </p>
        </div>
      </div>

      {/* Category Bar */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
          <p className="text-sm font-medium text-slate-900 mb-3">Categories</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("SC")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === "SC"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
              }`}
            >
              Scheduled Caste (SC)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("ST")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === "ST"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
              }`}
            >
              Scheduled Tribe (ST)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("Minority")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === "Minority"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
              }`}
            >
              Minority (Religious/Linguistic)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("Open")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === "Open"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
              }`}
            >
              Open / General
            </button>
          </div>
        </div>
      </div>

      {/* Rules Configuration Form */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">
            Configure Rules for{" "}
            {selectedCategory === "all"
              ? "All Categories"
              : selectedCategory === "SC"
                ? "Scheduled Caste (SC)"
                : selectedCategory === "ST"
                  ? "Scheduled Tribe (ST)"
                  : selectedCategory === "Minority"
                    ? "Minority (Religious/Linguistic)"
                    : "Open / General"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="totalSeats"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Total no of seats
                </label>
                <input
                  type="text"
                  id="totalSeats"
                  value={totalSeats}
                  onChange={(e) => setTotalSeats(e.target.value)}
                  placeholder="Enter total number of seats"
                  className="w-full rounded-lg bg-white border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="academicThreshold"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Academic threshold
                </label>
                <input
                  type="text"
                  id="academicThreshold"
                  value={academicThreshold}
                  onChange={(e) => setAcademicThreshold(e.target.value)}
                  placeholder="Enter academic threshold"
                  className="w-full rounded-lg bg-white border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="incomeThreshold"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Income threshold
                </label>
                <input
                  type="text"
                  id="incomeThreshold"
                  value={incomeThreshold}
                  onChange={(e) => setIncomeThreshold(e.target.value)}
                  placeholder="Enter income threshold"
                  className="w-full rounded-lg bg-white border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="ageThreshold"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Age threshold
                </label>
                <input
                  type="text"
                  id="ageThreshold"
                  value={ageThreshold}
                  onChange={(e) => setAgeThreshold(e.target.value)}
                  placeholder="Enter age threshold"
                  className="w-full rounded-lg bg-white border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                type="submit"
                className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-sm font-medium text-white transition-colors shadow-sm"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
