import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  const token = request.nextUrl.searchParams.get("token");

  if (!email) {
    return new NextResponse("Missing email parameter.", { status: 400 });
  }

  // Simple token validation placeholder — in production sign with HMAC
  if (!token) {
    return new NextResponse("Invalid unsubscribe link.", { status: 400 });
  }

  const existing = await prisma.suppression.findUnique({ where: { email } });
  if (!existing) {
    await prisma.suppression.create({
      data: {
        email,
        reason: "UNSUBSCRIBE",
        source: "unsubscribe-link",
      },
    });
  }

  await prisma.contact.updateMany({
    where: { email },
    data: { status: "UNSUBSCRIBED" },
  });

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Unsubscribed</title></head>
<body style="font-family:Georgia,serif;max-width:480px;margin:80px auto;text-align:center">
  <h1>You have been unsubscribed.</h1>
  <p>You will no longer receive campaign emails at <strong>${email}</strong>.</p>
</body>
</html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}
