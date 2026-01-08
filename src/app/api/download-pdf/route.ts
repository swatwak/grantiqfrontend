import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

async function streamToBuffer(stream: any): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: Request) {
  const { applicationId, data } = await req.json();

  console.log(applicationId, data);

  const documents = [
    { key: `enroll-iq-bucket/enroll_iq_files/submission_files/${applicationId}/documents/form16/form16.pdf`, name: "Form 16" },
    { key: `enroll-iq-bucket/enroll_iq_files/submission_files/${applicationId}/documents/caste_certificate/caste.pdf`, name: "Caste Certificate" },
    { key: `enroll-iq-bucket/enroll_iq_files/submission_files/${applicationId}/documents/marksheet_10th/marksheet10th.pdf`, name: "10th Marksheet" },
    { key: `enroll-iq-bucket/enroll_iq_files/submission_files/${applicationId}/documents/marksheet_12th/marksheet12th.pdf`, name: "12th Marksheet" },
    { key: `enroll-iq-bucket/enroll_iq_files/submission_files/${applicationId}/documents/graduation/graduation.pdf`, name: "Graduation Certificate" },
    { key: `enroll-iq-bucket/enroll_iq_files/submission_files/${applicationId}/documents/offer_letter/offerLetter.pdf`, name: "Offer Letter" },
    { key: `enroll-iq-bucket/enroll_iq_files/submission_files/${applicationId}/documents/bank_passbook/bankPassbook.pdf`, name: "Bank Passbook" },
    { key: `enroll-iq-bucket/enroll_iq_files/submission_files/${applicationId}/documents/statement_of_purpose/statementOfPurpose.pdf`, name: "Statement of Purpose" },
    { key: `enroll-iq-bucket/enroll_iq_files/submission_files/${applicationId}/documents/cv/cv.pdf`, name: "Curriculum Vitae" },
  ];

  const finalPdf = await PDFDocument.create();
  const font = await finalPdf.embedFont(StandardFonts.Helvetica);

  /* -----------------------------
     PAGE 1: DATA SUMMARY
  ------------------------------*/
  const page = finalPdf.addPage();
  const { width, height } = page.getSize();

  let y = height - 50;
  page.drawText("Application Summary", {
    x: 50,
    y,
    size: 18,
    font,
  });

  y -= 40;
  page.drawText(`Name: ${data.name}`, { x: 50, y, size: 12, font });
  y -= 20;
  page.drawText(`Application ID: ${data.applicationId}`, {
    x: 50,
    y,
    size: 12,
    font,
  });
  y -= 20;
  page.drawText(`Score: ${data.score}`, {
    x: 50,
    y,
    size: 12,
    font,
  });

  /* -----------------------------
     ATTACH S3 PDFs
  ------------------------------*/
  for (const doc of documents) {
    const s3Res = await s3Client.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: doc.key,
      })
    );

    const pdfBytes = await streamToBuffer(s3Res.Body);
    const attachedPdf = await PDFDocument.load(pdfBytes);

    const copiedPages = await finalPdf.copyPages(
      attachedPdf,
      attachedPdf.getPageIndices()
    );

    // Heading page
    const titlePage = finalPdf.addPage();
    titlePage.drawText(doc.name, {
      x: 50,
      y: height - 60,
      size: 16,
      font,
    });

    copiedPages.forEach((p) => finalPdf.addPage(p));
  }

  const pdfBytes = await finalPdf.save();

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="application.pdf"`,
    },
  });
}
