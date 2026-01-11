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
  const [isDownloading, setIsDownloading] = useState(false);

  // Accordion state management
  const [accordionState, setAccordionState] = useState({
    verificationResults: true, // Default open when toggle is ON
    recommendationDetails: false, // Default closed when toggle is ON
    personalDetailsVerification: false,
    identityDetails: false,
    personalDetails: false,
    documentDetails: false,
    universityDetails: false,
    recommendationsDetailsTable: true, // Default open for the table
    sourceVerifications: false, // For 03 Verifications by Source section
  });

  // Tab state for Personal Details Verifications
  const [personalDetailsTab, setPersonalDetailsTab] = useState<"identity" | "personal">("identity");

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
        personalDetailsVerification: false,
        identityDetails: false,
        personalDetails: false,
        documentDetails: false,
        universityDetails: false,
        recommendationsDetailsTable: true,
        sourceVerifications: false, // Always collapsed by default
      });
    }
  }, [verificationInProgress]);

  // Reset accordion state when application changes
  useEffect(() => {
    if (selectedApplication && verificationInProgress !== null) {
      setAccordionState({
        verificationResults: verificationInProgress,
        recommendationDetails: !verificationInProgress,
        personalDetailsVerification: false,
        identityDetails: false,
        personalDetails: false,
        documentDetails: false,
        universityDetails: false,
        recommendationsDetailsTable: true,
        sourceVerifications: false, // Always collapsed by default
      });
      // Reset verification details when application changes
      setShowVerificationDetails(false);
      setVerificationResults(null);
      
      // Auto-fetch verification when verificationInProgress is false (when view button is clicked)
      if (verificationInProgress === false) {
        // Use setTimeout to ensure state reset happens first
        setTimeout(() => {
          handleFetchVerification();
        }, 0);
      }
    }
  }, [selectedApplication?.id, verificationInProgress]);

  // Helper function to check if any verification status is not verified/inprogress/rejected
  // Returns true if should show reject tick (i.e., has status that is not verified/inprogress/rejected)
  const shouldShowRejectTick = (results: any): boolean => {
    if (!results || typeof results !== "object") return false;
    
    const documentEntries = Object.entries(results).filter(([docType, docData]) => {
      if (docType === "application_id") return false;
      if (!docData || typeof docData !== "object") return false;
      return true;
    });

    if (documentEntries.length === 0) return false;

    // Check all verification entries
    for (const [, docData] of documentEntries) {
      if (!Array.isArray(docData) || docData.length === 0) continue;
      const latest = docData[docData.length - 1];
      const verificationValue = latest?.result?.verification;
      
      // verificationValue: true = verified, false = failed/rejected, null = inprogress
      // Status is valid if it's verified (true), inprogress (null), or rejected/failed (false)
      // Show reject tick if status is something else (undefined, unexpected value, etc.)
      const isValidStatus = verificationValue === true || verificationValue === false || verificationValue === null;
      if (!isValidStatus) {
        return true; // Invalid/unexpected status, show reject tick
      }
    }
    
    return false; // All statuses are valid (verified/inprogress/rejected)
  };

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
            ? { ...app, application_status: "grant_approved" }
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
          ? { ...app, application_status: "grant_approved" }
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
      // Only auto-expand when verificationInProgress is true, keep collapsed when false
      if (verificationInProgress) {
        setAccordionState((prev) => ({
          ...prev,
          sourceVerifications: true, // Expand the section when verification is fetched in verification mode
        }));
      }
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
        Course Level
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
                  <th className="px-5 py-3 font-semibold">Application ID</th>
                  <th className="px-5 py-3 font-semibold">Applicant Name</th>
                  {!verificationInProgress && (
                    <th className="px-5 py-3 font-semibold">Weightage Score</th>
                  )}
                  <th className="px-5 py-3 font-semibold">Submitted At</th>
                  <th className="px-5 py-3 font-semibold text-right">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">
                    File Detail
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
                    <td className="px-5 py-3 text-slate-600 font-mono text-[13px]">
                      {application.application_id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-5 py-3 text-slate-900">
                      {application.full_name || "—"}
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

      {selectedApplication && (() => {
        // Helper function to format date as "March 15, 2024"
        const formatAppliedDate = (dateString: string | null) => {
          if (!dateString) return "";
          const date = new Date(dateString);
          if (Number.isNaN(date.getTime())) return "";
          return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        };

        // Get applied date
        const appliedDate = selectedApplication.recommendation_details?.applicationSubmittedOn 
          || selectedApplication.submitted_at 
          || null;
        const formattedDate = formatAppliedDate(appliedDate);

        // Format date with time for footer
        const formatSubmittedDateTime = (dateString: string | null) => {
          if (!dateString) return "";
          const date = new Date(dateString);
          if (Number.isNaN(date.getTime())) return "";
          return date.toLocaleString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
            timeZoneName: "short",
          });
        };
        const submittedDateTime = formatSubmittedDateTime(appliedDate);

        // Get scholarship type based on course level priority
        const getScholarshipType = () => {
          return "Post-Graduation Scholarship";
        };

        // Format status
        const formatStatus = (status: string) => {
          return status
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        };

        // Get rank
        const rank = selectedApplication.recommendation_details?.finalRank || selectedApplication.finalRank;

        // Get score
        const score = selectedApplication.recommendation_details?.scoreBreakdown?.totalScore;

        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
            <div className="w-full max-w-5xl rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-900/30 overflow-hidden">
              <div className="w-full max-w-5xl rounded-xl bg-gradient-to-r from-blue-500 to-blue-800 p-6 text-white relative">
                {/* Close button */}
                <button
                  type="button"
                  onClick={() => setSelectedApplication(null)}
                  className="absolute top-4 right-4 text-white text-xl hover:text-white/80 transition-colors"
                >
                  ×
                </button>

                {/* Header */}
                <div className="flex items-center justify-between">
                  {/* Left: Name, ID, and Applied Date */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-semibold">
                        {selectedApplication.full_name || "Unnamed Applicant"}
                      </h2>
                      <span className="rounded-full bg-white/20 px-3 py-1 text-sm">
                        ID: {selectedApplication.application_id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-white/80">
                      {formattedDate && `Applied: ${formattedDate}`}
                      {formattedDate && " • "}
                      {getScholarshipType()}
                    </p>
                  </div>

                  {/* Right: Stats */}
                  <div className="flex gap-4 px-6 ">
                    {!verificationInProgress && rank !== null && rank !== undefined && (
                      <div className="rounded-lg bg-white/15 px-5 py-3 text-center">
                        <p className="text-sm text-white/80">Rank</p>
                        <p className="text-xl font-bold">#{rank} 🏆</p>
                      </div>
                    )}
                    {!verificationInProgress && score !== null && score !== undefined && (
                      <div className="rounded-lg bg-white/15 px-5 py-3 text-center">
                        <p className="text-sm text-white/80">Score</p>
                        <p className="text-xl font-bold">{score.toFixed(2)}</p>
                      </div>
                    )}
                    <div className="rounded-lg bg-white/15 px-5 py-3 text-center">
                      <p className="text-sm text-white/80">Status</p>
                      <p className="text-sm font-semibold text-green-300">
                        {formatStatus(selectedApplication.application_status)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar
              <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-end gap-3">
                {!verificationInProgress && (
                  <button
                    type="button"
                    onClick={() => setShowApprovalConfirmation(true)}
                    className="rounded-lg bg-emerald-500 hover:bg-emerald-600 px-6 py-2 text-sm font-medium text-white transition-colors"
                  >
                    ✓ Approve Grant
                  </button>
                )}
                <button
                  onClick={async () => {
                    setIsDownloading(true);
                    try {
                      const res = await fetch("/api/download-pdf", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          applicationId: selectedApplication.application_id,
                          data: selectedApplication,
                        }),
                      });

                      if (!res.ok) {
                        let errorMessage = "Failed to generate PDF";
                        try {
                          const errorData = await res.json();
                          errorMessage = errorData.error || errorMessage;
                        } catch {
                          // If response is not JSON, use default message
                        }
                        throw new Error(errorMessage);
                      }

                      const blob = await res.blob();
                      const url = window.URL.createObjectURL(blob);

                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `application-${selectedApplication.application_id}.pdf`;
                      a.click();

                      window.URL.revokeObjectURL(url);
                    } catch (error) {
                      alert(
                        error instanceof Error
                          ? error.message
                          : "Failed to generate PDF. Please check your AWS S3 configuration."
                      );
                    } finally {
                      setIsDownloading(false);
                    }
                  }}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-purple-700 rounded-lg hover:bg-purple-50 disabled:bg-purple-100 disabled:text-purple-400 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-sm shadow-sm hover:shadow border border-purple-200 hover:border-purple-300"
                >
                  {isDownloading ? (
                    <>
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
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Download PDF
                    </>
                  )}
                </button>
              </div> */}

              <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[70vh] overflow-y-auto bg-slate-50">
              {/* Personal Details Verifications Section */}
              <section className="md:col-span-2 space-y-0 border-2 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <svg
                      className="w-6 h-6 text-black"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <h3 className="text-base font-bold text-slate-900">
                      01 Personal Details Verifications
                    </h3>
                    {/* Green Checkmark */}
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                  </div>
                  {/* Collapse/Expand Control */}
                  <button
                    type="button"
                    onClick={() =>
                      setAccordionState((prev) => ({
                        ...prev,
                        personalDetailsVerification: !prev.personalDetailsVerification,
                      }))
                    }
                    className="text-slate-900 hover:text-black/80 transition-colors"
                  >
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        accordionState.personalDetailsVerification ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                </div>

                {accordionState.personalDetailsVerification && (
                  <div className="bg-white">
                    {/* Tabs */}
                    <div className="border-b border-slate-200 flex">
                      <button
                        type="button"
                        onClick={() => setPersonalDetailsTab("identity")}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${
                          personalDetailsTab === "identity"
                            ? "text-blue-600 border-b-2 border-blue-600"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Identity
                      </button>
                      <button
                        type="button"
                        onClick={() => setPersonalDetailsTab("personal")}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${
                          personalDetailsTab === "personal"
                            ? "text-blue-600 border-b-2 border-blue-600"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Personal
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      {personalDetailsTab === "identity" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Left Column */}
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Full Name</p>
                              <p className="text-sm font-semibold text-slate-900">
                                {selectedApplication.full_name || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Date of Birth</p>
                              <p className="text-sm font-semibold text-slate-900">
                                {selectedApplication.dob_year &&
                                selectedApplication.dob_month &&
                                selectedApplication.dob_day
                                  ? new Date(
                                      selectedApplication.dob_year,
                                      selectedApplication.dob_month - 1,
                                      selectedApplication.dob_day
                                    ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })
                                  : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Category</p>
                              <p className="text-sm font-semibold text-slate-900">
                                {getCategoryFromApplication(selectedApplication)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Mobile Number</p>
                              <p className="text-sm font-semibold text-slate-900">
                                {selectedApplication.phone
                                  ? `+91 ${selectedApplication.phone}`
                                  : "—"}
                              </p>
                            </div>
                          </div>

                          {/* Right Column */}
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Aadhaar Number</p>
                              <p className="text-sm font-semibold text-slate-900">
                                {selectedApplication.aadhaar_number}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Gender</p>
                              <p className="text-sm font-semibold text-slate-900 capitalize">
                                {selectedApplication.gender || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Disability Status</p>
                              <p className="text-sm font-semibold text-slate-900">No</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Email Address</p>
                              <p className="text-sm font-semibold text-slate-900">
                                {selectedApplication.email || "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Left Column */}
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Father&apos;s Name</p>
                              <p className="text-sm font-semibold text-slate-900">
                                {selectedApplication.father_name || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Mother&apos;s Name</p>
                              <p className="text-sm font-semibold text-slate-900">
                                {selectedApplication.mother_name || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Marital Status</p>
                              <p className="text-sm font-semibold text-slate-900 capitalize">
                                {selectedApplication.marital_status || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Phone</p>
                              <p className="text-sm font-semibold text-slate-900">
                                {selectedApplication.phone || "—"}
                              </p>
                            </div>
                          </div>

                          {/* Right Column */}
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Gender</p>
                              <p className="text-sm font-semibold text-slate-900 capitalize">
                                {selectedApplication.gender || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Mother Tongue</p>
                              <p className="text-sm font-semibold text-slate-900">
                                {selectedApplication.mother_tongue || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Email</p>
                              <p className="text-sm font-semibold text-slate-900">
                                {selectedApplication.email || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Address</p>
                              <p className="text-sm font-semibold text-slate-900">
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
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* Document Validation Results Section */}
              {(() => {
                const validationData = parseValidationResult(
                  selectedApplication.validation_result
                );

                if (!validationData) return null;

                return (
                  <section className="md:col-span-2 space-y-0 border-2 rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Document Icon with Paperclip */}
                        <div className="relative">
                          <svg
                            className="w-6 h-6 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <svg
                            className="w-3 h-3 text-blue-600 absolute -top-1 -right-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">
                          02 Document Validations Results
                        </h3>
                        {/* Green Checkmark */}
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Collapse/Expand Control */}
                        <button
                          type="button"
                          onClick={() =>
                            setAccordionState((prev) => ({
                              ...prev,
                              verificationResults: !prev.verificationResults,
                            }))
                          }
                          className="text-slate-900 hover:text-black/80 transition-colors"
                        >
                          <svg
                            className={`w-5 h-5 transition-transform ${
                              accordionState.verificationResults ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {accordionState.verificationResults && (
                      <div className="bg-gray-50 p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {Object.entries(
                            validationData.verification_results || {}
                          ).map(([docType, result]: [string, any], index) => {
                            const cardNumber = `2.${index + 1}`;
                            const docLabel = getDocumentTypeLabel(docType);
                            
                            return (
                              <div
                                key={docType}
                                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                              >
                                {/* Card Header */}
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-semibold text-slate-900">
                                    {cardNumber} {docLabel}
                                  </h4>
                                  {result.success && result.is_eligible === true && (
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                        <svg
                                          className="w-3 h-3 text-white"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      </div>
                                      <span className="text-xs font-semibold text-green-700">
                                        Eligible
                                      </span>
                                    </div>
                                  )}
                                  {result.success && result.is_eligible === false && (
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                                        <svg
                                          className="w-3 h-3 text-white"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      </div>
                                      <span className="text-xs font-semibold text-amber-700">
                                        Not Eligible
                                      </span>
                                    </div>
                                  )}
                                  {result.success && result.is_eligible === null && (
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">?</span>
                                      </div>
                                      <span className="text-xs font-semibold text-blue-700">
                                        Review
                                      </span>
                                    </div>
                                  )}
                                  {!result.success && (
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                        <svg
                                          className="w-3 h-3 text-white"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      </div>
                                      <span className="text-xs font-semibold text-red-700">
                                        Failed
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Description */}
                                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                                  {result.message ||
                                    "No verification message available"}
                                </p>

                                {/* Details */}
                                {result.data && (
                                  <div className="space-y-2 pt-3 border-t border-gray-200">
                                    {result.data.gross_income_numeric !==
                                      undefined && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-600">
                                          Gross Income
                                        </span>
                                        <span className="text-xs font-semibold text-slate-900">
                                          ₹
                                          {result.data.gross_income_numeric.toLocaleString(
                                            "en-IN"
                                          )}
                                        </span>
                                      </div>
                                    )}
                                    {result.data.income_limit !== undefined && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-600">
                                          Income Limit
                                        </span>
                                        <span className="text-xs font-semibold text-slate-900">
                                          ₹
                                          {result.data.income_limit.toLocaleString(
                                            "en-IN"
                                          )}
                                        </span>
                                      </div>
                                    )}
                                    {result.data.percentage !== undefined &&
                                      result.data.percentage !== null && (
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-slate-600">
                                            Percentage
                                          </span>
                                          <span className="text-xs font-semibold text-slate-900">
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
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-slate-600">
                                            Percentage
                                          </span>
                                          <span className="text-xs font-semibold text-slate-900">
                                            {result.data.percentage_numeric.toFixed(
                                              2
                                            )}
                                            %
                                          </span>
                                        </div>
                                      )}
                                    {result.data.cgpa !== undefined &&
                                      result.data.cgpa !== null && (
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-slate-600">
                                            CGPA
                                          </span>
                                          <span className="text-xs font-semibold text-slate-900">
                                            {result.data.cgpa}
                                            {result.data.cgpa_scale &&
                                              ` / ${result.data.cgpa_scale}`}
                                          </span>
                                        </div>
                                      )}
                                    {result.data.category && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-600">
                                          Category
                                        </span>
                                        <span className="text-xs font-semibold text-slate-900 uppercase">
                                          {result.data.category}
                                        </span>
                                      </div>
                                    )}
                                    {result.data.extracted_caste &&
                                      result.data.extracted_caste !==
                                        "Not Available" && (
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs text-slate-600">
                                            Extracted Caste
                                          </span>
                                          <span className="text-xs font-semibold text-slate-900">
                                            {result.data.extracted_caste}
                                          </span>
                                        </div>
                                      )}
                                    {result.data.extracted_name && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-600">
                                          Document Name
                                        </span>
                                        <span className="text-xs font-semibold text-slate-900">
                                          {result.data.extracted_name}
                                        </span>
                                      </div>
                                    )}
                                    {result.data.student_name && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-600">
                                          Student Name
                                        </span>
                                        <span className="text-xs font-semibold text-slate-900">
                                          {result.data.student_name}
                                        </span>
                                      </div>
                                    )}
                                    {result.data.year_of_passing && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-600">
                                          Year of Passing
                                        </span>
                                        <span className="text-xs font-semibold text-slate-900">
                                          {result.data.year_of_passing}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </section>
                );
              })()}

              {/* 03 Verifications by Source Section */}
              <section className="md:col-span-2 space-y-0 border-2 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <svg
                      className="w-6 h-6 text-black"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h3 className="text-base font-bold text-slate-900">
                      03 Verifications by Source
                    </h3>
                    {/* Tick or Reject Mark */}
                    {showVerificationDetails && verificationResults && (
                      <>
                        {shouldShowRejectTick(verificationResults) ? (
                          // Reject Tick (Red X)
                          <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        ) : (
                          // Green Checkmark
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {verificationInProgress && (
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
                    )}
                    {/* Collapse/Expand Control */}
                    <button
                      type="button"
                      onClick={() =>
                        setAccordionState((prev) => ({
                          ...prev,
                          sourceVerifications: !prev.sourceVerifications,
                        }))
                      }
                      className="text-slate-900 hover:text-black/80 transition-colors"
                    >
                      <svg
                        className={`w-5 h-5 transition-transform ${
                          accordionState.sourceVerifications ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {accordionState.sourceVerifications && showVerificationDetails && verificationResults && (
                  <div className="bg-white p-6">
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {documentEntries.map(
                            ([docType, docData]: [string, any], index) => {
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
                              const cardNumber = `3.${index + 1}`;

                              return (
                                <div
                                  key={docType}
                                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                                >
                                  {/* Card Header */}
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <h4 className="text-sm font-semibold text-slate-900">
                                        {cardNumber} {getDocumentTypeLabel(docType)}
                                      </h4>
                                      <p className="text-xs text-slate-600 mt-1">
                                        {verificationType}
                                      </p>
                                    </div>
                                    {verificationState === "verified" && (
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                          <svg
                                            className="w-3 h-3 text-white"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                        </div>
                                        <span className="text-xs font-semibold text-green-700">
                                          Verified
                                        </span>
                                      </div>
                                    )}
                                    {verificationState === "failed" && (
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                          <svg
                                            className="w-3 h-3 text-white"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                        </div>
                                        <span className="text-xs font-semibold text-red-700">
                                          Not Verified
                                        </span>
                                      </div>
                                    )}
                                    {verificationState === "inprogress" && (
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                                          <span className="text-white text-xs font-bold">⏳</span>
                                        </div>
                                        <span className="text-xs font-semibold text-amber-700">
                                          In Progress
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="space-y-3">
                                    {reason && (
                                      <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2">
                                        <p className="text-xs text-yellow-800">
                                          <span>Status Details:</span>
                                          <br />
                                          <span>{reason}</span>
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
                                      <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                                        <p className="text-xs text-blue-800">
                                          <span>Verified Sources:</span>
                                          <br />
                                          <span>{source}</span>
                                        </p>
                                      </div>
                                    )}

                                    {Object.keys(dataReceived).length > 0 && (
                                      <div className="space-y-2 pt-3 border-t border-gray-200">
                                        {Object.entries(dataReceived).map(
                                          ([key, value]) => (
                                            <div
                                              key={key}
                                              className="flex justify-between items-center"
                                            >
                                              <span className="text-xs text-slate-600 capitalize">
                                                {key.replace(/_/g, " ")}:
                                              </span>
                                              <span className="text-xs font-semibold text-slate-900 text-right">
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
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </section>

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

              {selectedApplication.recommendation_details &&
                !verificationInProgress &&
                selectedApplication.recommendation_details.scoreBreakdown && (
                  <section className="md:col-span-2 space-y-4">
                    {/* Recommendations Details Table */}
                    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                            {/* Header */}
                            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-5 bg-blue-600 rounded"></div>
                                <svg
                                  className="w-5 h-5 text-gray-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                                  />
                                </svg>
                                <h4 className="text-base font-bold text-gray-900">
                                  04 Recommendations Details
                                </h4>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setAccordionState((prev) => ({
                                    ...prev,
                                    recommendationsDetailsTable: !prev.recommendationsDetailsTable,
                                  }))
                                }
                                className="text-gray-600 hover:text-gray-800 transition-colors"
                              >
                                <svg
                                  className={`w-5 h-5 transition-transform ${
                                    accordionState.recommendationsDetailsTable ? "rotate-180" : ""
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 15l7-7 7 7"
                                  />
                                </svg>
                              </button>
                            </div>

                            {accordionState.recommendationsDetailsTable && (
                              <div className="bg-gray-50">
                                {/* Table Header */}
                                <div className="grid grid-cols-3 bg-gray-100 border-b border-gray-200">
                                  <div className="px-6 py-3 text-sm font-medium text-gray-600">
                                    Criteria
                                  </div>
                                  <div className="px-6 py-3 text-sm font-medium text-gray-600 text-center">
                                    Value
                                  </div>
                                  <div className="px-6 py-3 text-sm font-medium text-gray-600 text-right">
                                    Weightage Score
                                  </div>
                                </div>

                                {/* Table Rows */}
                                {(() => {
                                  const rd = selectedApplication.recommendation_details;
                                  const sb = rd?.scoreBreakdown;
                                  
                                  // Format course level priority
                                  const getCourseLevelText = () => {
                                    const priority = rd?.courseLevelPriority;
                                    if (priority === 1) return "PhD (High)";
                                    if (priority === 2) return "Post Graduation";
                                    if (priority === 3) return "Graduation";
                                    return "—";
                                  };

                                  // Format income
                                  const formatIncome = (income: number | null) => {
                                    if (!income) return "—";
                                    if (income >= 100000) {
                                      return `₹${(income / 100000).toFixed(1)}L`;
                                    }
                                    return `₹${income.toLocaleString("en-IN")}`;
                                  };

                                  // Format DOB
                                  const formatDOB = () => {
                                    const app = selectedApplication;
                                    if (app.dob_year && app.dob_month && app.dob_day) {
                                      const date = new Date(
                                        app.dob_year,
                                        app.dob_month - 1,
                                        app.dob_day
                                      );
                                      return date.toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      });
                                    }
                                    return "—";
                                  };

                                  const rows = [
                                    {
                                      criteria: "QS University Rank",
                                      value: rd?.universityRanking
                                        ? `#${rd.universityRanking}`
                                        : "—",
                                      score: sb?.universityScore?.toFixed(2) || "0.00",
                                      max: "25",
                                      icon: "🏛️",
                                    },
                                    {
                                      criteria: "Qualifying Degree Percentage",
                                      value: rd?.qualifyingDegreePercentage
                                        ? `${rd.qualifyingDegreePercentage.toFixed(1)}%`
                                        : "—",
                                      score: sb?.academicScore?.toFixed(2) || "0.00",
                                      max: "25",
                                      icon: "📚",
                                    },
                                    {
                                      criteria: "Annual Family Income",
                                      value: formatIncome(rd?.annualFamilyIncome || null),
                                      score: sb?.incomeScore?.toFixed(2) || "0.00",
                                      max: "15",
                                      icon: "💰",
                                    },
                                    {
                                      criteria: "First-Time Beneficiary",
                                      value: rd?.isFirstTimeBeneficiary ? "Yes" : "No",
                                      score: sb?.beneficiaryScore?.toFixed(2) || "0.00",
                                      max: "15",
                                      icon: "✅",
                                    },
                                    {
                                      criteria: "DOB (year/month/day)",
                                      value: formatDOB(),
                                      score: sb?.ageScore?.toFixed(2) || "0.00",
                                      max: "5",
                                      icon: "📅",
                                    },
                                  ];

                                  return (
                                    <>
                                      {rows.map((row, index) => (
                                        <div
                                          key={index}
                                          className={`grid grid-cols-3 ${
                                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                                          } border-b border-gray-100 last:border-b-0`}
                                        >
                                          <div className="px-6 py-4 flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-lg">
                                              {row.icon}
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">
                                              {row.criteria}
                                            </span>
                                          </div>
                                          <div className="px-6 py-4 flex items-center justify-center">
                                            <span className="text-sm font-bold text-blue-600">
                                              {row.value}
                                            </span>
                                          </div>
                                          <div className="px-6 py-4 flex items-center justify-end">
                                            <span className="text-sm font-bold text-blue-600">
                                              {row.score}{" "}
                                              <span className="text-gray-500">/ {row.max}</span>
                                            </span>
                                          </div>
                                        </div>
                                      ))}

                                      {/* Total */}
                                      <div className="grid grid-cols-3 bg-blue-50 border-t-2 border-blue-200">
                                        <div className="px-6 py-4 col-span-2">
                                          <span className="text-sm font-bold text-gray-900">
                                            Total Score
                                          </span>
                                        </div>
                                        <div className="px-6 py-4 flex items-center justify-end">
                                          <span className="text-lg font-bold text-blue-600">
                                            {sb?.totalScore?.toFixed(2) || "0.00"}{" "}
                                            <span className="text-gray-600">/ 100</span>
                                          </span>
                                        </div>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                  </section>
                )}


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


            </div>

            {/* Footer with Submitted Date and Approve Grant Button */}
            <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
              {/* Left: Submitted Date */}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  {submittedDateTime ? `Submitted: ${submittedDateTime}` : "Submitted: —"}
                </span>
              </div>

              {/* Right: Download PDF and Approve Grant Buttons */}
              {!verificationInProgress && (
                <div className="flex items-center gap-3">
                  {/* Download PDF Button */}
                  <button
                    type="button"
                    onClick={async () => {
                      setIsDownloading(true);
                      try {
                        const res = await fetch("/api/download-pdf", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            applicationId: selectedApplication.application_id,
                            data: selectedApplication,
                          }),
                        });

                        if (!res.ok) {
                          let errorMessage = "Failed to generate PDF";
                          try {
                            const errorData = await res.json();
                            errorMessage = errorData.error || errorMessage;
                          } catch {
                            // If response is not JSON, use default message
                          }
                          throw new Error(errorMessage);
                        }

                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);

                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `application-${selectedApplication.application_id}.pdf`;
                        a.click();

                        window.URL.revokeObjectURL(url);
                      } catch (error) {
                        alert(
                          error instanceof Error
                            ? error.message
                            : "Failed to generate PDF. Please check your AWS S3 configuration."
                        );
                      } finally {
                        setIsDownloading(false);
                      }
                    }}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-purple-700 rounded-lg hover:bg-purple-50 disabled:bg-purple-100 disabled:text-purple-400 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-sm shadow-sm hover:shadow border border-purple-200 hover:border-purple-300"
                  >
                    {isDownloading ? (
                      <>
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
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Download PDF
                      </>
                    )}
                  </button>

                  {/* Approve Grant Button */}
                  <button
                    type="button"
                    onClick={() => setShowApprovalConfirmation(true)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-sm font-medium text-white transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Approve Grant
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        );
      })()}

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
                      {selectedApplication.application_id
                        .slice(-6)
                        .toUpperCase()}
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
