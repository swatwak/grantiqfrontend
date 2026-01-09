import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type TableRow = { label: string; value: string | number | null | undefined };

export async function drawApplicationTables(pdf: PDFDocument, data: any) {
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage();
  let { width, height } = page.getSize();

  const marginX = 50;
  let y = height - 60;

  const rowHeight = 18;
  const headerHeight = 22;
  const col1Width = 200;
  const tableWidth = width - marginX * 2;

  const blue = rgb(0.12, 0.35, 0.75);
  const black = rgb(0, 0, 0);

  /* ---------------- Page Header ---------------- */

  page.drawText("Application Summary", {
    x: marginX,
    y,
    size: 18,
    font: boldFont,
    color: blue,
  });

  y -= 35;

  function ensureSpace(rows = 1) {
    if (y - rows * rowHeight < 70) {
      page = pdf.addPage();
      ({ width, height } = page.getSize());
      y = height - 60;
    }
  }

  function drawSection(title: string) {
    ensureSpace(2);

    // Blue header bar
    page.drawRectangle({
      x: marginX,
      y: y - headerHeight + 4,
      width: tableWidth,
      height: headerHeight,
      color: blue,
    });

    page.drawText(title, {
      x: marginX + 8,
      y: y - headerHeight + 10,
      size: 11,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    y -= headerHeight;
  }

  function drawTable(rows: TableRow[]) {
    const startY = y;

    rows.forEach((row) => {
      ensureSpace(1);

      // Row border
      page.drawRectangle({
        x: marginX,
        y: y - rowHeight,
        width: tableWidth,
        height: rowHeight,
        borderColor: black,
        borderWidth: 0.5,
      });

      // Vertical divider
      page.drawLine({
        start: { x: marginX + col1Width, y },
        end: { x: marginX + col1Width, y: y - rowHeight },
        thickness: 0.5,
        color: black,
      });

      page.drawText(row.label, {
        x: marginX + 6,
        y: y - 13,
        size: 10,
        font: boldFont,
      });

      page.drawText(String(row.value ?? "N/A"), {
        x: marginX + col1Width + 6,
        y: y - 13,
        size: 10,
        font,
        maxWidth: tableWidth - col1Width - 12,
      });

      y -= rowHeight;
    });

    // Outer border
    page.drawRectangle({
      x: marginX,
      y,
      width: tableWidth,
      height: startY - y,
      borderColor: black,
      borderWidth: 1,
    });

    y -= 14;
  }

  /* ---------------- Applicant Details ---------------- */

  drawSection("Applicant Details");
  drawTable([
    { label: "Full Name", value: data.full_name },
    { label: "Gender", value: data.gender },
    {
      label: "Date of Birth",
      value: `${data.dob_day}-${data.dob_month}-${data.dob_year}`,
    },
    { label: "Category", value: data.category },
    { label: "Father Name", value: data.father_name },
    { label: "Mother Name", value: data.mother_name },
  ]);

  /* ---------------- Address & Contact ---------------- */

  drawSection("Address & Contact");
  drawTable([
    { label: "Address", value: data.address },
    { label: "City", value: data.city },
    { label: "State", value: data.state },
    { label: "Pincode", value: data.pincode },
    { label: "Phone", value: data.phone },
    { label: "Email", value: data.email },
  ]);

  /* ---------------- Application Status ---------------- */

  drawSection("Application Status");
  drawTable([
    { label: "Application ID", value: data.application_id },
    { label: "Status", value: data.application_status },
    { label: "Submitted At", value: data.submitted_at },
    { label: "Final Rank", value: data.finalRank },
  ]);

  /* ---------------- Verification Summary ---------------- */

  let vr: any = {};
  try {
    vr = JSON.parse(data.validation_result || "{}")?.verification_results || {};
  } catch {}

  drawSection("Document Verification Summary");
  drawTable([
    {
      label: "Form 16",
      value: vr.form16?.is_eligible ? "Eligible" : "Not Eligible",
    },
    {
      label: "Caste Certificate",
      value: vr.caste_certificate?.is_eligible ? "Eligible" : "Not Eligible",
    },
    {
      label: "10th Marksheet",
      value: vr.marksheet_10th?.is_eligible ? "Eligible" : "Not Eligible",
    },
    {
      label: "12th Marksheet",
      value: vr.marksheet_12th?.is_eligible ? "Eligible" : "Not Eligible",
    },
    {
      label: "Graduation",
      value: vr.marksheet_graduation?.is_eligible ? "Eligible" : "Not Eligible",
    },
  ]);

  /* ---------------- Score Breakdown ---------------- */

  const score = data.recommendation_details?.scoreBreakdown || {};

  drawSection("Score Breakdown");
  drawTable([
    { label: "University Score", value: score.universityScore },
    { label: "Academic Score", value: score.academicScore },
    { label: "Course Score", value: score.courseScore },
    { label: "Income Score", value: score.incomeScore },
    { label: "Beneficiary Score", value: score.beneficiaryScore },
    { label: "Age Score", value: score.ageScore },
    { label: "Total Score", value: score.totalScore },
  ]);

  /* ---------------- Recommendation ---------------- */

  const rec = data.recommendation_details || {};

  drawSection("Recommendation Details");
  drawTable([
    { label: "Course Level", value: rec.courseLevelPriority },
    { label: "University Ranking", value: rec.universityRanking },
    { label: "Days Until Course Start", value: rec.daysUntilCourseStart },
    { label: "Zone", value: rec.zone },
  ]);
}
