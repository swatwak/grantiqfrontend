import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// Initialize S3Client only if credentials are available
function getS3Client(): S3Client | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || "us-east-1";
  const bucket = process.env.AWS_S3_BUCKET;

  if (!accessKeyId || !secretAccessKey || !bucket) {
    console.error("AWS credentials or bucket not configured");
    return null;
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

async function streamToBuffer(stream: any): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: Request) {
  try {
    const { applicationId, data } = await req.json();

    if (!applicationId || !data) {
      return NextResponse.json(
        { error: "Application ID and data are required" },
        { status: 400 }
      );
    }

    const s3Client = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET;

    if (!s3Client || !bucket) {
      return NextResponse.json(
        {
          error:
            "AWS S3 is not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET environment variables.",
        },
        { status: 500 }
      );
    }

    const documents = [
      {
        key: `enroll_iq_files/submission_files/${applicationId}/documents/form16/form16/form16.pdf`,
        name: "Form 16",
      },
      {
        key: `enroll_iq_files/submission_files/${applicationId}/documents/caste_certificate/caste.pdf`,
        name: "Caste Certificate",
      },
      {
        key: `enroll_iq_files/submission_files/${applicationId}/documents/marksheet_10th/marksheet10th.pdf`,
        name: "10th Marksheet",
      },
      {
        key: `enroll_iq_files/submission_files/${applicationId}/documents/marksheet_12th/marksheet12th.pdf`,
        name: "12th Marksheet",
      },
      {
        key: `enroll_iq_files/submission_files/${applicationId}/documents/graduation/graduation.pdf`,
        name: "Graduation Certificate",
      },
      {
        key: `enroll_iq_files/submission_files/${applicationId}/documents/offer_letter/offerLetter.pdf`,
        name: "Offer Letter",
      },
      {
        key: `enroll_iq_files/submission_files/${applicationId}/documents/bank_passbook/bankPassbook.pdf`,
        name: "Bank Passbook",
      },
      {
        key: `enroll_iq_files/submission_files/${applicationId}/documents/statement_of_purpose/statementOfPurpose.pdf`,
        name: "Statement of Purpose",
      },
      {
        key: `enroll_iq_files/submission_files/${applicationId}/documents/cv/cv.pdf`,
        name: "Curriculum Vitae",
      },
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
    page.drawText(`Name: ${data.full_name || data.name || "N/A"}`, {
      x: 50,
      y,
      size: 12,
      font,
    });
    y -= 20;
    page.drawText(
      `Application ID: ${
        data.application_id || data.applicationId || applicationId
      }`,
      {
        x: 50,
        y,
        size: 12,
        font,
      }
    );
    y -= 20;
    if (data.merit_score !== undefined || data.score !== undefined) {
      page.drawText(`Score: ${data.merit_score || data.score || "N/A"}`, {
        x: 50,
        y,
        size: 12,
        font,
      });
    }

    /* -----------------------------
       ATTACH S3 PDFs
    ------------------------------*/
    for (const doc of documents) {
      try {
        const s3Res = await s3Client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: doc.key,
          })
        );

        if (!s3Res.Body) {
          console.warn(`Document ${doc.name} not found in S3: ${doc.key}`);
          continue;
        }

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
      } catch (error: any) {
        console.error(error);
        // If document doesn't exist or can't be accessed, skip it
        console.warn(`Failed to load document ${doc.name}: ${error.message}`);
        continue;
      }
    }

    const pdfBytes = await finalPdf.save();

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="application-${applicationId}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
