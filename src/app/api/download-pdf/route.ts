import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { drawApplicationTables } from "./helper";

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
      // {
      //   key: `enroll_iq_files/submission_files/${applicationId}/documents/offer_letter/offerLetter.pdf`,
      //   name: "Offer Letter",
      // }
    ];

    // const finalPdf = await PDFDocument.create();
    const finalPdf = await PDFDocument.create();
    await drawApplicationTables(finalPdf, data);
    const font = await finalPdf.embedFont(StandardFonts.Helvetica);

    const pages = finalPdf.getPages();
    const lastPage = pages[pages.length - 1];

    const { width, height } = lastPage.getSize();

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

    const arrayBuffer =
      pdfBytes.buffer instanceof ArrayBuffer
        ? pdfBytes.buffer.slice(
            pdfBytes.byteOffset,
            pdfBytes.byteOffset + pdfBytes.byteLength
          )
        : new Uint8Array(pdfBytes).buffer;

    const blob = new Blob([arrayBuffer], {
      type: "application/pdf",
    });

    return new NextResponse(blob, {
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
