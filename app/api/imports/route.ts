import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectHeaders, parseCsv } from "@/lib/imports";

export async function GET() {
  const imports = await prisma.importJob.findMany({
    include: { rows: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ data: imports });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const filename = typeof body.filename === "string" ? body.filename : "upload.csv";
  const csv = typeof body.csv === "string" ? body.csv : "";

  if (!csv.trim()) {
    return NextResponse.json({ error: "CSV payload is required" }, { status: 400 });
  }

  const rows = parseCsv(csv);
  const headers = detectHeaders(rows);

  const job = await prisma.importJob.create({
    data: {
      filename,
      rowCount: rows.length,
      status: "UPLOADED",
      rows: {
        createMany: {
          data: rows.map((row) => ({
            rawJson: row,
            status: "PENDING",
          })),
        },
      },
    },
  });

  return NextResponse.json({
    data: {
      importJobId: job.id,
      headers,
      preview: rows.slice(0, 20),
      rowCount: rows.length,
    },
  }, { status: 201 });
}
