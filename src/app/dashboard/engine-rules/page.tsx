"use client";

import { useState, useEffect } from "react";

type CategoryType = "SC" | "ST" | "Minority" | "Open" | "all";

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

type DataConfig = {
  enrollmentStartDate: string;
  enrollmentEndDate: string;
  grantAllocationStartDate: string;
  grantAllocationEndDate: string;
};

type TabType = "seats" | "weightage" | "dataconfig";

// Default hardcoded dates
const defaultDataConfig: DataConfig = {
  enrollmentStartDate: "2026-03-07",
  enrollmentEndDate: "2026-08-31",
  grantAllocationStartDate: "2026-09-07",
  grantAllocationEndDate: "2026-11-30",
};

export default function EngineRulesPage() {
  const [activeTab, setActiveTab] = useState<TabType>("seats");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("all");
  const [isEditing, setIsEditing] = useState(false);
  const [editedConfig, setEditedConfig] = useState<CourseConfig[]>([]);
  const [totalSeats, setTotalSeats] = useState("");
  const [academicThreshold, setAcademicThreshold] = useState("");
  const [incomeThreshold, setIncomeThreshold] = useState("");
  const [ageThreshold, setAgeThreshold] = useState("");
  const [courseConfig, setCourseConfig] = useState<CourseConfig[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  type ConfirmState = {
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  };

  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Load from localStorage with lazy initializer
  const [dataConfig, setDataConfig] = useState<DataConfig>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dataConfig");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Merge with defaults to ensure all fields exist
          return { ...defaultDataConfig, ...parsed };
        } catch (e) {
          console.error("Failed to parse stored dataConfig", e);
        }
      }
    }
    return defaultDataConfig;
  });
  const [editedDataConfig, setEditedDataConfig] = useState<DataConfig>({
    enrollmentStartDate: "",
    enrollmentEndDate: "",
    grantAllocationStartDate: "",
    grantAllocationEndDate: "",
  });
  const [globalWeightage, setGlobalWeightage] = useState<Weightage>({
    academic: 35,
    income: 20,
    university: 15,
    course: 10,
    beneficiary: 5,
    age: 5,
  });
  const [editedGlobalWeightage, setEditedGlobalWeightage] = useState<Weightage>(
    {
      academic: 35,
      income: 20,
      university: 15,
      course: 10,
      beneficiary: 5,
      age: 5,
    }
  );
  const [lockedFields, setLockedFields] = useState<{
    academic: boolean;
    income: boolean;
    university: boolean;
    course: boolean;
    beneficiary: boolean;
    age: boolean;
  }>({
    academic: false,
    income: false,
    university: false,
    course: false,
    beneficiary: false,
    age: false,
  });
  const [showTieBreakerModal, setShowTieBreakerModal] = useState(false);

  const [activeCourseType, setActiveCourseType] = useState<string | null>(
    "M.S"
  );

  // Min and max limits for each weightage field
  const weightageLimits: Record<keyof Weightage, { min: number; max: number }> =
    {
      academic: { min: 15, max: 30 },
      income: { min: 15, max: 40 },
      course: { min: 10, max: 30 },
      university: { min: 10, max: 30 },
      beneficiary: { min: 1, max: 5 },
      age: { min: 1, max: 5 },
    };

  const [verificationInProgress, setVerificationInProgress] = useState<
    boolean | null
  >(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("verificationInProgress");
    setVerificationInProgress(stored === "true");

    // Ensure default dates are saved to localStorage if they don't exist
    const storedDataConfig = localStorage.getItem("dataConfig");
    if (!storedDataConfig) {
      // If no stored config, save defaults
      localStorage.setItem("dataConfig", JSON.stringify(defaultDataConfig));
      setDataConfig(defaultDataConfig);
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (verificationInProgress !== null) {
      localStorage.setItem(
        "verificationInProgress",
        verificationInProgress.toString()
      );
    }
  }, [verificationInProgress]);

  // Persist dataConfig to localStorage whenever it changes
  useEffect(() => {
    if (dataConfig && Object.values(dataConfig).some((val) => val !== "")) {
      localStorage.setItem("dataConfig", JSON.stringify(dataConfig));
    }
  }, [dataConfig]);

  useEffect(() => {
    const fetchCourseConfig = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/grantor/config/course-data`
        );
        const json = await res.json();

        if (json.success) {
          setCourseConfig(json.data);
          // Initialize global weightage from first course if available
          if (
            json.data &&
            json.data.length > 0 &&
            json.data[0].data.length > 0
          ) {
            const firstWeightage = json.data[0].data[0].weightage;
            // Round all values to whole numbers
            const roundedWeightage = {
              academic: Math.round(firstWeightage.academic),
              income: Math.round(firstWeightage.income),
              university: Math.round(firstWeightage.university),
              course: Math.round(firstWeightage.course),
              beneficiary: Math.round(firstWeightage.beneficiary),
              age: Math.round(firstWeightage.age),
            };
            setGlobalWeightage(roundedWeightage);
            setEditedGlobalWeightage(roundedWeightage);
          }
        }
      } catch (err) {
        console.error("Failed to fetch course config", err);
      } finally {
        setLoadingConfig(false);
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

  const startEdit = () => {
    setEditedConfig(JSON.parse(JSON.stringify(courseConfig)));
    setEditedDataConfig(JSON.parse(JSON.stringify(dataConfig)));
    setEditedGlobalWeightage(JSON.parse(JSON.stringify(globalWeightage)));
    setLockedFields({
      academic: false,
      income: false,
      university: false,
      course: false,
      beneficiary: false,
      age: false,
    });
    setIsEditing(true);
  };

  const weightageDefaults: Weightage = {
    academic: 25,
    income: 30,
    university: 15,
    course: 20,
    beneficiary: 5,
    age: 5,
  };

  const getAllowedRange = (field: keyof Weightage) => {
    const lockedSum = (Object.keys(lockedFields) as (keyof Weightage)[])
      .filter((k) => lockedFields[k])
      .reduce((s, k) => s + editedGlobalWeightage[k], 0);

    const others = (
      Object.keys(editedGlobalWeightage) as (keyof Weightage)[]
    ).filter((k) => !lockedFields[k] && k !== field);

    const minOthers = others.reduce((s, k) => s + weightageLimits[k].min, 0);

    const maxByPool = 100 - lockedSum - minOthers;

    return {
      min: weightageLimits[field].min,
      max: Math.min(weightageLimits[field].max, maxByPool),
    };
  };

  const redistribute = (
    nextLocked: typeof lockedFields,
    nextWeights: Weightage
  ) => {
    const lockedSum = (Object.keys(nextLocked) as (keyof Weightage)[])
      .filter((k) => nextLocked[k])
      .reduce((s, k) => s + nextWeights[k], 0);

    let remaining = 100 - lockedSum;

    const adjustable = (Object.keys(nextWeights) as (keyof Weightage)[]).filter(
      (k) => !nextLocked[k]
    );

    // Auto-lock last
    if (adjustable.length === 1) {
      const k = adjustable[0];
      nextWeights[k] = remaining;
      nextLocked[k] = true;
      setLockedFields({ ...nextLocked });
      setEditedGlobalWeightage({ ...nextWeights });
      return;
    }

    const defaultSum = adjustable.reduce((s, k) => s + weightageDefaults[k], 0);

    adjustable.forEach((k, i) => {
      if (i === adjustable.length - 1) {
        nextWeights[k] = remaining;
      } else {
        nextWeights[k] = Math.round(
          (weightageDefaults[k] / defaultSum) * remaining
        );
        remaining -= nextWeights[k];
      }

      nextWeights[k] = Math.max(
        weightageLimits[k].min,
        Math.min(weightageLimits[k].max, nextWeights[k])
      );
    });

    setLockedFields({ ...nextLocked });
    setEditedGlobalWeightage({ ...nextWeights });
  };

  const handleSliderChange = (field: keyof Weightage, value: number) => {
    if (!isEditing || lockedFields[field]) return;

    const range = getAllowedRange(field);

    if (value < range.min || value > range.max) {
      setAlertMessage(
        `"${field}" can only be set between ${range.min} and ${range.max} to keep total = 100`
      );
      return;
    }

    setConfirmState({
      open: true,
      title: "Confirm Lock",
      message:
        `Lock "${field}" at ${value}?\n\n` +
        `Allowed range: ${range.min} – ${range.max}\n` +
        `Reset required to change again.`,
      onConfirm: () => {
        const nextLocked = { ...lockedFields, [field]: true };
        const nextWeights = { ...editedGlobalWeightage, [field]: value };
        redistribute(nextLocked, nextWeights);
        setConfirmState((s) => ({ ...s, open: false }));
      },
    });
    return;
  };

  const cancelEdit = () => {
    setEditedConfig([]);
    setEditedDataConfig({
      enrollmentStartDate: "",
      enrollmentEndDate: "",
      grantAllocationStartDate: "",
      grantAllocationEndDate: "",
    });
    setEditedGlobalWeightage(JSON.parse(JSON.stringify(globalWeightage)));
    setIsEditing(false);
  };

  const validateWeightage = () => {
    if (activeTab === "weightage") {
      const total =
        editedGlobalWeightage.academic +
        editedGlobalWeightage.income +
        editedGlobalWeightage.university +
        editedGlobalWeightage.course +
        editedGlobalWeightage.beneficiary +
        editedGlobalWeightage.age;

      if (total !== 100) {
        setAlertMessage(`Total weightage must equal 100 (current: ${total})`);
        return false;
      }
    } else {
      for (const group of editedConfig) {
        for (const course of group.data) {
          const total =
            course.weightage.university +
            course.weightage.academic +
            course.weightage.course +
            course.weightage.income +
            course.weightage.beneficiary +
            course.weightage.age;

          if (total !== 100) {
            setAlertMessage(
              `Weightage for ${group.course_type} - ${course.course_field} must total 100 (current: ${total})`
            );
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateWeightage()) return;

    try {
      let configToSave = editedConfig;

      // If weightage tab, apply global weightage to all courses
      if (activeTab === "weightage") {
        configToSave = JSON.parse(JSON.stringify(editedConfig));
        for (const group of configToSave) {
          for (const course of group.data) {
            course.weightage = { ...editedGlobalWeightage };
          }
        }
      }

      // Save course config (seats and weightage)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/grantor/config/course-data`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course_data: configToSave }),
        }
      );

      const json = await res.json();

      if (json.success) {
        setCourseConfig(configToSave);
        setEditedConfig(configToSave);
        if (activeTab === "weightage") {
          setGlobalWeightage(editedGlobalWeightage);
        }
      } else {
        setAlertMessage("Failed to save course rules");
        return;
      }
      // Update dataConfig and save to localStorage
      const updatedDataConfig = { ...editedDataConfig };
      setDataConfig(updatedDataConfig);
      localStorage.setItem("dataConfig", JSON.stringify(updatedDataConfig));
      setIsEditing(false);
      setAlertMessage("Rules updated successfully");
    } catch (err) {
      console.error(err);
      setAlertMessage("Save failed");
    }
  };

  const WeightageSlider = ({
    label,
    value,
    onChange,
    onLockToggle,
    isLocked,
    fieldKey,
    isEditing,
    min,
    max,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    onLockToggle: () => void;
    isLocked: boolean;
    fieldKey: keyof Weightage;
    isEditing: boolean;
    min: number;
    max: number;
  }) => {
    const percentage = ((value - min) / (max - min)) * 100;

    const unlockedCount = Object.values(lockedFields).filter((v) => !v).length;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900">
              {label}
            </span>
            <div className="flex items-center gap-2">
              {isLocked && (
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                  LOCKED
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">
              ({min}-{max})
            </span>
            <span className="text-sm font-bold text-slate-900 min-w-[2.5rem] text-right">
              {Math.round(value)}
            </span>
          </div>
        </div>
        <div className="relative">
          <input
            type="range"
            min={min}
            max={max}
            step="1"
            value={Math.round(value)}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={isLocked || !isEditing || unlockedCount === 1}
            className={`w-full h-2 rounded-lg appearance-none ${
              isLocked ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
            }`}
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`,
            }}
          />
        </div>
        <div className="text-slate-500 text-xs w-full flex flex-row justify-between">
          <div>{min}</div>
          <div>{max}</div>
        </div>
      </div>
    );
  };

  function calculateWeightageScore() {
    const answer =
      editedGlobalWeightage.academic +
      editedGlobalWeightage.income +
      editedGlobalWeightage.university +
      editedGlobalWeightage.course +
      editedGlobalWeightage.beneficiary +
      editedGlobalWeightage.age;
    return answer;
  }

  return (
    <div className="">
      <div className="h-full max-w-6xl mx-auto flex flex-col min-h-0 max-h-full px-4 py-4">
        {/* Header Section */}
        <div className="flex-shrink-0 flex items-center justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
              Configuration Utility
            </h1>
            <p className="text-sm text-slate-700 mt-1 max-w-xl">
              Configure and manage the decision rules that power GrantIQ&apos;s
              validation and recommendation engine.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {!isEditing ? (
              <button
                onClick={startEdit}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Edit Rules
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b border-slate-300 mb-0">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("seats")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "seats"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              Seats Allocation
            </button>
            <button
              onClick={() => setActiveTab("weightage")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "weightage"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              Weightage
            </button>
            <button
              onClick={() => setActiveTab("dataconfig")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "dataconfig"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              Date Config
            </button>
          </nav>
        </div>

        {activeTab === "seats" && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden w-[60%] mt-4">
            {/* Course Type Tabs */}
            <div className="flex-shrink-0 border-b border-slate-300 bg-white px-4">
              <div className="flex gap-6">
                {(isEditing ? editedConfig : courseConfig).map((group) => (
                  <button
                    key={group.course_type}
                    onClick={() => setActiveCourseType(group.course_type)}
                    className={`py-3 text-sm font-medium border-b-2 ${
                      activeCourseType === group.course_type
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {group.course_type}
                  </button>
                ))}
              </div>
            </div>

            {/* Seats per Course Field */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {(isEditing ? editedConfig : courseConfig)
                .filter(
                  (group) =>
                    group.course_type ===
                    (activeCourseType ??
                      (isEditing
                        ? editedConfig[0]?.course_type
                        : courseConfig[0]?.course_type))
                )
                .map((group) => (
                  <div key={group.course_type} className="space-y-4">
                    {group.data.map((course) => (
                      <div
                        key={course.course_field}
                        className="flex items-center justify-between border border-slate-300 rounded-lg px-4 py-3 bg-white"
                      >
                        <div className="text-sm font-medium text-slate-900">
                          {course.course_field}
                        </div>

                        {/* {isEditing ? ( */}
                        <input
                          disabled={!isEditing}
                          type="number"
                          className="w-24 rounded border border-slate-400 px-3 py-1.5 text-sm text-right font-semibold text-slate-900"
                          value={course.seats}
                          onChange={(e) => {
                            course.seats = Number(e.target.value);
                            setEditedConfig([...editedConfig]);
                          }}
                        />
                        {/* // ) : (
                        //   <span className="text-sm font-semibold text-slate-900">
                        //     {course.seats}
                        //   </span>
                        // )} */}
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Tab B: Weightage */}
        {activeTab === "weightage" && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-shrink-0 px-6 py-4 border-b border-slate-400 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  Configuration Settings
                  <button
                    onClick={() => setShowTieBreakerModal(true)}
                    className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition"
                    title="View Tie-Breaker Rules"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                </h2>
                <p className="text-sm text-slate-600">
                  Configure weightage percentages for different scoring factors
                  (Total must equal 100)
                </p>
              </div>
              <span
                className={`text-sm font-bold ${
                  calculateWeightageScore() === 100
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {Math.round(calculateWeightageScore())}
                /100
              </span>
            </div>

            {/* Tie-Breaker Modal */}
            {showTieBreakerModal && (
              <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto mx-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-1 h-6 bg-blue-600 rounded"></span>
                      Tie-Breaker Priority Order
                    </h3>
                    <button
                      onClick={() => setShowTieBreakerModal(false)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                    When candidates have equal weighted scores, the following
                    criteria are applied in order to determine priority:
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3 bg-slate-50 rounded-md p-3 border border-slate-200">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                        1
                      </span>
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-slate-900 block">
                          Higher Total Weighted Score
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          Candidate with the highest combined weighted score
                          across all factors
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-slate-50 rounded-md p-3 border border-slate-200">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                        2
                      </span>
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-slate-900 block">
                          Lower Annual Family Income
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          Candidates with lower family income are prioritized
                          for need-based allocation
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-slate-50 rounded-md p-3 border border-slate-200">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                        3
                      </span>
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-slate-900 block">
                          Younger Applicant (Lower Age)
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          Younger candidates are preferred to maximize long-term
                          impact
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-slate-50 rounded-md p-3 border border-slate-200">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                        4
                      </span>
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-slate-900 block">
                          Earlier Course Start Date
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          Candidates with earlier course commencement dates are
                          prioritized
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-slate-50 rounded-md p-3 border border-slate-200">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                        5
                      </span>
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-slate-900 block">
                          Earlier Application Submission Time
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          First-come-first-served basis for applications
                          submitted at the same time
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-center px-4 py-4  h-[65vh] overflow-y-scroll bg-white p-4">
              <div className="flex flex-col">
                <div className="pr-2 space-y-3">
                  <div className="bg-white border border-slate-200 rounded p-3 space-y-2">
                    <label className="block text-sm font-medium text-slate-900 leading-tight">
                      Q1. What weightage should be given to academic performance
                      (More qualifying degree marks more weightage)?
                    </label>
                    <WeightageSlider
                      label="Academic Merit"
                      value={
                        isEditing
                          ? editedGlobalWeightage.academic
                          : globalWeightage.academic
                      }
                      onChange={(v) => handleSliderChange("academic", v)}
                      onLockToggle={() => {}}
                      isLocked={lockedFields.academic}
                      fieldKey="academic"
                      isEditing={isEditing}
                      min={weightageLimits.academic.min}
                      max={weightageLimits.academic.max}
                    />
                  </div>

                  <div className="bg-white border border-slate-200 rounded p-3 space-y-2">
                    <label className="block text-sm font-medium text-slate-900 leading-tight">
                      Q2. What weightage should be given to family income (lower
                      income = higher score)?
                    </label>
                    <WeightageSlider
                      label="Family Income"
                      value={
                        isEditing
                          ? editedGlobalWeightage.income
                          : globalWeightage.income
                      }
                      onChange={(v) => handleSliderChange("income", v)}
                      onLockToggle={() => {}}
                      isLocked={lockedFields.income}
                      fieldKey="income"
                      isEditing={isEditing}
                      min={weightageLimits.income.min}
                      max={weightageLimits.income.max}
                    />
                  </div>

                  <div className="bg-white border border-slate-200 rounded p-3 space-y-2">
                    <label className="block text-sm font-medium text-slate-900 leading-tight">
                      Q3. What weightage should be given to university ranking
                      or accreditation (More the Rank of university more score)?
                    </label>
                    <WeightageSlider
                      label="University Ranking (QS)"
                      value={
                        isEditing
                          ? editedGlobalWeightage.university
                          : globalWeightage.university
                      }
                      onChange={(v) => handleSliderChange("university", v)}
                      onLockToggle={() => {}}
                      isLocked={lockedFields.university}
                      fieldKey="university"
                      isEditing={isEditing}
                      min={weightageLimits.university.min}
                      max={weightageLimits.university.max}
                    />
                  </div>

                  <div className="bg-white border border-slate-200 rounded p-3 space-y-2">
                    <label className="block text-sm font-medium text-slate-900 leading-tight">
                      Q4. What weightage should be given to course type or
                      course priority (PhD is more preffered than M.S)?
                    </label>
                    <WeightageSlider
                      label="Course Type"
                      value={
                        isEditing
                          ? editedGlobalWeightage.course
                          : globalWeightage.course
                      }
                      onChange={(v) => handleSliderChange("course", v)}
                      onLockToggle={() => {}}
                      isLocked={lockedFields.course}
                      fieldKey="course"
                      isEditing={isEditing}
                      min={weightageLimits.course.min}
                      max={weightageLimits.course.max}
                    />
                  </div>

                  <div className="bg-white border border-slate-200 rounded p-3 space-y-2">
                    <label className="block text-sm font-medium text-slate-900 leading-tight">
                      Q5. What weightage should be given to first time
                      beneficiary?
                    </label>
                    <WeightageSlider
                      label="First Time Beneficiary"
                      value={
                        isEditing
                          ? editedGlobalWeightage.beneficiary
                          : globalWeightage.beneficiary
                      }
                      onChange={(v) => handleSliderChange("beneficiary", v)}
                      onLockToggle={() => {}}
                      isLocked={lockedFields.beneficiary}
                      fieldKey="beneficiary"
                      isEditing={isEditing}
                      min={weightageLimits.beneficiary.min}
                      max={weightageLimits.beneficiary.max}
                    />
                  </div>

                  <div className="bg-white border border-slate-200 rounded p-3 space-y-2">
                    <label className="block text-sm font-medium text-slate-900 leading-tight">
                      Q6. What weightage should be given to age (priority shall
                      be given to candidates who are closer to the upper age
                      limit prescribed under the scheme)?
                    </label>
                    <WeightageSlider
                      label="Age"
                      value={
                        isEditing
                          ? editedGlobalWeightage.age
                          : globalWeightage.age
                      }
                      onChange={(v) => handleSliderChange("age", v)}
                      onLockToggle={() => {}}
                      isLocked={lockedFields.age}
                      fieldKey="age"
                      isEditing={isEditing}
                      min={weightageLimits.age.min}
                      max={weightageLimits.age.max}
                    />
                  </div>

                  <button
                    disabled={!isEditing}
                    onClick={() => {
                      setEditedGlobalWeightage({ ...weightageDefaults });
                      setLockedFields({
                        academic: false,
                        income: false,
                        university: false,
                        course: false,
                        beneficiary: false,
                        age: false,
                      });
                    }}
                    className="mt-2 w-full rounded-md border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    🔁 Reset Weightage Configuration
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab C: Date Config */}
        {activeTab === "dataconfig" && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-shrink-0 px-6 py-4 border-b border-slate-400 bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-900">
                Date Configuration
              </h2>
              <p className="text-sm text-slate-600">
                Configure enrollment dates and grant allocation date ranges
              </p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-6">
              {/* Enrollment Dates */}
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-slate-900">
                  Enrollment Dates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Enrollment Start Date
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        className="w-full rounded border border-slate-400 px-3 py-2 text-sm text-slate-900 font-medium"
                        value={editedDataConfig.enrollmentStartDate}
                        onChange={(e) =>
                          setEditedDataConfig({
                            ...editedDataConfig,
                            enrollmentStartDate: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <div className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {dataConfig.enrollmentStartDate || "—"}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Enrollment End Date
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        className="w-full rounded border border-slate-400 px-3 py-2 text-sm text-slate-900 font-medium"
                        value={editedDataConfig.enrollmentEndDate}
                        onChange={(e) =>
                          setEditedDataConfig({
                            ...editedDataConfig,
                            enrollmentEndDate: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <div className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {dataConfig.enrollmentEndDate || "—"}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Grant Allocation Date Range */}
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-slate-900">
                  Grant Allocation Date Range
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Grant Allocation Start Date
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        className="w-full rounded border border-slate-400 px-3 py-2 text-sm text-slate-900 font-medium"
                        value={editedDataConfig.grantAllocationStartDate}
                        onChange={(e) =>
                          setEditedDataConfig({
                            ...editedDataConfig,
                            grantAllocationStartDate: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <div className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {dataConfig.grantAllocationStartDate || "—"}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Grant Allocation End Date
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        className="w-full rounded border border-slate-400 px-3 py-2 text-sm text-slate-900 font-medium"
                        value={editedDataConfig.grantAllocationEndDate}
                        onChange={(e) =>
                          setEditedDataConfig({
                            ...editedDataConfig,
                            grantAllocationEndDate: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <div className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {dataConfig.grantAllocationEndDate || "—"}
                      </div>
                    )}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-slate-600">
                    Initiate Recommendation
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={verificationInProgress ?? false}
                      onChange={async (e) => {
                        const checked = e.target.checked;
                        setVerificationInProgress(checked);

                        // If toggled ON (or however you want trigger)
                        try {
                          const token =
                            typeof window !== "undefined"
                              ? localStorage.getItem("grantiq_token")
                              : null;

                          const headers: Record<string, string> = {
                            "Content-Type": "application/json",
                          };

                          if (token) {
                            headers.Authorization = token; // or `Bearer ${token}` if needed
                          }

                          const response = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + "/api/grantor/recommendations/grant_reset", {
                            method: "POST",
                            headers,
                          });

                          const data = await response.json();
                          console.log(data);
                        } catch (error) {
                          console.error("Grant Reset Error:", error);
                        }
                      }}
                      className="sr-only"
                    />

                    <div
                      className={`w-11 h-6 rounded-full transition ${
                        !verificationInProgress ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        !verificationInProgress ? "translate-x-5" : ""
                      }`}
                    />
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
        {/* </div> */}
      </div>
      {alertMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-5 w-[360px] shadow-lg">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              Attention
            </h3>
            <p className="text-sm text-slate-700 mb-4 whitespace-pre-line">
              {alertMessage}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setAlertMessage(null)}
                className="px-4 py-1.5 rounded bg-blue-600 text-white text-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-5 w-[380px] shadow-lg">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              {confirmState.title}
            </h3>
            <p className="text-sm text-slate-700 mb-4 whitespace-pre-line">
              {confirmState.message}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmState((s) => ({ ...s, open: false }))}
                className="px-4 py-1.5 rounded border text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmState.onConfirm}
                className="px-4 py-1.5 rounded bg-green-600 text-white text-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
