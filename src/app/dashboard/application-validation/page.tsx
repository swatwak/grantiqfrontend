"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

type DashboardKPIs = {
  total_seats_available: number;
  total_applications_received: number;
  rejected_applications: number;
  verification_in_progress: number;
  grant_approved: number;
};

type CourseLevelData = {
  total_seats: number;
  total_applications: number;
};

type CourseData = {
  [level: string]: CourseLevelData;
};

type DashboardData = {
  [course: string]: CourseData;
};

type DashboardResponse = {
  success: boolean;
  kpis: DashboardKPIs;
  data: DashboardData;
};

type TableRow = {
  course: string;
  level: string;
  seatsAvailable: number;
  applicationsReceived: number;
  seatsGranted: number;
  status: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationInProgress, setVerificationInProgress] = useState<
    boolean | null
  >(null);

  const [runningRecom, setRunningRecom] = useState<Set<string>>(new Set());

  const getRunRecomData = (): string[] => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(
        localStorage.getItem("run_recommendation_data") ?? "[]"
      );
    } catch {
      return [];
    }
  };

  const setRunRecomDataLS = (data: string[]) => {
    localStorage.setItem("run_recommendation_data", JSON.stringify(data));
  };

  useEffect(() => {
    setVerificationInProgress(
      localStorage.getItem("verificationInProgress") === "true"
    );
  }, []);

  useEffect(() => {
    if (verificationInProgress !== null) {
      localStorage.setItem(
        "verificationInProgress",
        String(verificationInProgress)
      );
    }
  }, [verificationInProgress]);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      setError(null);

      try {
        const token =
          typeof window !== "undefined"
            ? window.localStorage.getItem("grantiq_token")
            : null;

        const response = await fetch(
          `${API_BASE_URL}/api/grantor/applications/dashboard-data`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(
            data.message || "Unable to load dashboard data. Please try again."
          );
        }

        const data = (await response.json()) as DashboardResponse;

        if (!data.success) {
          throw new Error("Unable to load dashboard data.");
        }

        setDashboardData(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboardData();
  }, []);

  // Transform dashboard data into table rows
  const tableRows: TableRow[] = dashboardData
    ? Object.entries(dashboardData.data).flatMap(([course, levels]) =>
        Object.entries(levels).map(([level, levelData]) => {
          let status: string;

          if (!verificationInProgress) {
            status = "Verification Completed";
          } else if (level === "PhD" && course === "Management") {
            status = "Verification Completed";
          } else {
            status = "Verification In Progress";
          }

          return {
            course,
            level,
            seatsAvailable: levelData.total_seats,
            applicationsReceived: levelData.total_applications,
            seatsGranted: 0,
            status,
          };
        })
      )
    : [];

  const completedRecombinations = new Set<string>(getRunRecomData());

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
          Foreign Scholarship Year 2026-27 Dashboard
        </h1>
        <div className="mt-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <span>
            <span className="font-medium">Academic Year:</span> 2026-27
          </span>
          <span>
            <span className="font-medium">
              Last Date of Application Submission:
            </span>{" "}
            31/03/2026
          </span>
          <span>
            <span className="font-medium">Current Status:</span>{" "}
            <span className="text-blue-600 font-medium">
              {verificationInProgress
                ? "Submission and verification in process"
                : "Verification completed"}
            </span>
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
          <p className="text-sm text-slate-600 mb-2">Total Seats Available</p>
          <p className="text-3xl font-semibold text-slate-900">
            {isLoading ? (
              <span className="text-slate-400">—</span>
            ) : dashboardData ? (
              dashboardData.kpis.total_seats_available
            ) : (
              "—"
            )}
          </p>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
          <p className="text-sm text-slate-600 mb-2">
            Total Applications Received
          </p>
          <p className="text-3xl font-semibold text-slate-900">
            {isLoading ? (
              <span className="text-slate-400">—</span>
            ) : dashboardData ? (
              dashboardData.kpis.total_applications_received
            ) : (
              "—"
            )}
          </p>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
          <p className="text-sm text-slate-600 mb-2">Verification Rejected</p>
          <p className="text-3xl font-semibold text-slate-900">
            {isLoading ? (
              <span className="text-slate-400">—</span>
            ) : dashboardData ? (
              dashboardData.kpis.rejected_applications
            ) : (
              "—"
            )}
          </p>
        </div>
        {
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-6">
            <p className="text-sm text-slate-600 mb-2">
              {verificationInProgress
                ? "Verification In Progress"
                : "Grant Approved"}
            </p>
            <p className="text-3xl font-semibold text-slate-900">
              {isLoading ? (
                <span className="text-slate-400">—</span>
              ) : dashboardData ? (
                verificationInProgress ? (
                  dashboardData.kpis.verification_in_progress
                ) : (
                  dashboardData.kpis.grant_approved
                )
              ) : (
                "—"
              )}
            </p>
          </div>
        }
      </div>

      {/* Course-wise Table */}
      <div className="flex-1 flex flex-col min-h-0 rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-900">
            Course-wise Applications vs Seats
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
          {error ? (
            <div className="px-6 py-6 text-sm text-rose-600 bg-rose-50">
              {error}
            </div>
          ) : isLoading ? (
            <div className="px-6 py-6 text-sm text-slate-600">
              Loading dashboard data...
            </div>
          ) : tableRows.length === 0 ? (
            <div className="px-6 py-6 text-sm text-slate-600">
              No data available.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-600 border-b border-slate-200">
                  <th className="px-6 py-3 font-semibold">Course</th>
                  <th className="px-6 py-3 font-semibold">Level</th>
                  <th className="px-6 py-3 font-semibold">Seats Available</th>
                  <th className="px-6 py-3 font-semibold">
                    Applications Received
                  </th>
                  <th className="px-6 py-3 font-semibold">Seats Granted</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  {!verificationInProgress && (
                    <th className="px-6 py-3 font-semibold text-right">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, index) => (
                  <tr
                    key={`${row.course}-${row.level}-${index}`}
                    className={`border-t border-slate-100 ${
                      index % 2 === 0 ? "bg-white" : "bg-slate-50"
                    }`}
                  >
                    <td className="px-6 py-4 text-slate-900 font-medium">
                      {row.course}
                    </td>
                    <td className="px-6 py-4 text-slate-700">{row.level}</td>
                    <td className="px-6 py-4 text-slate-700">
                      {row.seatsAvailable}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {row.applicationsReceived}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {row.seatsGranted}
                    </td>
                    <td
                      onClick={() => {
                        router.push(
                          `/dashboard/recommendation?courseType=${encodeURIComponent(
                            row.level
                          )}&courseField=${encodeURIComponent(row.course)}`
                        );
                      }}
                      className="px-6 py-4 cursor-pointer"
                    >
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${
                          row.status === "Verification Completed"
                            ? "bg-blue-100 text-blue-700 border-blue-200"
                            : row.status === "Verification In Progress"
                            ? "bg-amber-100 text-amber-700 border-amber-200"
                            : "bg-green-100 text-green-700 border-green-200"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    {!verificationInProgress && (
                      <td className="px-6 py-4 text-right">
                        {(() => {
                          const key = `${row.level}:${row.course}`;
                          const isCompleted = completedRecombinations.has(key);
                          const isRunning = runningRecom.has(key);

                          if (isCompleted) {
                            return (
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/dashboard/recommendation?courseType=${encodeURIComponent(
                                      row.level
                                    )}&courseField=${encodeURIComponent(
                                      row.course
                                    )}`
                                  )
                                }
                                className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                              >
                                View Recommendation
                              </button>
                            );
                          }

                          return (
                            <button
                              type="button"
                              disabled={isRunning}
                              onClick={() => {
                                setRunningRecom((prev) =>
                                  new Set(prev).add(key)
                                );

                                setTimeout(() => {
                                  setRunningRecom((prev) => {
                                    const next = new Set(prev);
                                    next.delete(key);
                                    return next;
                                  });

                                  const existing = getRunRecomData();
                                  if (!existing.includes(key)) {
                                    setRunRecomDataLS([...existing, key]);
                                  }
                                }, 5000);
                              }}
                              className="inline-flex items-center rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-70"
                            >
                              {isRunning ? "Running..." : "Run Recommendation"}
                            </button>
                          );
                        })()}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
