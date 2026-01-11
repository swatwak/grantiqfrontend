import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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
    const { applicationId, data, images } = await req.json();

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
    const font = await finalPdf.embedFont(StandardFonts.HelveticaBold);

    const addImagePage = async (base64: string, title: string) => {
      if (!base64) return;

      const imgBytes = Uint8Array.from(atob(base64.split(",")[1]), (c) =>
        c.charCodeAt(0)
      );

      const image = await finalPdf.embedPng(imgBytes);

      // A4 page size (points)
      const page = finalPdf.addPage([595.28, 841.89]);

      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();

      const margin = 40;
      const titleHeight = 30;

      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2 - titleHeight;

      // 🔑 SCALE PROPERLY (THIS FIXES CUTTING)
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height);

      const imgWidth = image.width * scale;
      const imgHeight = image.height * scale;

      // Center horizontally
      const x = (pageWidth - imgWidth) / 2;

      // Top-aligned under title
      const y = pageHeight - imgHeight - margin - titleHeight;

      // Title
      page.drawText(title, {
        x: margin,
        y: pageHeight - margin - 18,
        size: 14,
        font,
        color: rgb(0.12, 0.35, 0.75),
      });

      // Image
      page.drawImage(image, {
        x,
        y,
        width: imgWidth,
        height: imgHeight,
      });
    };

    await addImagePage(images.personal, "01 Personal Details Verification");
    await addImagePage(images.documents, "02 Document Validation Results");
    await addImagePage(images.source, "03 Verifications by Source");
    await addImagePage(images.recommendations, "04 Recommendations Details");

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

        // Add copied pages and add title on the first page
        copiedPages.forEach((p, index) => {
          finalPdf.addPage(p);

          // Add document title overlay on the first page of each document
          if (index === 0) {
            p.drawText(doc.name, {
              x: 10,
              y: p.getHeight() - 20,
              size: 14,
              font: font,
              color: rgb(0.12, 0.35, 0.75),
            });
          }
        });
      } catch (error: any) {
        console.error(error);
        // If document doesn't exist or can't be accessed, skip it
        console.warn(`Failed to load document ${doc.name}: ${error.message}`);
        continue;
      }
    }

    /* Add pagination numbers to all pages */
      const pageIndices = finalPdf.getPageIndices();
      const totalPages = pageIndices.length;
      const boldFont = await finalPdf.embedFont(StandardFonts.HelveticaBold);

      pageIndices.forEach((_, index) => {
        const page = finalPdf.getPage(index);
        const pageHeight = page.getHeight();
        const pageNumber = `${index + 1} of ${totalPages}`;

        page.drawText(pageNumber, {
          x: page.getWidth() - 80,
          y: 20,
          size: 10,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
      });

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
