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

export default function EngineRulesPage() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("all");
  const [isEditing, setIsEditing] = useState(false);
  const [editedConfig, setEditedConfig] = useState<CourseConfig[]>([]);
  const [totalSeats, setTotalSeats] = useState("");
  const [academicThreshold, setAcademicThreshold] = useState("");
  const [incomeThreshold, setIncomeThreshold] = useState("");
  const [ageThreshold, setAgeThreshold] = useState("");
  const [courseConfig, setCourseConfig] = useState<CourseConfig[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
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
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchCourseConfig();
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
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setEditedConfig([]);
    setIsEditing(false);
  };

  const validateWeightage = () => {
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
    return true;
  };

  const handleSave = async () => {
    if (!validateWeightage()) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/grantor/applications/config/course-data`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course_data: editedConfig }),
        }
      );

      const json = await res.json();

      if (json.success) {
        setCourseConfig(editedConfig);
        setIsEditing(false);
        alert("Rules updated successfully");
      } else {
        alert("Failed to save rules");
      }
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
      className="w-16 rounded border border-slate-400 px-2 py-1 text-sm text-center"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );

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

      {/* Category Bar */}
      <div className="rounded-xl bg-white border border-slate-400 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-400 bg-slate-50">
          <p className="text-sm font-medium text-slate-900 mb-3">Categories</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-400 hover:bg-slate-50"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("SC")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === "SC"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-400 hover:bg-slate-50"
              }`}
            >
              Scheduled Caste (SC)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("ST")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === "ST"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-400 hover:bg-slate-50"
              }`}
            >
              Scheduled Tribe (ST)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("Minority")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === "Minority"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-900 hover:bg-slate-50"
              }`}
            >
              Minority (Religious/Linguistic)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("Open")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === "Open"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-900 hover:bg-slate-50"
              }`}
            >
              Open / General
            </button>
          </div>
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
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Course Rules Table */}
      <div className="rounded-xl bg-white border border-slate-400 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-400 bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-900">
            Course-wise Seat & Weightage Rules
          </h2>
          <p className="text-sm text-slate-600">
            Read-only system configuration fetched from backend
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-400">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold">
                  Course Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold">
                  Course Field
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold">
                  Seats
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold">
                  University
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold">
                  Academic
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold">
                  Course
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold">
                  Income
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold">
                  Beneficiary
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold">
                  Age
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-800">
              {(isEditing ? editedConfig : courseConfig).map((group, gIndex) =>
                group.data.map((course, cIndex) => (
                  <tr key={`${group.course_type}-${course.course_field}`}>
                    {cIndex === 0 && (
                      <td
                        rowSpan={group.data.length}
                        className="px-4 py-3 font-medium bg-slate-50 align-top text-slate-900"
                      >
                        {group.course_type}
                      </td>
                    )}

                    <td className="px-4 py-3 text-sm">{course.course_field}</td>

                    {/* Seats */}
                    <td className="px-4 py-3 text-sm text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          className="w-20 rounded border border-slate-400 px-2 py-1 text-sm text-right"
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

                    {/* Weightage Fields */}
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <WeightageInput
                          value={course.weightage.university}
                          onChange={(v) => {
                            course.weightage.university = v;
                            setEditedConfig([...editedConfig]);
                          }}
                        />
                      ) : (
                        course.weightage.university
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <WeightageInput
                          value={course.weightage.academic}
                          onChange={(v) => {
                            course.weightage.academic = v;
                            setEditedConfig([...editedConfig]);
                          }}
                        />
                      ) : (
                        course.weightage.academic
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <WeightageInput
                          value={course.weightage.course}
                          onChange={(v) => {
                            course.weightage.course = v;
                            setEditedConfig([...editedConfig]);
                          }}
                        />
                      ) : (
                        course.weightage.course
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <WeightageInput
                          value={course.weightage.income}
                          onChange={(v) => {
                            course.weightage.income = v;
                            setEditedConfig([...editedConfig]);
                          }}
                        />
                      ) : (
                        course.weightage.income
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <WeightageInput
                          value={course.weightage.beneficiary}
                          onChange={(v) => {
                            course.weightage.beneficiary = v;
                            setEditedConfig([...editedConfig]);
                          }}
                        />
                      ) : (
                        course.weightage.beneficiary
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <WeightageInput
                          value={course.weightage.age}
                          onChange={(v) => {
                            course.weightage.age = v;
                            setEditedConfig([...editedConfig]);
                          }}
                        />
                      ) : (
                        course.weightage.age
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rules Configuration Form */}
      <div className="rounded-xl bg-white border border-slate-400 shadow-sm overflow-hidden">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">
            Configure Rules for{" "}
            {selectedCategory === "all"
              ? "All Categories"
              : selectedCategory === "SC"
              ? "Scheduled Caste (SC)"
              : selectedCategory === "ST"
              ? "Scheduled Tribe (ST)"
              : selectedCategory === "Minority"
              ? "Minority (Religious/Linguistic)"
              : "Open / General"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="totalSeats"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Total no of seats
                </label>
                <input
                  type="text"
                  id="totalSeats"
                  value={totalSeats}
                  onChange={(e) => setTotalSeats(e.target.value)}
                  placeholder="Enter total number of seats"
                  className="w-full rounded-lg bg-white border border-slate-400 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="academicThreshold"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Academic threshold
                </label>
                <input
                  type="text"
                  id="academicThreshold"
                  value={academicThreshold}
                  onChange={(e) => setAcademicThreshold(e.target.value)}
                  placeholder="Enter academic threshold"
                  className="w-full rounded-lg bg-white border border-slate-400 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="incomeThreshold"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Income threshold
                </label>
                <input
                  type="text"
                  id="incomeThreshold"
                  value={incomeThreshold}
                  onChange={(e) => setIncomeThreshold(e.target.value)}
                  placeholder="Enter income threshold"
                  className="w-full rounded-lg bg-white border border-slate-400 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="ageThreshold"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Age threshold
                </label>
                <input
                  type="text"
                  id="ageThreshold"
                  value={ageThreshold}
                  onChange={(e) => setAgeThreshold(e.target.value)}
                  placeholder="Enter age threshold"
                  className="w-full rounded-lg bg-white border border-slate-400 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-400">
              <button
                type="submit"
                className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-sm font-medium text-white transition-colors shadow-sm"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
