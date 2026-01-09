"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { statusStyles } from "../rejection-logs/page";
import { Suspense } from "react";
type ApiApplicationStatus = string;

type ScoreBreakdown = {
  universityScore: number | null;
  academicScore: number | null;
  courseScore: number | null;
  incomeScore: number | null;
  beneficiaryScore: number | null;
  ageScore: number | null;
  totalScore: number | null;
};

type RecommendationDetails = {
  category: string | null;
  courseLevelPriority: number | null;
  universityRanking: number | null;
  daysUntilCourseStart: number | null;
  isFirstTimeBeneficiary: boolean | null;
  applicationSubmittedOn: string | null;
  annualFamilyIncome: number | null;
  qualifyingDegreePercentage: number | null;
  finalRank: number | null;
  scoreBreakdown: ScoreBreakdown | null;
  zone: "green" | "amber" | "red" | null;
};

type ApiApplication = {
  id: number;
  finalRank: number | null;
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
  recommendation_details?: RecommendationDetails | null;
  validation_result: string | null;
};

type ApiResponse = {
  success: boolean;
  message: string;
  data: ApiApplication[];
};

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

type Weightage = {
  university: number;
  academic: number;
  course: number;
  income: number;
  beneficiary: number;
  age: number;
};

type CourseSeat = {
  course_field: string;
  seats: number;
  weightage: Weightage;
};

