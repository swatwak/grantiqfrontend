"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  merit_score?: number | null;
  category?: string | null;
  validation_result: string | null;
};

type ApiResponse = {
  success: boolean;
  message: string;
  data: ApiApplication[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

type CategoryType = "SC" | "ST" | "Minority" | "Open" | "all";

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

function getCategoryFromApplication(application: ApiApplication): CategoryType {
  // Determine category based on application data
  if (application.tribe || application.st_certificate_number) {
    return "ST";
  }
  if (application.caste_validity_cert_number) {
    return "SC";
  }
  // You may need to add logic to detect Minority based on your data model
  // For now, defaulting to "Open" if no category is explicitly set
  if (application.category) {
    const cat = application.category.toUpperCase();
    if (cat === "SC") return "SC";
    if (cat === "ST") return "ST";
    if (cat.includes("MINORITY")) return "Minority";
  }
  return "Open";
}

export default function ScrutinyPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApiApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | ApiApplicationStatus
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("all");
  const [selectedApplication, setSelectedApplication] =
    useState<ApiApplication | null>(null);
  const [isViewDocsLoading, setIsViewDocsLoading] = useState(false);
  const [viewDocsError, setViewDocsError] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>("form16");
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] =
    useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(
    null
  );
  const [isLoadingVerification, setIsLoadingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [verificationResults, setVerificationResults] = useState<any>(null);
  const [showVerificationDetails, setShowVerificationDetails] = useState(false);

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
          `${API_BASE_URL}/api/grantor/applications/all?status=all`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );

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
  }, []);
  const handleFetchVerification = async () => {
    if (!selectedApplication) return;
    setIsLoadingVerification(true);
    setVerificationError(null);
    setVerificationResults(null);
    setShowVerificationDetails(false);
    try {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("grantiq_token")
          : null;

      const response = await fetch(
        `${API_BASE_URL}/api/grantor/applications/get-verification-result`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            application_id: selectedApplication.application_id,
          }),
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
            "Unable to fetch verification results. Please try again."
        );
      }

      const data = (await response.json()) as {
        success: boolean;
        message: string;
        verification_result: any;
      };

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch verification results");
      }

      if (!data.verification_result) {
        throw new Error("No verification results found");
      }

      // Handle case where verification_result might be wrapped in applications array
      let results = data.verification_result;
      if (
        results &&
        typeof results === "object" &&
        "applications" in results &&
        Array.isArray(results.applications) &&
        results.applications.length > 0
      ) {
        // Extract verification data from first application
        const appData = results.applications[0];
        const { application_id, ...verificationData } = appData;
        results = verificationData;
      }

      setVerificationResults(results);
      setShowVerificationDetails(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while fetching verification results.";
      setVerificationError(message);
    } finally {
      setIsLoadingVerification(false);
    }
  };

  const categoryCounts = {
    SC: applications.filter((app) => getCategoryFromApplication(app) === "SC")
      .length,
    ST: applications.filter((app) => getCategoryFromApplication(app) === "ST")
      .length,
    Minority: applications.filter(
      (app) => getCategoryFromApplication(app) === "Minority"
    ).length,
    Open: applications.filter(
      (app) => getCategoryFromApplication(app) === "Open"
    ).length,
  };

  const filteredAndSortedApplications = applications
    .filter((application) => {
      // Category filter
      if (selectedCategory !== "all") {
        const appCategory = getCategoryFromApplication(application);
        if (appCategory !== selectedCategory) {
          return false;
        }
      }

      // Status filter
      const normalizedStatus = application.application_status.toLowerCase();
      const normalizedFilter = statusFilter.toLowerCase();

      if (normalizedFilter !== "all" && normalizedStatus !== normalizedFilter) {
        return false;
      }

      // Search filter
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
    <div className="max-w-6xl mx-auto space-y-6 h-[calc(100vh-7rem)] overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
            Scrutiny
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-xl">
            Review and scrutinize validated applications by category with merit
            scores.
          </p>
        </div>
      </div>

      {/* Recommendation Error */}
      {recommendationError && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-5 py-4 text-sm text-rose-700">
          <div className="flex items-center gap-2">
            <span className="text-rose-500">⚠</span>
            <span>{recommendationError}</span>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-base">
              📋
            </span>
            <div>
              <p className="text-sm font-medium text-slate-900">
                Scrutiny Queue
              </p>
              <p className="text-xs text-slate-600">
                {isLoading
                  ? "Loading applications..."
                  : `${filteredAndSortedApplications.length} applications in queue`}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs text-slate-600 w-full sm:w-auto">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by applicant name or application ID"
                className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                className="rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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

        <div className="overflow-x-auto overflow-y-auto max-h-[45vh]">
          {error ? (
            <div className="px-5 py-6 text-sm text-rose-600 bg-rose-50">
              {error}
            </div>
          ) : applications.length === 0 && !isLoading ? (
            <div className="px-5 py-6 text-sm text-slate-600">
              No applications found yet. Once students start submitting, they
              will appear here for scrutiny.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600 border-b border-slate-200">
                  <th className="px-5 py-3 font-semibold">Applicant Name</th>
                  <th className="px-5 py-3 font-semibold">Application ID</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  {/* <th className="px-5 py-3 font-semibold">Merit Score</th> */}
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
                  <th className="px-5 py-3 font-semibold">Status</th>
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
                    <td className="px-5 py-3 text-slate-600 text-xs">
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {getCategoryFromApplication(application)}
                      </span>
                    </td>
                    {/* <td className="px-5 py-3">
                      {application.merit_score !== null &&
                      application.merit_score !== undefined ? (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-900 font-semibold">
                            {application.merit_score}
                          </span>
                          <span className="text-slate-500 text-xs">/100</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td> */}
                    <td className="px-5 py-3 text-slate-600 text-xs">
                      {application.submitted_at
                        ? formatDate(application.submitted_at)
                        : "Not submitted"}
                    </td>
                    <td className="px-5 py-3 text-slate-600 font-mono text-[13px]">
                      {application.application_status.toUpperCase()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedApplication(application);
                          setVerificationResults(null);
                          setShowVerificationDetails(false);
                          setVerificationError(null);
                        }}
                        className="inline-flex items-center rounded-lg bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-[11px] font-medium text-white transition-colors"
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
            <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 bg-purple-600">
              <div>
                <p className="text-xs uppercase tracking-wider text-purple-100 mb-1 font-semibold">
                  Application Overview
                </p>
                <h2 className="text-lg font-semibold text-white">
                  {selectedApplication.full_name || "Unnamed Applicant"}
                </h2>
                <p className="text-xs text-purple-100 mt-1">
                  ID:{" "}
                  <span className="font-mono">
                    {selectedApplication.application_id}
                  </span>
                  {" · "}
                  Step {selectedApplication.current_step} · Status:{" "}
                  <span className="capitalize font-medium">
                    {selectedApplication.application_status}
                  </span>
                  {selectedApplication.merit_score !== null &&
                    selectedApplication.merit_score !== undefined && (
                      <>
                        {" · "}Merit Score:{" "}
                        <span className="font-medium">
                          {selectedApplication.merit_score}/100
                        </span>
                      </>
                    )}
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
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Category</span>
                    <span className="font-medium text-right">
                      {getCategoryFromApplication(selectedApplication)}
                    </span>
                  </div>
                  {selectedApplication.merit_score !== null &&
                    selectedApplication.merit_score !== undefined && (
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">Merit Score</span>
                        <span className="font-medium text-right">
                          {selectedApplication.merit_score}/100
                        </span>
                      </div>
                    )}
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

                if (!validationData) return null;

                return (
                  <section className="md:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">
                        📋 Document Verification Results
                      </h3>
                      <div className="flex items-center gap-2">
                        {/* <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
                            validationData.overall_eligible
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                              : validationData.overall_success
                              ? "bg-amber-100 text-amber-700 border border-amber-300"
                              : "bg-rose-100 text-rose-700 border border-rose-300"
                          }`}
                        >
                          {validationData.overall_eligible ? (
                            <>
                              <span className="text-sm">✓</span>
                              All Verified & Eligible
                            </>
                          ) : validationData.overall_success ? (
                            <>
                              <span className="text-sm">⚠</span>
                              Manual Review Required
                            </>
                          ) : (
                            <>
                              <span className="text-sm">✗</span>
                              Issues Found
                            </>
                          )}
                        </span> */}
                        <button
                          type="button"
                          onClick={handleFetchVerification}
                          disabled={isLoadingVerification}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                            isLoadingVerification
                              ? "bg-slate-100 text-slate-700 border border-slate-300"
                              : "bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200"
                          }`}
                        >
                          {isLoadingVerification ? (
                            <>
                              <span className="inline-flex h-3 w-3 items-center justify-center">
                                <svg
                                  className="animate-spin h-2.5 w-2.5"
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
                              <span>Loading...</span>
                            </>
                          ) : (
                            <>
                              <span className="text-sm">🔍</span>
                              <span>Verification</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {Object.entries(
                        validationData.verification_results || {}
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

                    {/* <div
                      className={`rounded-xl px-4 py-3 border ${
                        validationData.overall_eligible
                          ? "bg-emerald-50 border-emerald-300"
                          : validationData.overall_success
                          ? "bg-amber-50 border-amber-300"
                          : "bg-rose-50 border-rose-300"
                      }`}
                    >
                      <p className="text-xs font-medium text-slate-700">
                        <span className="font-semibold">Overall Status: </span>
                        {validationData.overall_eligible
                          ? "✓ All documents verified and applicant is eligible for the scholarship"
                          : validationData.overall_success
                          ? "⚠ Documents processed successfully but manual review required for eligibility"
                          : "✗ Some documents failed verification or applicant is not eligible"}
                      </p>
                    </div> */}
                  </section>
                );
              })()}

              {/* Verification Results Section */}
              {verificationError && (
                <section className="md:col-span-2">
                  <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
                    <p className="text-xs text-rose-700">
                      <span className="font-semibold">Error: </span>
                      {verificationError}
                    </p>
                  </div>
                </section>
              )}

              {showVerificationDetails && verificationResults && (
                <section className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                      🔍 Source Verification Results
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowVerificationDetails(false)}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Hide
                    </button>
                  </div>

                  {(() => {
                    const documentEntries = Object.entries(
                      verificationResults
                    ).filter(([docType, docData]) => {
                      if (docType === "application_id") return false;
                      if (!docData || typeof docData !== "object") return false;
                      return true;
                    });

                    if (documentEntries.length === 0) {
                      return (
                        <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                          <p className="text-xs text-slate-600">
                            No verification results available for this
                            application.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {documentEntries.map(
                          ([docType, docData]: [string, any]) => {
                            if (!Array.isArray(docData) || docData.length === 0)
                              return null;
                            const latest = docData[docData.length - 1];
                            const verificationValue = latest?.result?.verification; 
                            // true | false | null

                            const verificationState =
                              verificationValue === true
                                ? "verified"
                                : verificationValue === false
                                ? "failed"
                                : "inprogress";

                            const reason = latest?.result?.reason || null;
                            const dataReceived = latest?.data_received || {};
                            const verificationType =
                              latest?.verification_type || "Unknown";
                            const source = latest?.result?.source || null;


                            return (
                              <div
                                key={docType}
                                className={`rounded-xl border-2 overflow-hidden transition-all hover:shadow-md ${
                                  verificationState === "verified"
                                    ? "border-emerald-300 bg-emerald-50/50"
                                    : verificationState === "failed"
                                    ? "border-rose-300 bg-rose-50/50"
                                    : "border-amber-300 bg-amber-50/50"
                                }`}
                              >
                                <div className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-semibold text-slate-900">
                                      {getDocumentTypeLabel(docType)}
                                    </h4>
                                    <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                                      verificationState === "verified"
                                        ? "text-emerald-700"
                                        : verificationState === "failed"
                                        ? "text-rose-700"
                                        : "text-amber-700"
                                    }`}
                                  >
                                    {verificationState === "verified" && (
                                      <>
                                        <span>✓</span>
                                        <span>VERIFIED</span>
                                      </>
                                    )}

                                    {verificationState === "failed" && (
                                      <>
                                        <span>✗</span>
                                        <span>NOT VERIFIED</span>
                                      </>
                                    )}

                                    {verificationState === "inprogress" && (
                                      <>
                                        <span>⏳</span>
                                        <span>IN PROGRESS</span>
                                      </>
                                    )}
                                  </span>

                                  </div>
                                  <p className="text-[10px] text-slate-600 mt-1">
                                    {verificationType}
                                  </p>
                                </div>

                                <div className="px-4 py-3 space-y-3">
                                  {reason && (
                                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                                      <p className="text-[10px] font-semibold text-amber-800 mb-1">
                                        Reason:
                                      </p>
                                      <p className="text-xs text-amber-700">
                                        {reason}
                                      </p>
                                    </div>
                                  )}
                                  {!reason && verificationState === "failed" && (
                                    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                      <p className="text-xs text-slate-600">
                                        Verification failed. No specific reason provided.
                                      </p>
                                    </div>
                                  )}
                                  {source && (
                                  <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                    <p className="text-[10px] font-semibold text-slate-600 mb-1">
                                      Verified Source:
                                    </p>
                                    <p className="text-xs text-slate-700">
                                      {source}
                                    </p>
                                  </div>
                                )}

                                  {Object.keys(dataReceived).length > 0 && (
                                    <div className="space-y-1.5">
                                      <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
                                        Data Received:
                                      </p>
                                      <div className="space-y-1.5">
                                        {Object.entries(dataReceived).map(
                                          ([key, value]) => (
                                            <div
                                              key={key}
                                              className="flex justify-between items-center text-[11px]"
                                            >
                                              <span className="text-slate-500 font-medium capitalize">
                                                {key.replace(/_/g, " ")}:
                                              </span>
                                              <span className="font-semibold text-slate-900 text-right">
                                                {typeof value === "number"
                                                  ? value.toLocaleString(
                                                      "en-IN"
                                                    )
                                                  : String(value)}
                                              </span>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    );
                  })()}
                </section>
              )}

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Document Details
                  </h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedDocType}
                      onChange={(e) => setSelectedDocType(e.target.value)}
                      className="rounded-full bg-white border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
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
                      className="inline-flex items-center rounded-full bg-purple-600 border border-purple-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
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
