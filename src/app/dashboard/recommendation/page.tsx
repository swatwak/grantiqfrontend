"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { statusStyles } from "../rejection-logs/page";
import { Suspense } from "react";
import { toPng } from "html-to-image";
import { IoMdTime } from "react-icons/io";
import ViewModal from "./viewModal/page";

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
  isFirstTimeBeneficiary: string | null;
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
  const [showVerificationDetails, setShowVerificationDetails] = useState(true);

  const [isLoadingVerification, setIsLoadingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [courseConfig, setCourseConfig] = useState<CourseConfig[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Accordion state management
  const [accordionState, setAccordionState] = useState({
    verificationResults: false, // Default open when toggle is ON
    recommendationDetails: false, // Default closed when toggle is ON
    personalDetailsVerification: false,
    identityDetails: false,
    personalDetails: false,
    documentDetails: false,
    universityDetails: false,
    recommendationsDetailsTable: true, // Default open for the table
    sourceVerifications: false, // For 03 Verifications by Source section
    validationResults: false,
  });

  // Tab state for Personal Details Verifications
  const [personalDetailsTab, setPersonalDetailsTab] = useState<
    "identity" | "personal"
  >("identity");

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
        validationResults: false,
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
        validationResults: false,
      });
      // Reset verification details when application changes
      // setShowVerificationDetails(false);
      setVerificationResults(null);

      handleFetchVerification();

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

    const documentEntries = Object.entries(results).filter(
      ([docType, docData]) => {
        if (docType === "application_id") return false;
        if (!docData || typeof docData !== "object") return false;
        return true;
      }
    );

    if (documentEntries.length === 0) return false;

    // Check all verification entries
    for (const [, docData] of documentEntries) {
      if (!Array.isArray(docData) || docData.length === 0) continue;
      const latest = docData[docData.length - 1];
      const verificationValue = latest?.result?.verification;

      // verificationValue: true = verified, false = failed/rejected, null = inprogress
      // Status is valid if it's verified (true), inprogress (null), or rejected/failed (false)
      // Show reject tick if status is something else (undefined, unexpected value, etc.)
      const isValidStatus =
        verificationValue === true ||
        verificationValue === false ||
        verificationValue === null;
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
    // setShowVerificationDetails(false);
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

  const expandAllForPdf = () => {
    setAccordionState({
      verificationResults: true,
      recommendationDetails: true,
      personalDetailsVerification: true,
      identityDetails: true,
      personalDetails: true,
      documentDetails: true,
      universityDetails: true,
      recommendationsDetailsTable: true,
      sourceVerifications: true,
      validationResults: true,
    });
  };

  const captureSection = async (id: string) => {
    const el = document.getElementById(id);
    if (!el) return null;

    return await toPng(el, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);

    try {
      expandAllForPdf();

      // wait for accordion animation
      await new Promise((r) => setTimeout(r, 500));

      const images = {
        personal: await captureSection("pdf-personal-details"),
        documents: await captureSection("pdf-document-validation"),
        source: await captureSection("pdf-source-verification"),
        recommendations: await captureSection("pdf-recommendations"),
      };

      const res = await fetch("/api/download-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: selectedApplication?.application_id,
          data: selectedApplication,
          images,
        }),
      });

      if (!res.ok) throw new Error("PDF generation failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `application-${selectedApplication?.application_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  function countGrantAllocated(applications: ApiApplication[]): number {
    if (!Array.isArray(applications)) return 0;

    return applications.filter(
      (app) => app.application_status === "grant_approved"
    ).length;
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
      <div className="flex flex-wrap gap-2 items-center">
        <div className="text-sm text-slate-700">Course</div>

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

      <div className="flex flex-wrap gap-2 items-center">
        {/* Course Field */}
        {/* Selection Warning */}
        {(selectedCourseType === "all" || selectedCourseField === "all") && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Please select both <strong>Course Type</strong> and{" "}
            <strong>Course Field</strong> to view rankings.
          </div>
        )}
        <div className="text-sm text-slate-700">Course Field</div>

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
      {applications.length !== 0 && !isLoading && (
        <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-2 flex flex-row items-center justify-center gap-4">
            <p className="text-sm text-slate-600">Total Applicants</p>
            <p className="text-xl font-semibold text-slate-900">
              {isLoading ? "" : `${filteredAndSortedApplications.length}`}
            </p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-2 flex flex-row items-center justify-center gap-4">
            <p className="text-sm text-slate-600">Total Seats Available</p>
            <p className="text-xl font-semibold text-slate-900">
              {
                getCourseConfig(selectedCourseType!, selectedCourseField!)
                  ?.seats
              }{" "}
            </p>
          </div>
          {verificationInProgress ? (
            <></>
          ) : (
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-2 flex flex-row items-center justify-center gap-4">
              <p className="text-sm text-slate-600">Grant Allocated</p>
              <p className="text-xl font-semibold text-slate-900">
                {countGrantAllocated(applications)}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          {/* <div className="flex items-center gap-3">
            <div>
              <p className="text-xs text-slate-600">
                {isLoading
                  ? "Loading applications..."
                  : `${filteredAndSortedApplications.length} applications`}
              </p>
            </div>
          </div> */}

          {/* <div className="text-sm text-slate-600 flex items-center gap-3">
            {getCourseConfig(selectedCourseType!, selectedCourseField!)?.seats}{" "}
            {getCourseConfig(selectedCourseType!, selectedCourseField!) &&
              "Seats Available"}
          </div> */}

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs text-slate-600 w-full sm:w-auto">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by applicant"
                className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[56vh]">
          {error ? (
            <div className="px-5 py-6 text-sm text-rose-600 bg-rose-50">
              {error}
            </div>
          ) : applications.length === 0 && !isLoading ? (
            <div className="px-5 py-6 text-sm text-slate-600">
              Select a Course data to view applications.
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600 border-b border-slate-200">
                    {!verificationInProgress && (
                      <th className="px-5 py-3 font-semibold">Rank</th>
                    )}
                    <th className="px-5 py-3 font-semibold">Application ID</th>
                    <th className="px-5 py-3 font-semibold">Applicant Name</th>
                    {!verificationInProgress && (
                      <th className="px-5 py-3 font-semibold">
                        Weightage Score
                      </th>
                    )}
                    <th className="px-5 py-3 font-semibold">Submitted At</th>
                    <th className="px-5 py-3 font-semibold text-left">
                      Status
                    </th>
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
                        <td className="px-5 py-3 text-slate-900 font-medium text-center">
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
                          onClick={() => {
                            setSelectedApplication(application);
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
            </div>
          )}
        </div>
      </div>

      <ViewModal
        selectedApplication={selectedApplication}
        onClose={() => setSelectedApplication(null)}
        verificationInProgress={verificationInProgress}
        verificationResults={verificationResults}
        showVerificationDetails={showVerificationDetails}
        verificationError={verificationError}
        courseConfig={courseConfig}
        selectedCourseType={selectedCourseType}
        selectedCourseField={selectedCourseField}
        onApproveClick={() => setShowApprovalConfirmation(true)}
      />

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
                <span className="">ID:</span>
                <span className="font-mono font-semibold">
                  {selectedApplication.application_id.slice(-6).toUpperCase()}
                </span>
                <br />
                <span className="font-semibold">
                  {selectedApplication.full_name}
                </span>
              </p>
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
                This application is not in the green zone. Please provide a
                reason for approval.
              </p>
            </div>

            <div className="px-6 py-4">
              <textarea
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder="Enter reason for approval..."
                className="w-full min-h-[100px] px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowApprovalReasonModal(false);
                  setApprovalReason("");
                }}
                disabled={isApproving}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (approvalReason.trim()) {
                    handleApprovalWithReason();
                  }
                }}
                disabled={isApproving || !approvalReason.trim()}
                className="rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isApproving ? "Approving..." : "Approve with Reason"}
              </button>
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
                <span className="">ID:</span>
                <span className="font-mono font-semibold">
                  {selectedApplication.application_id.slice(-6).toUpperCase()}
                </span>
                <br />
                <span className="font-semibold">
                  {selectedApplication.full_name}
                </span>
              </p>
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
                This application is not in the green zone. Please provide a
                reason for approval.
              </p>
            </div>

            <div className="px-6 py-4">
              <textarea
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder="Enter reason for approval..."
                className="w-full min-h-[100px] px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowApprovalReasonModal(false);
                  setApprovalReason("");
                }}
                disabled={isApproving}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (approvalReason.trim()) {
                    handleApprovalWithReason();
                  }
                }}
                disabled={isApproving || !approvalReason.trim()}
                className="rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isApproving ? "Approving..." : "Approve with Reason"}
              </button>
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
                <span className="">ID:</span>
                <span className="font-mono font-semibold">
                  {selectedApplication.application_id.slice(-6).toUpperCase()}
                </span>
                <br />
                <span className="font-semibold">
                  {selectedApplication.full_name}
                </span>
              </p>
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
                {/* This application is in{" "}
                <span className="font-semibold uppercase text-amber-700">
                  {selectedApplication.recommendation_details?.zone} zone
                </span> */}
                As the beneficiary does not belong to Zone-1, kindly provide the
                exceptional reason for proceeding with the approval
              </p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <textarea
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
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
                  I am declaring that this grant should be approved
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
