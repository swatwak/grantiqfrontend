"use client";

export default function EngineRulesPage() {
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

      <div className="rounded-3xl bg-slate-950/40 border border-white/10 backdrop-blur-xl shadow-xl shadow-purple-900/40 px-6 py-6 text-sm text-slate-200">
        <p>
          This is a placeholder for the Engine Rules configuration page. You can
          extend this view with rule lists, toggles, and workflows based on your
          backend APIs.
        </p>
      </div>
    </div>
  );
}

