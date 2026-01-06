"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type ApiApplicationStatus = string;

type VerificationResult = {
  success: boolean;
  message: string;
  data: any;
  is_eligible: boolean | null;
};

type ValidationResultData = {
  success: boolean;
  message: string;
  application_id: string;
  verification_results: {
    [docType: string]: VerificationResult;
  };
  overall_success: boolean;
  overall_eligible: boolean;
};

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
  validation_result: string | null;
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

  if (normalized === "in_progress") {
    return "bg-blue-500/15 text-blue-600 border border-blue-400/40";
  }

  if (normalized === "submitted") {
    return "bg-amber-500/15 text-amber-600 border border-amber-400/40";
  }

  if (normalized === "verified") {
    return "bg-emerald-500/15 text-emerald-600 border border-emerald-400/40";
  }

  if (normalized === "rejected") {
    return "bg-rose-500/15 text-rose-600 border border-rose-400/40";
  }

  if (normalized === "validation_in_progress") {
    return "bg-yellow-500/15 text-yellow-600 border border-yellow-400/40";
  }

  if (normalized === "accepted") {
    return "bg-green-500/15 text-green-600 border border-green-400/40";
  }

  return "bg-slate-500/15 text-slate-600 border border-slate-400/40";
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

function parseValidationResult(
  validationResultStr: string | null
): ValidationResultData | null {
  if (!validationResultStr) return null;

  try {
    return JSON.parse(validationResultStr) as ValidationResultData;
  } catch {
    try {
      const jsCode = validationResultStr
        .replace(/\bTrue\b/g, "true")
        .replace(/\bFalse\b/g, "false")
        .replace(/\bNone\b/g, "null");

      const result = new Function(`return ${jsCode}`)();
      return JSON.parse(JSON.stringify(result)) as ValidationResultData;
    } catch (error) {
      console.error("Failed to parse validation_result:", error);
      try {
        const jsonStr = validationResultStr
          .replace(/\bTrue\b/g, "true")
          .replace(/\bFalse\b/g, "false")
          .replace(/\bNone\b/g, "null")
          .replace(/'/g, '"');
        return JSON.parse(jsonStr) as ValidationResultData;
      } catch {
        return null;
      }
    }
  }
}

function getDocumentTypeLabel(docType: string): string {
  const labels: { [key: string]: string } = {
    form16: "Form 16 (Income)",
    caste_certificate: "Caste Certificate",
    marksheet_10th: "10th Marksheet",
    marksheet_12th: "12th Marksheet",
    marksheet_graduation: "Graduation Marksheet",
    offer_letter: "Offer Letter",
    bank_passbook: "Bank Passbook",
    statement_of_purpose: "Statement of Purpose",
    cv: "CV/Resume",
  };
  return labels[docType] || docType.replace(/_/g, " ");
}

export default function ApplicationValidationPage() {
  const [applications, setApplications] = useState<ApiApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | ApiApplicationStatus
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedApplication, setSelectedApplication] =
    useState<ApiApplication | null>(null);
  const [isViewDocsLoading, setIsViewDocsLoading] = useState(false);
  const [viewDocsError, setViewDocsError] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>("form16");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [verificationResults, setVerificationResults] = useState<any>(null);
  const [verificationProgress, setVerificationProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get status from URL or default to "submitted"
  const getInitialStatus = () => {
    const status = searchParams.get("status");
    if (status === "submitted" || status === "rejected") {
      return status;
    }
    return "submitted";
  };

  const [actionFilter, setActionFilter] = useState<"submitted" | "rejected">(
    getInitialStatus()
  );

  // Sync URL params with state on mount
  useEffect(() => {
    const status = searchParams.get("status");
    if (!status) {
      // If no status in URL, set it to default "submitted"
      const params = new URLSearchParams();
      params.set("status", "submitted");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, []);

  // Update URL when filter changes (but not on initial mount to avoid double update)
  useEffect(() => {
    const currentStatus = searchParams.get("status");
    if (currentStatus !== actionFilter) {
      const params = new URLSearchParams();
      params.set("status", actionFilter);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [actionFilter, router]);

  useEffect(() => {
    async function loadApplications() {
      setIsLoading(true);
      setError(null);

      try {
        const token =
          typeof window !== "undefined"
            ? window.localStorage.getItem("grantiq_token")
            : null;

        // Build URL with query parameter based on actionFilter
        let url = `${API_BASE_URL}/api/grantor/applications/all`;
        url += `?status=${actionFilter}`;

        const response = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as
            | Partial<ApiResponse>
            | undefined;
          throw new Error(
            (data && data.message) ||
              "Unable to load applications. Please try again."
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
  }, [actionFilter]);

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
          <p className="text-sm text-slate-600 mt-1 max-w-xl">
            Review and validate incoming scholarship applications before moving
            them to scrutiny and recommendation stages.
          </p>
        </div>

        {/* <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={async () => {
              setIsVerifying(true);
              setVerificationError(null);
              setVerificationResults(null);
              setVerificationProgress(null);
              try {
                const token =
                  typeof window !== "undefined"
                    ? window.localStorage.getItem("grantiq_token")
                    : null;

                const response = await fetch(
                  `${API_BASE_URL}/api/grantor/applications/verify-all-documents`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({}),
                  }
                );

                if (!response.ok) {
                  const data = (await response.json().catch(() => ({}))) as {
                    message?: string;
                    detail?: string;
                  };
                  throw new Error(
                    data.message ||
                      data.detail ||
                      "Unable to start verification. Please try again."
                  );
                }

                const data = (await response.json()) as {
                  success: boolean;
                  message: string;
                  data?: any;
                };

                if (!data.success) {
                  throw new Error(
                    data.message || "Failed to start verification"
                  );
                }

                setVerificationResults({
                  ...data.data,
                  backgroundProcessing: true,
                  successMessage: data.message,
                });
              } catch (err) {
                const message =
                  err instanceof Error
                    ? err.message
                    : "Something went wrong while starting verification.";
                setVerificationError(message);
              } finally {
                setIsVerifying(false);
                setVerificationProgress(null);
              }
            }}
            disabled={isVerifying}
            className="h-10 rounded-full bg-emerald-600 border border-emerald-500 px-4 flex items-center gap-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <>
                <span className="inline-flex h-5 w-5 items-center justify-center">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </span>
                <span>Verifying All...</span>
              </>
            ) : (
              <>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/30 text-[11px]">
                  ✓
                </span>
                <span>Verify All Applications</span>
              </>
            )}
          </button>
        </div> */}
      </div>

      {/* Accept/Reject Filter Buttons */}
      <div className="flex items-center gap-3">
        {/* <button
          type="button"
          onClick={() => setActionFilter("all")}
          className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
            actionFilter === "all"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
          }`}
        >
          All Applications
        </button> */}
        <button
          type="button"
          onClick={() => setActionFilter("submitted")}
          className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
            actionFilter === "submitted"
              ? "bg-green-600 text-white"
              : "bg-white text-green-600 border border-green-300 hover:bg-green-50"
          }`}
        >
          Accepted
        </button>
        <button
          type="button"
          onClick={() => setActionFilter("rejected")}
          className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
            actionFilter === "rejected"
              ? "bg-rose-600 text-white"
              : "bg-white text-rose-600 border border-rose-300 hover:bg-rose-50"
          }`}
        >
          Rejected
        </button>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs text-slate-600 w-full sm:w-auto">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by applicant name or application ID"
                className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-slate-500">Status</span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "all" | ApiApplicationStatus
                  )
                }
                className="rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="in_progress">In Progress</option>
                <option value="submitted">Submitted</option>
                <option value="verified">Verified</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          {error ? (
            <div className="px-5 py-6 text-sm text-rose-600 bg-rose-50">
              {error}
            </div>
          ) : applications.length === 0 && !isLoading ? (
            <div className="px-5 py-6 text-sm text-slate-600">
              No applications found yet. Once students start submitting, they
              will appear here for validation.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600 border-b border-slate-200">
                  <th className="px-5 py-3 font-semibold">Applicant Name</th>
                  <th className="px-5 py-3 font-semibold">Application ID</th>
                  <th className="px-5 py-3 font-semibold">
                    Application Status
                  </th>
                  <th className="px-5 py-3 font-semibold">Current Step</th>
                  <th className="px-5 py-3 font-semibold">
                    <button
                      type="button"
                      onClick={() =>
                        setSortOrder((prev) =>
                          prev === "asc" ? "desc" : "asc"
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Submitted At
                      <span className="text-[10px]">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    </button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedApplications.map((application, index) => (
                  <tr
                    key={application.id}
                    className={`border-t border-slate-100 ${
                      index % 2 === 0 ? "bg-white" : "bg-slate-50"
                    }`}
                  >
                    <td className="px-5 py-3 text-slate-900">
                      {application.full_name || "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-600 font-mono text-[13px]">
                      {application.application_id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${statusStyles(
                            application.application_status
                          )}`}
                        >
                          {application.application_status
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs">
                      Step {application.current_step}
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs">
                      {application.submitted_at
                        ? formatDate(application.submitted_at)
                        : "Not submitted"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedApplication(application)}
                        className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-[11px] font-medium text-white transition-colors"
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

      {verificationError && (
        <div className="rounded-3xl bg-rose-950/40 border border-rose-500/40 backdrop-blur-xl shadow-xl p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-rose-200 mb-2">
                Verification Error
              </h3>
              <p className="text-sm text-rose-300">{verificationError}</p>
            </div>
            <button
              type="button"
              onClick={() => setVerificationError(null)}
              className="text-rose-400 hover:text-rose-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {selectedApplication && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-5xl rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-900/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 bg-blue-600">
              <div>
                <p className="text-xs uppercase tracking-wider text-blue-100 mb-1 font-semibold">
                  Application Overview
                </p>
                <h2 className="text-lg font-semibold text-white">
                  {selectedApplication.full_name || "Unnamed Applicant"}
                </h2>
                <p className="text-xs text-blue-100 mt-1">
                  ID:{" "}
                  <span className="font-mono">
                    {selectedApplication.application_id.slice(-6).toUpperCase()}
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
                className="text-white hover:text-white/80 text-lg px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
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

              {(() => {
                const validationData = parseValidationResult(
                  selectedApplication.validation_result
                );
                const batchVerificationData =
                  verificationResults?.results?.[
                    selectedApplication.application_id
                  ];

                const displayData = batchVerificationData || validationData;

                if (!displayData) return null;

                return (
                  <section className="md:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">
                        📋 Document Verification Results
                      </h3>
                      {displayData.overall_eligible && (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">
                          <span className="text-sm">✓</span>
                          All Verified & Eligible
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {Object.entries(
                        displayData.verification_results || {}
                      ).map(([docType, result]: [string, any]) => (
                        <div
                          key={docType}
                          className={`rounded-xl border-2 overflow-hidden transition-all hover:shadow-md ${
                            result.success && result.is_eligible === true
                              ? "border-emerald-300 bg-emerald-50/50"
                              : result.success && result.is_eligible === false
                              ? "border-amber-300 bg-amber-50/50"
                              : result.success && result.is_eligible === null
                              ? "border-blue-300 bg-blue-50/50"
                              : "border-rose-300 bg-rose-50/50"
                          }`}
                        >
                          <div className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-semibold text-slate-900">
                                {getDocumentTypeLabel(docType)}
                              </h4>
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                                  result.success && result.is_eligible === true
                                    ? "text-emerald-700"
                                    : result.success &&
                                      result.is_eligible === false
                                    ? "text-amber-700"
                                    : result.success &&
                                      result.is_eligible === null
                                    ? "text-blue-700"
                                    : "text-rose-700"
                                }`}
                              >
                                {result.success && result.is_eligible === true
                                  ? "✓ ELIGIBLE"
                                  : result.success &&
                                    result.is_eligible === false
                                  ? "✗ NOT ELIGIBLE"
                                  : result.success &&
                                    result.is_eligible === null
                                  ? "? REVIEW"
                                  : "✗ FAILED"}
                              </span>
                            </div>
                          </div>

                          <div className="px-4 py-3 space-y-2">
                            <p className="text-xs text-slate-700 leading-relaxed">
                              {result.message ||
                                "No verification message available"}
                            </p>

                            {result.data && (
                              <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5">
                                {result.data.gross_income_numeric !==
                                  undefined && (
                                  <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 font-medium">
                                      Gross Income
                                    </span>
                                    <span className="font-semibold text-slate-900">
                                      ₹
                                      {result.data.gross_income_numeric.toLocaleString(
                                        "en-IN"
                                      )}
                                    </span>
                                  </div>
                                )}
                                {result.data.income_limit !== undefined && (
                                  <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 font-medium">
                                      Income Limit
                                    </span>
                                    <span className="font-semibold text-slate-900">
                                      ₹
                                      {result.data.income_limit.toLocaleString(
                                        "en-IN"
                                      )}
                                    </span>
                                  </div>
                                )}
                                {result.data.percentage !== undefined &&
                                  result.data.percentage !== null && (
                                    <div className="flex justify-between items-center text-[11px]">
                                      <span className="text-slate-500 font-medium">
                                        Percentage
                                      </span>
                                      <span className="font-semibold text-slate-900">
                                        {typeof result.data.percentage ===
                                        "number"
                                          ? `${result.data.percentage.toFixed(
                                              2
                                            )}%`
                                          : result.data.percentage}
                                      </span>
                                    </div>
                                  )}
                                {result.data.percentage_numeric !== undefined &&
                                  result.data.percentage_numeric !== null && (
                                    <div className="flex justify-between items-center text-[11px]">
                                      <span className="text-slate-500 font-medium">
                                        Percentage
                                      </span>
                                      <span className="font-semibold text-slate-900">
                                        {result.data.percentage_numeric.toFixed(
                                          2
                                        )}
                                        %
                                      </span>
                                    </div>
                                  )}
                                {result.data.cgpa !== undefined &&
                                  result.data.cgpa !== null && (
                                    <div className="flex justify-between items-center text-[11px]">
                                      <span className="text-slate-500 font-medium">
                                        CGPA
                                      </span>
                                      <span className="font-semibold text-slate-900">
                                        {result.data.cgpa}
                                        {result.data.cgpa_scale &&
                                          ` / ${result.data.cgpa_scale}`}
                                      </span>
                                    </div>
                                  )}
                                {result.data.category && (
                                  <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 font-medium">
                                      Category
                                    </span>
                                    <span className="font-semibold text-slate-900 uppercase">
                                      {result.data.category}
                                    </span>
                                  </div>
                                )}
                                {result.data.extracted_caste &&
                                  result.data.extracted_caste !==
                                    "Not Available" && (
                                    <div className="flex justify-between items-center text-[11px]">
                                      <span className="text-slate-500 font-medium">
                                        Extracted Caste
                                      </span>
                                      <span className="font-semibold text-slate-900">
                                        {result.data.extracted_caste}
                                      </span>
                                    </div>
                                  )}
                                {result.data.extracted_name && (
                                  <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 font-medium">
                                      Document Name
                                    </span>
                                    <span className="font-semibold text-slate-900">
                                      {result.data.extracted_name}
                                    </span>
                                  </div>
                                )}
                                {result.data.student_name && (
                                  <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 font-medium">
                                      Student Name
                                    </span>
                                    <span className="font-semibold text-slate-900">
                                      {result.data.student_name}
                                    </span>
                                  </div>
                                )}
                                {result.data.year_of_passing && (
                                  <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-500 font-medium">
                                      Year of Passing
                                    </span>
                                    <span className="font-semibold text-slate-900">
                                      {result.data.year_of_passing}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })()}

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Document Details
                  </h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedDocType}
                      onChange={(e) => setSelectedDocType(e.target.value)}
                      className="rounded-full bg-white border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    >
                      <option value="form16">Form 16</option>
                      <option value="caste_certificate">
                        Caste Certificate
                      </option>
                      <option value="marksheet_10th">10th Marksheet</option>
                      <option value="marksheet_12th">12th Marksheet</option>
                      <option value="graduation">Graduation Marksheet</option>
                      <option value="offer_letter">Offer Letter</option>
                      <option value="bank_passbook">Bank Passbook</option>
                      <option value="statement_of_purpose">
                        Statement of Purpose
                      </option>
                      <option value="cv">CV/Resume</option>
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
                                ...(token
                                  ? { Authorization: `Bearer ${token}` }
                                  : {}),
                              },
                              body: JSON.stringify({
                                application_id: selectedApplication.id,
                                type: selectedDocType,
                              }),
                            }
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

                          const data = (await response
                            .json()
                            .catch(() => ({}))) as {
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
                      className="inline-flex items-center rounded-full bg-blue-600 border border-blue-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
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
                    <span className="text-slate-400">Caste Validity Issue</span>
                    <span className="font-medium text-right">
                      {selectedApplication.caste_validity_issue_date
                        ? formatDate(
                            selectedApplication.caste_validity_issue_date
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
