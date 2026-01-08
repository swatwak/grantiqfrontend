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
  const [dataConfig, setDataConfig] = useState<DataConfig>({
    enrollmentStartDate: "",
    enrollmentEndDate: "",
    grantAllocationStartDate: "",
    grantAllocationEndDate: "",
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
  useEffect(() => {
    const fetchCourseConfig = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/grantor/applications/config/course-data`
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
            setGlobalWeightage(firstWeightage);
            setEditedGlobalWeightage(firstWeightage);
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

  const handleEdit = () => {
    setEditedConfig(JSON.parse(JSON.stringify(courseConfig))); // deep copy
    setIsEditing(true);
  };

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

  const startEdit = () => {
    setEditedConfig(JSON.parse(JSON.stringify(courseConfig)));
    setEditedDataConfig(JSON.parse(JSON.stringify(dataConfig)));
    setEditedGlobalWeightage(JSON.parse(JSON.stringify(globalWeightage)));
    setIsEditing(true);
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
        alert(`Total weightage must equal 100 (current: ${total})`);
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
            alert(
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
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/grantor/applications/config/course-data`,
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
        alert("Failed to save course rules");
        return;
      }
      setDataConfig(editedDataConfig);
      setIsEditing(false);
      alert("Rules updated successfully");
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  };

  const WeightageInput = ({
    value,
    onChange,
  }: {
    value: number;
    onChange: (v: number) => void;
  }) => (
    <input
      type="number"
      className="w-12 rounded border border-slate-400 px-1 py-0.5 text-xs text-center text-slate-900 font-medium"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-6">
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

      <div className="flex justify-end gap-3">
        {!isEditing ? (
          <button
            onClick={startEdit}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            Edit Rules
          </button>
        ) : (
          <>
            <button
              onClick={handleSave}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white"
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

      {/* Tab Navigation */}
      <div className="border-b border-slate-300">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("seats")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "seats"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Number of Seats
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

      {/* Tab Content */}
      <div className="rounded-xl bg-white border border-slate-400 shadow-sm overflow-hidden">
        {/* Tab A: Number of Seats */}
        {activeTab === "seats" && (
          <div>
            <div className="px-6 py-4 border-b border-slate-400 bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-900">
                Number of Seats
              </h2>
              <p className="text-sm text-slate-600">
                Configure the number of seats available for each course
              </p>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
              <table className="min-w-full border-collapse text-xs">
                <thead className="bg-slate-400 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold">
                      Course Type
                    </th>
                    <th className="px-2 py-1.5 text-left text-xs font-semibold">
                      Course Field
                    </th>
                    <th className="px-2 py-1.5 text-right text-xs font-semibold">
                      Seats
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {(isEditing ? editedConfig : courseConfig).map((group) =>
                    group.data.map((course, cIndex) => (
                      <tr key={`${group.course_type}-${course.course_field}`}>
                        {cIndex === 0 && (
                          <td
                            rowSpan={group.data.length}
                            className="px-2 py-1.5 font-medium bg-slate-50 align-top text-slate-900 text-xs"
                          >
                            {group.course_type}
                          </td>
                        )}

                        <td className="px-2 py-1.5 text-xs">
                          {course.course_field}
                        </td>

                        <td className="px-2 py-1.5 text-xs text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              className="w-16 rounded border border-slate-400 px-1.5 py-0.5 text-xs text-right text-slate-900 font-medium"
                              value={course.seats}
                              onChange={(e) => {
                                course.seats = Number(e.target.value);
                                setEditedConfig([...editedConfig]);
                              }}
                            />
                          ) : (
                            course.seats
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab B: Weightage */}
        {activeTab === "weightage" && (
          <div>
            <div className="px-6 py-4 border-b border-slate-400 bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-900">
                Configuration Settings
              </h2>
              <p className="text-sm text-slate-600">
                Configure weightage percentages for different scoring factors
                (Total must equal 100)
              </p>
            </div>

            <div className="px-4 py-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Tie-Breaker Priority Order Section - Left Side */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-blue-600 rounded"></span>
                    Tie-Breaker Priority Order
                  </h3>
                  <p className="text-xs text-slate-600 mb-4">
                    When candidates have equal weighted scores, the following
                    criteria are applied in order to determine priority:
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3 bg-white rounded-md p-2.5 border border-slate-200 shadow-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                        1
                      </span>
                      <div className="flex-1">
                        <span className="text-xs font-semibold text-slate-900 block">
                          Higher Total Weighted Score
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          Candidate with the highest combined weighted score
                          across all factors
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white rounded-md p-2.5 border border-slate-200 shadow-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                        2
                      </span>
                      <div className="flex-1">
                        <span className="text-xs font-semibold text-slate-900 block">
                          Lower Annual Family Income
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          Candidates with lower family income are prioritized
                          for need-based allocation
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white rounded-md p-2.5 border border-slate-200 shadow-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                        3
                      </span>
                      <div className="flex-1">
                        <span className="text-xs font-semibold text-slate-900 block">
                          Younger Applicant (Lower Age)
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          Younger candidates are preferred to maximize long-term
                          impact
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white rounded-md p-2.5 border border-slate-200 shadow-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                        4
                      </span>
                      <div className="flex-1">
                        <span className="text-xs font-semibold text-slate-900 block">
                          Earlier Course Start Date
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          Candidates with earlier course commencement dates are
                          prioritized
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white rounded-md p-2.5 border border-slate-200 shadow-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                        5
                      </span>
                      <div className="flex-1">
                        <span className="text-xs font-semibold text-slate-900 block">
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

                {/* Weightage Configuration Section - Right Side */}
                <div className="flex flex-col">
                  <h3 className="text-xs font-semibold text-slate-900 mb-2">
                    Weightage Configuration
                  </h3>
                  <div className="overflow-y-auto max-h-[500px] pr-2 space-y-2 flex-1">
                    {/* Academic Merit */}
                    <div className="bg-white border border-slate-200 rounded p-2 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-blue-600">
                          Academic Merit
                        </span>
                      </div>
                      <label className="block text-[10px] font-medium text-slate-900 leading-tight">
                        Q1. What weightage should be given to academic
                        performance (More qualifying degree marks more
                        weightage)?
                      </label>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <input
                            type="number"
                            className="w-16 rounded border border-slate-400 px-1.5 py-0.5 text-[10px] text-slate-900 font-medium"
                            value={editedGlobalWeightage.academic}
                            onChange={(e) =>
                              setEditedGlobalWeightage({
                                ...editedGlobalWeightage,
                                academic: Number(e.target.value) || 0,
                              })
                            }
                          />
                        ) : (
                          <div className="w-16 rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-700">
                            {globalWeightage.academic}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-500">
                          → Number | Example: 35
                        </span>
                      </div>
                    </div>

                    {/* Family Income */}
                    <div className="bg-white border border-slate-200 rounded p-2 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-blue-600">
                          Family Income
                        </span>
                      </div>
                      <label className="block text-[10px] font-medium text-slate-900 leading-tight">
                        Q2. What weightage should be given to family income
                        (lower income = higher score)?
                      </label>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <input
                            type="number"
                            className="w-16 rounded border border-slate-400 px-1.5 py-0.5 text-[10px] text-slate-900 font-medium"
                            value={editedGlobalWeightage.income}
                            onChange={(e) =>
                              setEditedGlobalWeightage({
                                ...editedGlobalWeightage,
                                income: Number(e.target.value) || 0,
                              })
                            }
                          />
                        ) : (
                          <div className="w-16 rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-700">
                            {globalWeightage.income}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-500">
                          → Number | Example: 20
                        </span>
                      </div>
                    </div>

                    {/* University Quality */}
                    <div className="bg-white border border-slate-200 rounded p-2 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-blue-600">
                          University Quality
                        </span>
                      </div>
                      <label className="block text-[10px] font-medium text-slate-900 leading-tight">
                        Q3. What weightage should be given to university ranking
                        or accreditation (More the Rank of university more
                        score)?
                      </label>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <input
                            type="number"
                            className="w-16 rounded border border-slate-400 px-1.5 py-0.5 text-[10px] text-slate-900 font-medium"
                            value={editedGlobalWeightage.university}
                            onChange={(e) =>
                              setEditedGlobalWeightage({
                                ...editedGlobalWeightage,
                                university: Number(e.target.value) || 0,
                              })
                            }
                          />
                        ) : (
                          <div className="w-16 rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-700">
                            {globalWeightage.university}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-500">
                          → Number | Example: 15
                        </span>
                      </div>
                    </div>

                    {/* Course Priority */}
                    <div className="bg-white border border-slate-200 rounded p-2 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-blue-600">
                          Course Priority
                        </span>
                      </div>
                      <label className="block text-[10px] font-medium text-slate-900 leading-tight">
                        Q4. What weightage should be given to course type or
                        course priority (PhD is more preffered than M.S)?
                      </label>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <input
                            type="number"
                            className="w-16 rounded border border-slate-400 px-1.5 py-0.5 text-[10px] text-slate-900 font-medium"
                            value={editedGlobalWeightage.course}
                            onChange={(e) =>
                              setEditedGlobalWeightage({
                                ...editedGlobalWeightage,
                                course: Number(e.target.value) || 0,
                              })
                            }
                          />
                        ) : (
                          <div className="w-16 rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-700">
                            {globalWeightage.course}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-500">
                          → Number | Example: 10
                        </span>
                      </div>
                    </div>

                    {/* Beneficiary Category */}
                    <div className="bg-white border border-slate-200 rounded p-2 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-blue-600">
                          Beneficiary (SC / ST)
                        </span>
                      </div>
                      <label className="block text-[10px] font-medium text-slate-900 leading-tight">
                        Q5. What weightage should be given to first time
                        beneficiary?
                      </label>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <input
                            type="number"
                            className="w-16 rounded border border-slate-400 px-1.5 py-0.5 text-[10px] text-slate-900 font-medium"
                            value={editedGlobalWeightage.beneficiary}
                            onChange={(e) =>
                              setEditedGlobalWeightage({
                                ...editedGlobalWeightage,
                                beneficiary: Number(e.target.value) || 0,
                              })
                            }
                          />
                        ) : (
                          <div className="w-16 rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-700">
                            {globalWeightage.beneficiary}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-500">
                          → Number | Example: 5
                        </span>
                      </div>
                    </div>

                    {/* Age Factor */}
                    <div className="bg-white border border-slate-200 rounded p-2 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-blue-600">
                          Age Factor
                        </span>
                      </div>
                      <label className="block text-[10px] font-medium text-slate-900 leading-tight">
                        Q6. What weightage should be given to age (priority
                        shall be given to candidates who are closer to the upper
                        age limit prescribed under the scheme)?
                      </label>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <input
                            type="number"
                            className="w-16 rounded border border-slate-400 px-1.5 py-0.5 text-[10px] text-slate-900 font-medium"
                            value={editedGlobalWeightage.age}
                            onChange={(e) =>
                              setEditedGlobalWeightage({
                                ...editedGlobalWeightage,
                                age: Number(e.target.value) || 0,
                              })
                            }
                          />
                        ) : (
                          <div className="w-16 rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-700">
                            {globalWeightage.age}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-500">
                          → Number | Example: 5
                        </span>
                      </div>
                    </div>

                    {/* Total Display */}
                    <div className="pt-2 border-t border-slate-300 sticky bottom-0 bg-white pb-1">
                      <div className="flex items-center justify-between bg-slate-50 rounded px-2 py-1.5">
                        <span className="text-xs font-semibold text-slate-900">
                          Total Weightage:
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            (isEditing
                              ? editedGlobalWeightage.academic +
                                editedGlobalWeightage.income +
                                editedGlobalWeightage.university +
                                editedGlobalWeightage.course +
                                editedGlobalWeightage.beneficiary +
                                editedGlobalWeightage.age
                              : globalWeightage.academic +
                                globalWeightage.income +
                                globalWeightage.university +
                                globalWeightage.course +
                                globalWeightage.beneficiary +
                                globalWeightage.age) === 100
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {isEditing
                            ? editedGlobalWeightage.academic +
                              editedGlobalWeightage.income +
                              editedGlobalWeightage.university +
                              editedGlobalWeightage.course +
                              editedGlobalWeightage.beneficiary +
                              editedGlobalWeightage.age
                            : globalWeightage.academic +
                              globalWeightage.income +
                              globalWeightage.university +
                              globalWeightage.course +
                              globalWeightage.beneficiary +
                              globalWeightage.age}
                          /100
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab C: Date Config */}
        {activeTab === "dataconfig" && (
          <div>
            <div className="px-6 py-4 border-b border-slate-400 bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-900">
                Date Configuration
              </h2>
              <p className="text-sm text-slate-600">
                Configure enrollment dates and grant allocation date ranges
              </p>
            </div>

            <div className="px-6 py-6 space-y-6">
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
