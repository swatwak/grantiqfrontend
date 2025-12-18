"use client";

import { useEffect, useState } from "react";

type ApiApplicationStatus = string;

type ApiApplication = {
  id: number;
  application_id: string;
  full_name: string | null;
  father_name: string | null;
  mother_name: string | null;
  marital_status: string | null;
  gender: string | null;
  mother_tongue: string | null;
  dob_year: number | null;
  dob_month: number | null;
  dob_day: number | null;
  aadhaar_number: string | null;
  aadhaar_verified: boolean;
  pan_number: string | null;
  pan_verified: boolean;
  tribe: string | null;
  st_certificate_number: string | null;
  certificate_issue_date: string | null;
  caste_validity_cert_number: string | null;
  caste_validity_issue_date: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  application_status: ApiApplicationStatus;
  current_step: number;
  submitted_at: string | null;
  updated_at: string;
};

type ApiResponse = {
  success: boolean;
  message: string;
  data: ApiApplication[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

function statusStyles(status: ApiApplicationStatus) {
  const normalized = status.toLowerCase();

  if (normalized === "draft" || normalized === "pending") {
    return "bg-amber-500/15 text-amber-300 border border-amber-400/40";
  }

  if (normalized === "under_review" || normalized === "under review") {
    return "bg-sky-500/15 text-sky-300 border border-sky-400/40";
  }

  if (normalized === "approved") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-400/40";
  }

  if (normalized === "rejected") {
    return "bg-rose-500/15 text-rose-300 border border-rose-400/40";
  }

  return "bg-slate-500/15 text-slate-200 border border-slate-400/40";
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ApplicationValidationPage() {
  const [applications, setApplications] = useState<ApiApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | ApiApplicationStatus>(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedApplication, setSelectedApplication] =
    useState<ApiApplication | null>(null);
  const [isViewDocsLoading, setIsViewDocsLoading] = useState(false);
  const [viewDocsError, setViewDocsError] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>("form16");

  useEffect(() => {
    async function loadApplications() {
      setIsLoading(true);
      setError(null);

      try {
        const token =
          typeof window !== "undefined"
            ? window.localStorage.getItem("grantiq_token")
            : null;

        const response = await fetch(
          `${API_BASE_URL}/api/grantor/applications/all`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as
            | Partial<ApiResponse>
            | undefined;
          throw new Error(
            (data && data.message) ||
              "Unable to load applications. Please try again.",
          );
        }

        const data = (await response.json()) as ApiResponse;

        if (!data.success) {
          throw new Error(data.message || "Unable to load applications.");
        }

        setApplications(data.data || []);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadApplications();
  }, []);

  const filteredAndSortedApplications = applications
    .filter((application) => {
      const normalizedStatus = application.application_status.toLowerCase();
      const normalizedFilter = statusFilter.toLowerCase();

      if (normalizedFilter !== "all" && normalizedStatus !== normalizedFilter) {
        return false;
      }

      if (!searchQuery.trim()) return true;

      const query = searchQuery.trim().toLowerCase();
      const name = (application.full_name || "").toLowerCase();
      const appId = (application.application_id || "").toLowerCase();

      return name.includes(query) || appId.includes(query);
    })
    .sort((a, b) => {
      const aDate = a.submitted_at ? new Date(a.submitted_at) : null;
      const bDate = b.submitted_at ? new Date(b.submitted_at) : null;

      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;

      return sortOrder === "asc"
        ? aDate.getTime() - bDate.getTime()
        : bDate.getTime() - aDate.getTime();
    });
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
            Application Validation
          </h1>
          <p className="text-sm text-slate-700 mt-1 max-w-xl">
            Review and validate incoming scholarship applications before moving
            them to scrutiny and recommendation stages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end text-xs text-slate-200">
            <span>Step 1 of 3</span>
            <span className="text-slate-400">Validation → Scrutiny → Recommendation</span>
          </div>
          <div className="h-10 rounded-full bg-slate-950/60 border border-slate-700/80 px-4 flex items-center gap-2 text-xs text-slate-100">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-pink-500/30 text-[11px]">
              1
            </span>
            <span>Validation Stage</span>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-slate-950/40 border border-white/10 backdrop-blur-xl shadow-xl shadow-purple-900/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded-xl bg-pink-500/20 text-pink-300 flex items-center justify-center text-base">
              🔍
            </span>
            <div>
              <p className="text-sm font-medium text-white">
                Validation Queue
              </p>
              <p className="text-xs text-slate-300">
                {isLoading
                  ? "Loading applications..."
                  : `${filteredAndSortedApplications.length} applications in queue`}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs text-slate-200 w-full sm:w-auto">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by applicant name or application ID"
                className="w-full rounded-full bg-slate-900/70 border border-slate-700/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-slate-400">Status</span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | ApiApplicationStatus)
                }
                className="rounded-full bg-slate-900/70 border border-slate-700/80 px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          {error ? (
            <div className="px-5 py-6 text-sm text-rose-200">
              {error}
            </div>
          ) : applications.length === 0 && !isLoading ? (
            <div className="px-5 py-6 text-sm text-slate-200">
              No applications found yet. Once students start submitting, they
              will appear here for validation.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-950/70 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Applicant Name</th>
                  <th className="px-5 py-3 font-medium">Application ID</th>
                  <th className="px-5 py-3 font-medium">Current Step</th>
                  <th className="px-5 py-3 font-medium">Application Status</th>
                  <th className="px-5 py-3 font-medium">
                    <button
                      type="button"
                      onClick={() =>
                        setSortOrder((prev) =>
                          prev === "asc" ? "desc" : "asc",
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white"
                    >
                      Submitted At
                      <span className="text-[10px]">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    </button>
                  </th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedApplications.map((application, index) => (
                  <tr
                    key={application.id}
                    className={`border-t border-slate-800/80 ${
                      index % 2 === 0 ? "bg-slate-950/40" : "bg-slate-950/20"
                    }`}
                  >
                    <td className="px-5 py-3 text-slate-100">
                      {application.full_name || "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-200 font-mono text-[13px]">
                      {application.application_id}
                    </td>
                    <td className="px-5 py-3 text-slate-200 text-xs">
                      Step {application.current_step}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${statusStyles(
                          application.application_status,
                        )}`}
                      >
                        {application.application_status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-300 text-xs">
                      {application.submitted_at
                        ? formatDate(application.submitted_at)
                        : "Not submitted"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedApplication(application)}
                        className="inline-flex items-center rounded-full bg-slate-900/70 border border-slate-600/80 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-800/90"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedApplication && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-5xl rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-900/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 bg-gradient-to-r from-[#349FC9] via-[#60a5fa] to-[#e0f2fe]">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-sky-100/90 mb-1">
                  Application Overview
                </p>
                <h2 className="text-lg font-semibold text-white">
                  {selectedApplication.full_name || "Unnamed Applicant"}
                </h2>
                <p className="text-xs text-sky-100/90 mt-1">
                  ID:{" "}
                  <span className="font-mono">
                    {selectedApplication.application_id}
                  </span>
                  {" · "}
                  Step {selectedApplication.current_step} · Status:{" "}
                  <span className="capitalize font-medium">
                    {selectedApplication.application_status}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApplication(null)}
                className="text-black hover:text-black-500 text-sm px-2 py-1 rounded-lg bg-black/50 hover:bg-black/10"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[70vh] overflow-y-auto bg-slate-50">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Identity Details
                </h3>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Full Name</span>
                    <span className="font-medium text-right">
                      {selectedApplication.full_name || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Aadhaar Number</span>
                    <span className="font-medium text-right">
                      {selectedApplication.aadhaar_number || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">PAN Number</span>
                    <span className="font-medium text-right">
                      {selectedApplication.pan_number || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Date of Birth</span>
                    <span className="font-medium text-right">
                      {selectedApplication.dob_year &&
                      selectedApplication.dob_month &&
                      selectedApplication.dob_day
                        ? `${selectedApplication.dob_day}/${selectedApplication.dob_month}/${selectedApplication.dob_year}`
                        : "—"}
                    </span>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Personal Details
                </h3>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Father&apos;s Name</span>
                    <span className="font-medium text-right">
                      {selectedApplication.father_name || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Mother&apos;s Name</span>
                    <span className="font-medium text-right">
                      {selectedApplication.mother_name || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Gender</span>
                    <span className="font-medium text-right capitalize">
                      {selectedApplication.gender || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Marital Status</span>
                    <span className="font-medium text-right capitalize">
                      {selectedApplication.marital_status || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Mother Tongue</span>
                    <span className="font-medium text-right">
                      {selectedApplication.mother_tongue || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Phone</span>
                    <span className="font-medium text-right">
                      {selectedApplication.phone || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Email</span>
                    <span className="font-medium text-right">
                      {selectedApplication.email || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Address</span>
                    <span className="font-medium text-right">
                      {selectedApplication.address ||
                      selectedApplication.city ||
                      selectedApplication.state ||
                      selectedApplication.pincode
                        ? [
                            selectedApplication.address,
                            selectedApplication.city,
                            selectedApplication.state,
                            selectedApplication.pincode,
                          ]
                            .filter(Boolean)
                            .join(", ")
                        : "—"}
                    </span>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Document Details
                  </h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedDocType}
                      onChange={(e) => setSelectedDocType(e.target.value)}
                      className="rounded-full bg-white border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                    >
                      <option value="form16">Form 16</option>
                      <option value="caste_certificate">Caste Certificate</option>
                      <option value="marksheet_10th">10th Marksheet</option>
                      <option value="marksheet_12th">12th Marksheet</option>
                      <option value="marksheet_graduation">
                        Graduation Marksheet
                      </option>
                    </select>
                    <button
                      type="button"
                      disabled={isViewDocsLoading || !selectedDocType}
                      onClick={async () => {
                        if (!selectedApplication || !selectedDocType) return;
                        setViewDocsError(null);
                        setIsViewDocsLoading(true);
                        try {
                          const token =
                            typeof window !== "undefined"
                              ? window.localStorage.getItem("grantiq_token")
                              : null;

                          const response = await fetch(
                            `${API_BASE_URL}/api/grantor/applications/view-documents`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                              },
                              body: JSON.stringify({
                                application_id: selectedApplication.application_id,
                                type: selectedDocType,
                              }),
                            },
                          );

                          const rawError = await (async () => {
                            if (response.ok) return null;
                            const json = (await response
                              .json()
                              .catch(() => ({}))) as {
                              message?: string;
                              detail?: string;
                            };

                            if (response.status === 404 && json.detail) {
                              return json.detail;
                            }

                            return (
                              json.message ||
                              json.detail ||
                              "Unable to fetch documents. Please try again."
                            );
                          })();

                          if (rawError) {
                            throw new Error(rawError);
                          }

                          const data = (await response.json().catch(() => ({}))) as {
                            url?: string;
                            presigned_url?: string;
                            data?: { url?: string; presigned_url?: string };
                          };

                          const url =
                            data.presigned_url ||
                            data.url ||
                            data.data?.presigned_url ||
                            data.data?.url;

                          if (!url) {
                            throw new Error("Document URL not available.");
                          }

                          if (typeof window !== "undefined") {
                            window.open(url, "_blank", "noopener,noreferrer");
                          }
                        } catch (err) {
                          const message =
                            err instanceof Error
                              ? err.message
                              : "Something went wrong while opening documents.";
                          setViewDocsError(message);
                        } finally {
                          setIsViewDocsLoading(false);
                        }
                      }}
                      className="inline-flex items-center rounded-full bg-sky-600 border border-sky-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isViewDocsLoading ? "Opening..." : "View Documents"}
                    </button>
                  </div>
                </div>

                {viewDocsError && (
                  <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                    {viewDocsError}
                  </p>
                )}

                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Tribe</span>
                    <span className="font-medium text-right">
                      {selectedApplication.tribe || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">ST Certificate No.</span>
                    <span className="font-medium text-right">
                      {selectedApplication.st_certificate_number || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">ST Certificate Issue</span>
                    <span className="font-medium text-right">
                      {selectedApplication.certificate_issue_date
                        ? formatDate(selectedApplication.certificate_issue_date)
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">
                      Caste Validity Cert No.
                    </span>
                    <span className="font-medium text-right">
                      {selectedApplication.caste_validity_cert_number || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">
                      Caste Validity Issue
                    </span>
                    <span className="font-medium text-right">
                      {selectedApplication.caste_validity_issue_date
                        ? formatDate(
                            selectedApplication.caste_validity_issue_date,
                          )
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Aadhaar Verified</span>
                    <span className="font-medium text-right">
                      {selectedApplication.aadhaar_verified ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">PAN Verified</span>
                    <span className="font-medium text-right">
                      {selectedApplication.pan_verified ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  University Details
                </h3>
                <p className="text-xs text-slate-700">
                  University and course details will appear here once the
                  applicant completes the academic section of the application.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