type CourseConfig = {
  course_type: string;
  data: CourseSeat[];
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

function RecommendationPageData() {
  const [applications, setApplications] = useState<ApiApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | ApiApplicationStatus
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("all");
  const [selectedApplication, setSelectedApplication] =
    useState<ApiApplication | null>(null);
  const [isViewDocsLoading, setIsViewDocsLoading] = useState(false);
  const [viewDocsError, setViewDocsError] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>("form16");
  // 1. ADD STATE (near other useState hooks)
  const [selectedCourseType, setSelectedCourseType] = useState<string | null>(
    null
  );
  const [selectedCourseField, setSelectedCourseField] = useState<string | null>(
    null
  );
  const [verificationInProgress, setVerificationInProgress] = useState<
    boolean | null
  >(null);
  const [showApprovalConfirmation, setShowApprovalConfirmation] =
    useState(false);
  const [showApprovalReasonModal, setShowApprovalReasonModal] = useState(false);
  const [approvalReason, setApprovalReason] = useState("");
  const [approvalDeclaration, setApprovalDeclaration] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const [verificationResults, setVerificationResults] = useState<any>(null);
  const [showVerificationDetails, setShowVerificationDetails] = useState(false);

  const [isLoadingVerification, setIsLoadingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [courseConfig, setCourseConfig] = useState<CourseConfig[]>([]);

  // Accordion state management
  const [accordionState, setAccordionState] = useState({
    verificationResults: true, // Default open when toggle is ON
    recommendationDetails: false, // Default closed when toggle is ON
    identityDetails: false,
    personalDetails: false,
    documentDetails: false,
    universityDetails: false,
  });

  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchCourseConfig = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/grantor/applications/config/course-data`
        );
        const json = await res.json();

        if (json.success) {
          setCourseConfig(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch course config", err);
      }
    };

    const fetchDataConfig = async () => {
      try {
      } catch (err) {
        console.error("Failed to fetch date config", err);
      }
    };

    fetchCourseConfig();
    fetchDataConfig();
  }, []);

  useEffect(() => {
    const courseType = searchParams.get("courseType");
    const courseField = searchParams.get("courseField");

    if (courseType && courseField) {
      setSelectedCourseType(courseType);
      setSelectedCourseField(courseField);
    }
  }, [searchParams]);

  useEffect(() => {
    setVerificationInProgress(
      localStorage.getItem("verificationInProgress") === "true"
    );
  }, []);

  // Update accordion default state when verificationInProgress changes
  useEffect(() => {
    if (verificationInProgress !== null) {
      setAccordionState({
        verificationResults: verificationInProgress, // Open when toggle ON
        recommendationDetails: !verificationInProgress, // Open when toggle OFF
        identityDetails: false,
        personalDetails: false,
        documentDetails: false,
        universityDetails: false,
      });
    }
  }, [verificationInProgress]);

  // Reset accordion state when application changes
  useEffect(() => {
    if (selectedApplication && verificationInProgress !== null) {
      setAccordionState({
        verificationResults: verificationInProgress,
        recommendationDetails: !verificationInProgress,
        identityDetails: false,
        personalDetails: false,
        documentDetails: false,
        universityDetails: false,
      });
      // Reset verification details when application changes
      setShowVerificationDetails(false);
      setVerificationResults(null);
    }
  }, [selectedApplication?.id, verificationInProgress]);

  useEffect(() => {
    async function loadApplications() {
      if (
        !selectedCourseType ||
        !selectedCourseField ||
        selectedCourseType === "all" ||
        selectedCourseField === "all"
      ) {
        setApplications([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const token =
          typeof window !== "undefined"
            ? window.localStorage.getItem("grantiq_token")
            : null;

        const params = new URLSearchParams({
          status: verificationInProgress
            ? "submitted,verification_failed,verification_in_progress"
            : "submitted,grant_approved",
          course_type: selectedCourseType,
          course_field: selectedCourseField,
        });

        const response = await fetch(
          `${API_BASE_URL}/api/grantor/applications/recommendation?${params.toString()}`,
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
  }, [selectedCourseType, selectedCourseField]);

  const handleApproveGrant = async () => {
    if (!selectedApplication) return;

    const zone = selectedApplication.recommendation_details?.zone;

    if (zone === "green") {
      // Direct approval for green zone
      try {
        setIsApproving(true);
        setApprovalError(null);

        const token =
          typeof window !== "undefined"
            ? window.localStorage.getItem("grantiq_token")
            : null;

        const response = await fetch(
          `${API_BASE_URL}/api/grantor/applications/approve_grant`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              application_id: selectedApplication.application_id,
              approve_reason: null,
            }),
          }
        );

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(data.message || "Failed to approve grant.");
        }

        setShowApprovalConfirmation(false);
        setSelectedApplication(null);
        // Reload applications
        const updatedApplications = applications.map((app) =>
          app.id === selectedApplication.id
            ? { ...app, application_status: "approved" }
            : app
        );
        setApplications(updatedApplications);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        setApprovalError(message);
      } finally {
        setIsApproving(false);
      }
    } else {
      // Show reason modal for non-green zones
      setShowApprovalConfirmation(false);
      setShowApprovalReasonModal(true);
    }
  };

  const handleApprovalWithReason = async () => {
    if (
      !selectedApplication ||
      !approvalReason.trim() ||
      !approvalDeclaration
    ) {
      return;
    }

    try {
      setIsApproving(true);
      setApprovalError(null);

      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("grantiq_token")
          : null;

      const response = await fetch(
        `${API_BASE_URL}/api/grantor/applications/approve_grant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            application_id: selectedApplication.application_id,
            approve_reason: approvalReason,
          }),
        }
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(data.message || "Failed to approve grant.");
      }

      setShowApprovalReasonModal(false);
      setSelectedApplication(null);
      setApprovalReason("");
      setApprovalDeclaration(false);
      // Reload applications
      const updatedApplications = applications.map((app) =>
        app.id === selectedApplication.id
          ? { ...app, application_status: "approved" }
          : app
      );
      setApplications(updatedApplications);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setApprovalError(message);
    } finally {
      setIsApproving(false);
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
      const aRank = a.finalRank ?? 1000000;
      const bRank = b.finalRank ?? 1000000;
      return aRank - bRank;
    });

  const defaultCourses = [
    { value: "ms", label: "M.S", degreeType: "M.S" },
    { value: "phd", label: "PhD", degreeType: "PhD" },
  ];

  const courseFields = [
    { value: "Engineering", label: "Engineering" },
    { value: "Architecture", label: "Architecture" },
    { value: "Management", label: "Management" },
    { value: "Science", label: "Science" },
    { value: "Commerce / Economics", label: "Commerce / Economics" },
    { value: "Arts", label: "Arts" },
    { value: "Law", label: "Law" },
    { value: "Pharmaceutical Sciences", label: "Pharmaceutical Sciences" },
  ];

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

  function getCourseConfig(
    courseType: string,
    courseField: string
  ): CourseSeat | null {
    const courseTypeEntry = courseConfig.find(
      (item) => item.course_type === courseType
    );

    if (!courseTypeEntry) {
      return null;
    }

    const fieldEntry = courseTypeEntry.data.find(
      (field) => field.course_field === courseField
    );

    return fieldEntry ?? null;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
            Application Summary
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 rounded-lg bg-purple-50 border border-purple-200 px-4 flex items-center gap-2 text-xs text-purple-900">
            <span className="font-medium">
              {verificationInProgress
                ? "Scrutiny Stage"
                : "Recommendation Stage"}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {/* Course Type */}

        {defaultCourses.map((c) => (
          <button
            key={c.value}
            onClick={() => setSelectedCourseType(c.degreeType)}
            className={`px-3 py-1 text-xs rounded-full border ${
              selectedCourseType === c.degreeType
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-slate-700 border-slate-300"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Course Field */}
        {/* Selection Warning */}
        {(selectedCourseType === "all" || selectedCourseField === "all") && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Please select both <strong>Course Type</strong> and{" "}
            <strong>Course Field</strong> to view rankings.
          </div>
        )}

        {courseFields.map((f) => (
          <button
            key={f.value}
            onClick={() => setSelectedCourseField(f.value)}
            className={`px-3 py-1 text-xs rounded-full border ${
              selectedCourseField === f.value
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-slate-700 border-slate-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs text-slate-600">
                {isLoading
                  ? "Loading applications..."
                  : `${filteredAndSortedApplications.length} applications`}
              </p>
            </div>
          </div>

          <div className="text-sm text-slate-600 flex items-center gap-3">
            {getCourseConfig(selectedCourseType!, selectedCourseField!)?.seats}{" "}
            {getCourseConfig(selectedCourseType!, selectedCourseField!) &&
              "Seats Available"}
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
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
          {error ? (
            <div className="px-5 py-6 text-sm text-rose-600 bg-rose-50">
              {error}
            </div>
          ) : applications.length === 0 && !isLoading ? (
            <div className="px-5 py-6 text-sm text-slate-600">
              Select a Course data to view applications.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600 border-b border-slate-200">
                  {!verificationInProgress && (
                    <th className="px-5 py-3 font-semibold">Rank</th>
                  )}
                  <th className="px-5 py-3 font-semibold">Applicant Name</th>
                  <th className="px-5 py-3 font-semibold">Application ID</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  {!verificationInProgress && (
                    <th className="px-5 py-3 font-semibold">Weightage Score</th>
                  )}
                  <th className="px-5 py-3 font-semibold">Submitted At</th>
                  <th className="px-5 py-3 font-semibold text-right">Status</th>
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
                      verificationInProgress
                        ? index % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50"
                        : application.recommendation_details?.zone === "green"
                        ? "bg-emerald-50"
                        : application.recommendation_details?.zone === "amber"
                        ? "bg-amber-50"
                        : "bg-rose-50"
                    }`}
                  >
                    {!verificationInProgress && (
                      <td className="px-5 py-3 text-slate-900">
                        {application.finalRank || "—"}
                      </td>
                    )}
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
                    {!verificationInProgress && (
                      <td className="px-5 py-3 text-slate-900 font-medium">
                        {application.recommendation_details?.scoreBreakdown
                          ?.totalScore != null
                          ? application.recommendation_details.scoreBreakdown.totalScore.toFixed(
                              2
                            )
                          : "—"}
                      </td>
                    )}
                    <td className="px-5 py-3 text-slate-600 text-xs">
                      {application.submitted_at
                        ? formatDate(application.submitted_at)
                        : "Not submitted"}
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
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedApplication(application)}
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
              <div className="flex items-center gap-2">
                {!verificationInProgress && (
                  <button
                    type="button"
                    onClick={() => setShowApprovalConfirmation(true)}
                    className="inline-flex items-center rounded-lg bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                  >
                    ✓ Approve Grant
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedApplication(null)}
                  className="text-white hover:text-white/80 text-lg px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[70vh] overflow-y-auto bg-slate-50">
              <section className="space-y-3">
                <button
                  type="button"
                  onClick={() =>
                    setAccordionState((prev) => ({
                      ...prev,
                      identityDetails: !prev.identityDetails,
                    }))
                  }
                  className="flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700"
                >
                  <span className="text-xs">
                    {accordionState.identityDetails ? "▼" : "▶"}
                  </span>
                  <h3>Identity Details</h3>
                </button>
                {accordionState.identityDetails && (
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
                )}
              </section>

              <section className="space-y-3">
                <button
                  type="button"
                  onClick={() =>
                    setAccordionState((prev) => ({
                      ...prev,
                      personalDetails: !prev.personalDetails,
                    }))
                  }
                  className="flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700"
                >
                  <span className="text-xs">
                    {accordionState.personalDetails ? "▼" : "▶"}
                  </span>
                  <h3>Personal Details</h3>
                </button>
                {accordionState.personalDetails && (
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
                )}
              </section>

              {selectedApplication.recommendation_details &&
                !verificationInProgress && (
                  <section className="md:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setAccordionState((prev) => ({
                            ...prev,
                            recommendationDetails: !prev.recommendationDetails,
                          }))
                        }
                        className="flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700"
                      >
                        <span className="text-xs">
                          {accordionState.recommendationDetails ? "▼" : "▶"}
                        </span>
                        <h3>Recommendation Details</h3>
                      </button>
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold bg-purple-100 text-purple-700 border border-purple-300">
                        <span className="text-sm">📊</span>
                        Rank #
                        {selectedApplication.recommendation_details.finalRank ||
                          selectedApplication.finalRank ||
                          "—"}
                      </span>
                    </div>
                    {accordionState.recommendationDetails && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {/* Course Level Priority */}
                          <div className="rounded-xl border-2 overflow-hidden border-blue-300 bg-blue-50/50">
                            <div className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-slate-900">
                                  Course Level Priority
                                </h4>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700">
                                  Priority{" "}
                                  {selectedApplication.recommendation_details
                                    .courseLevelPriority ?? "—"}
                                </span>
                              </div>
                            </div>
                            <div className="px-4 py-3 space-y-2">
                              <p className="text-xs text-slate-700 leading-relaxed">
                                Priority level based on course type (PhD &gt;
                                Masters &gt; Bachelors).
                              </p>
                            </div>
                          </div>

                          {/* University Ranking */}
                          <div className="rounded-xl border-2 overflow-hidden border-amber-300 bg-amber-50/50">
                            <div className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-slate-900">
                                  University Ranking
                                </h4>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                                  #
                                  {selectedApplication.recommendation_details
                                    .universityRanking ?? "—"}
                                </span>
                              </div>
                            </div>
                            <div className="px-4 py-3 space-y-2">
                              <p className="text-xs text-slate-700 leading-relaxed">
                                Global or national ranking of the target
                                university.
                              </p>
                            </div>
                          </div>

                          {/* Days Until Course Start */}
                          <div className="rounded-xl border-2 overflow-hidden border-sky-300 bg-sky-50/50">
                            <div className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-slate-900">
                                  Days Until Course Start
                                </h4>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700">
                                  {selectedApplication.recommendation_details
                                    .daysUntilCourseStart ?? "—"}{" "}
                                  days
                                </span>
                              </div>
                            </div>
                            <div className="px-4 py-3 space-y-2">
                              <p className="text-xs text-slate-700 leading-relaxed">
                                Time remaining before the course begins. Earlier
                                starts may get priority.
                              </p>
                            </div>
                          </div>

                          {/* First Time Beneficiary */}
                          <div
                            className={`rounded-xl border-2 overflow-hidden ${
                              selectedApplication.recommendation_details
                                .isFirstTimeBeneficiary
                                ? "border-emerald-300 bg-emerald-50/50"
                                : "border-slate-300 bg-slate-50/50"
                            }`}
                          >
                            <div className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-slate-900">
                                  First Time Beneficiary
                                </h4>
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                                    selectedApplication.recommendation_details
                                      .isFirstTimeBeneficiary
                                      ? "text-emerald-700"
                                      : "text-slate-700"
                                  }`}
                                >
                                  {selectedApplication.recommendation_details
                                    .isFirstTimeBeneficiary
                                    ? "✓ Yes"
                                    : "✗ No"}
                                </span>
                              </div>
                            </div>
                            <div className="px-4 py-3 space-y-2">
                              <p className="text-xs text-slate-700 leading-relaxed">
                                First-time applicants may receive additional
                                priority.
                              </p>
                            </div>
                          </div>

                          {/* Annual Family Income */}
                          <div className="rounded-xl border-2 overflow-hidden border-teal-300 bg-teal-50/50">
                            <div className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-slate-900">
                                  Annual Family Income
                                </h4>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700">
                                  ₹
                                  {selectedApplication.recommendation_details.annualFamilyIncome?.toLocaleString(
                                    "en-IN"
                                  ) ?? "—"}
                                </span>
                              </div>
                            </div>
                            <div className="px-4 py-3 space-y-2">
                              <p className="text-xs text-slate-700 leading-relaxed">
                                Total annual income of the applicant&apos;s
                                family. Lower income may receive higher
                                priority.
                              </p>
                            </div>
                          </div>

                          {/* Qualifying Degree Percentage */}
                          <div className="rounded-xl border-2 overflow-hidden border-indigo-300 bg-indigo-50/50">
                            <div className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-slate-900">
                                  Qualifying Degree Percentage
                                </h4>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700">
                                  {selectedApplication.recommendation_details
                                    .qualifyingDegreePercentage != null
                                    ? `${selectedApplication.recommendation_details.qualifyingDegreePercentage.toFixed(
                                        2
                                      )}%`
                                    : "—"}
                                </span>
                              </div>
                            </div>
                            <div className="px-4 py-3 space-y-2">
                              <p className="text-xs text-slate-700 leading-relaxed">
                                Percentage scored in the qualifying degree
                                examination.
                              </p>
                            </div>
                          </div>

                          {/* Application Submitted On */}
                          <div className="rounded-xl border-2 overflow-hidden border-rose-300 bg-rose-50/50">
                            <div className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-slate-900">
                                  Application Submitted On
                                </h4>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700">
                                  {selectedApplication.recommendation_details
                                    .applicationSubmittedOn
                                    ? formatDate(
                                        selectedApplication
                                          .recommendation_details
                                          .applicationSubmittedOn
                                      )
                                    : "—"}
                                </span>
                              </div>
                            </div>
                            <div className="px-4 py-3 space-y-2">
                              <p className="text-xs text-slate-700 leading-relaxed">
                                Date when the application was submitted. Earlier
                                submissions may be prioritized.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl px-4 py-3 border bg-purple-50 border-purple-300">
                          <p className="text-xs font-medium text-slate-700">
                            <span className="font-semibold">
                              Final Ranking:{" "}
                            </span>
                            This applicant is ranked{" "}
                            <span className="font-bold text-purple-700">
                              #
                              {selectedApplication.recommendation_details
                                .finalRank ||
                                selectedApplication.finalRank ||
                                "—"}
                            </span>{" "}
                            based on the weighted scoring of all recommendation
                            factors above.
                          </p>
                        </div>

                        {/* Score Breakdown Table */}
                        {selectedApplication.recommendation_details
                          .scoreBreakdown && (
                          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                            <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200">
                              <h4 className="text-sm font-semibold text-slate-900">
                                Score Breakdown
                              </h4>
                              <p className="text-xs text-slate-600 mt-1">
                                Detailed breakdown of the weightage score
                                calculation
                              </p>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                      Score Component
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                      Score
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  <tr className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-xs text-slate-700">
                                      University Score
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs font-medium text-slate-900">
                                      {selectedApplication
                                        .recommendation_details.scoreBreakdown
                                        .universityScore != null
                                        ? selectedApplication.recommendation_details.scoreBreakdown.universityScore.toFixed(
                                            2
                                          )
                                        : "—"}
                                    </td>
                                  </tr>
                                  <tr className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-xs text-slate-700">
                                      Academic Score
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs font-medium text-slate-900">
                                      {selectedApplication
                                        .recommendation_details.scoreBreakdown
                                        .academicScore != null
                                        ? selectedApplication.recommendation_details.scoreBreakdown.academicScore.toFixed(
                                            2
                                          )
                                        : "—"}
                                    </td>
                                  </tr>
                                  <tr className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-xs text-slate-700">
                                      Course Score
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs font-medium text-slate-900">
                                      {selectedApplication
                                        .recommendation_details.scoreBreakdown
                                        .courseScore != null
                                        ? selectedApplication.recommendation_details.scoreBreakdown.courseScore.toFixed(
                                            2
                                          )
                                        : "—"}
                                    </td>
                                  </tr>
                                  <tr className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-xs text-slate-700">
                                      Income Score
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs font-medium text-slate-900">
                                      {selectedApplication
                                        .recommendation_details.scoreBreakdown
                                        .incomeScore != null
                                        ? selectedApplication.recommendation_details.scoreBreakdown.incomeScore.toFixed(
                                            2
                                          )
                                        : "—"}
                                    </td>
                                  </tr>
                                  <tr className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-xs text-slate-700">
                                      Beneficiary Score
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs font-medium text-slate-900">
                                      {selectedApplication
                                        .recommendation_details.scoreBreakdown
                                        .beneficiaryScore != null
                                        ? selectedApplication.recommendation_details.scoreBreakdown.beneficiaryScore.toFixed(
                                            2
                                          )
                                        : "—"}
                                    </td>
                                  </tr>
                                  <tr className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-xs text-slate-700">
                                      Age Score
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs font-medium text-slate-900">
                                      {selectedApplication
                                        .recommendation_details.scoreBreakdown
                                        .ageScore != null
                                        ? selectedApplication.recommendation_details.scoreBreakdown.ageScore.toFixed(
                                            2
                                          )
                                        : "—"}
                                    </td>
                                  </tr>
                                  <tr className="bg-purple-50 border-t-2 border-purple-300 font-semibold">
                                    <td className="px-4 py-3 text-xs text-slate-900">
                                      Total Score
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs font-bold text-purple-700">
                                      {selectedApplication
                                        .recommendation_details.scoreBreakdown
                                        .totalScore != null
                                        ? selectedApplication.recommendation_details.scoreBreakdown.totalScore.toFixed(
                                            2
                                          )
                                        : "—"}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                )}

              {(() => {
                const validationData = parseValidationResult(
                  selectedApplication.validation_result
                );

                if (!validationData) return null;

                return (
                  <section className="md:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setAccordionState((prev) => ({
                            ...prev,
                            verificationResults: !prev.verificationResults,
                          }))
                        }
                        className="flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700"
                      >
                        <span className="text-xs">
                          {accordionState.verificationResults ? "▼" : "▶"}
                        </span>
                        <h3>📋 Document Validation Results</h3>
                      </button>
                      <div className="flex items-center gap-2">
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
                    {accordionState.verificationResults && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {Object.entries(
                            validationData.verification_results || {}
                          ).map(([docType, result]: [string, any]) => (
                            <div
                              key={docType}
                              className={`rounded-xl border-2 overflow-hidden transition-all hover:shadow-md ${
                                result.success && result.is_eligible === true
                                  ? "border-emerald-300 bg-emerald-50/50"
                                  : result.success &&
                                    result.is_eligible === false
                                  ? "border-amber-300 bg-amber-50/50"
                                  : result.success &&
                                    result.is_eligible === null
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
                                      result.success &&
                                      result.is_eligible === true
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
                                    {result.success &&
                                    result.is_eligible === true
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
                                    {result.data.percentage_numeric !==
                                      undefined &&
                                      result.data.percentage_numeric !==
                                        null && (
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
                      </div>
                    )}
                  </section>
                );
              })()}

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
                    <button
                      type="button"
                      onClick={() => setShowVerificationDetails(false)}
                      className="flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700"
                    >
                      <span className="text-xs">▼</span>
                      <h3>🔍 Source Verification Results</h3>
                    </button>
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
                            const verificationValue =
                              latest?.result?.verification;
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
                                  {!reason &&
                                    verificationState === "failed" && (
                                      <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                        <p className="text-xs text-slate-600">
                                          Verification failed. No specific
                                          reason provided.
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
                  <button
                    type="button"
                    onClick={() =>
                      setAccordionState((prev) => ({
                        ...prev,
                        documentDetails: !prev.documentDetails,
                      }))
                    }
                    className="flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700"
                  >
                    <span className="text-xs">
                      {accordionState.documentDetails ? "▼" : "▶"}
                    </span>
                    <h3>Document Details</h3>
                  </button>
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

                {accordionState.documentDetails && (
                  <div className="space-y-3">
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
                        <span className="text-slate-400">
                          ST Certificate No.
                        </span>
                        <span className="font-medium text-right">
                          {selectedApplication.st_certificate_number || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">
                          ST Certificate Issue
                        </span>
                        <span className="font-medium text-right">
                          {selectedApplication.certificate_issue_date
                            ? formatDate(
                                selectedApplication.certificate_issue_date
                              )
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">
                          Caste Validity Cert No.
                        </span>
                        <span className="font-medium text-right">
                          {selectedApplication.caste_validity_cert_number ||
                            "—"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">
                          Caste Validity Issue
                        </span>
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
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <button
                  type="button"
                  onClick={() =>
                    setAccordionState((prev) => ({
                      ...prev,
                      universityDetails: !prev.universityDetails,
                    }))
                  }
                  className="flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-700"
                >
                  <span className="text-xs">
                    {accordionState.universityDetails ? "▼" : "▶"}
                  </span>
                  <h3>University Details</h3>
                </button>
                {accordionState.universityDetails && (
                  <p className="text-xs text-slate-700">
                    University and course details will appear here once the
                    applicant completes the academic section of the application.
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Approval Confirmation Modal */}
      {showApprovalConfirmation && selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 bg-purple-50">
              <h3 className="text-lg font-semibold text-slate-900">
                Confirm Grant Approval
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                You are about to approve the grant for{" "}
                <span className="font-semibold">
                  {selectedApplication.full_name}
                </span>
              </p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 space-y-2">
                <p className="text-xs font-medium text-slate-700">
                  Application Details:
                </p>
                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>ID:</span>
                    <span className="font-mono font-medium">
                      {selectedApplication.application_id}
                    </span>
                  </div>
                  {selectedApplication.recommendation_details?.zone && (
                    <div className="flex justify-between">
                      <span>Zone:</span>
                      <span
                        className={`font-semibold uppercase text-xs px-2 py-0.5 rounded ${
                          selectedApplication.recommendation_details.zone ===
                          "green"
                            ? "bg-emerald-100 text-emerald-700"
                            : selectedApplication.recommendation_details
                                .zone === "amber"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {selectedApplication.recommendation_details.zone}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {approvalError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3">
                  <p className="text-xs text-rose-700">{approvalError}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowApprovalConfirmation(false)}
                disabled={isApproving}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveGrant}
                disabled={isApproving}
                className="rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isApproving ? "Approving..." : "Yes, Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Reason Modal for Non-Green Zones */}
      {showApprovalReasonModal && selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 bg-amber-50">
              <h3 className="text-lg font-semibold text-slate-900">
                Approval Reason Required
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                This application is in{" "}
                <span className="font-semibold uppercase text-amber-700">
                  {selectedApplication.recommendation_details?.zone} zone
                </span>
                . Please provide a reason for approval.
              </p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Approval Reason
                </label>
                <textarea
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  placeholder="Enter the reason for approving this grant..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none"
                  rows={4}
                  disabled={isApproving}
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={approvalDeclaration}
                  onChange={(e) => setApprovalDeclaration(e.target.checked)}
                  disabled={isApproving}
                  className="mt-1 rounded border-slate-300 cursor-pointer"
                />
                <span className="text-xs text-slate-700">
                  I am declaring that this grant should be approved despite the
                  zone classification
                </span>
              </label>

              {approvalError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3">
                  <p className="text-xs text-rose-700">{approvalError}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowApprovalReasonModal(false);
                  setApprovalReason("");
                  setApprovalDeclaration(false);
                  setApprovalError(null);
                }}
                disabled={isApproving}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprovalWithReason}
                disabled={
                  isApproving || !approvalReason.trim() || !approvalDeclaration
                }
                className="rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isApproving ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecommendationPage() {
  return (
    <Suspense fallback={<div>Loading recommendations...</div>}>
      <RecommendationPageData />
    </Suspense>
  );
}
