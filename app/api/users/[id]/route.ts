import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/supabase/auth";
import { isProtectedAdmin } from "@/lib/users";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { appUser } = await requireAdmin();
  const { id } = await params;
  const payload = await request.json();
  const role = payload.role === "admin" ? "admin" : "member";

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (isProtectedAdmin(target.email) && role !== "admin") {
    return NextResponse.json({ error: "The primary administrator role cannot be removed." }, { status: 400 });
  }

  if (target.id === appUser.id && role !== "admin") {
    return NextResponse.json({ error: "You cannot remove your own administrator access." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { appUser } = await requireAdmin();
  const { id } = await params;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (isProtectedAdmin(target.email)) {
    return NextResponse.json({ error: "The primary administrator account cannot be deleted." }, { status: 400 });
  }

  if (target.id === appUser.id) {
    return NextResponse.json({ error: "You cannot delete your own account from this screen." }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
