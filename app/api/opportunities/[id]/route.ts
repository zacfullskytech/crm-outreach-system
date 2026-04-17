import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/supabase/auth";
import { opportunitySchema } from "@/lib/validators";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();

  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = opportunitySchema.partial({ name: true, companyId: true, opportunityType: true }).parse(payload);

    if (parsed.tasks) {
      await prisma.opportunityTask.deleteMany({ where: { opportunityId: id } });
    }

    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: {
        name: parsed.name,
        companyId: parsed.companyId,
        contactId: parsed.contactId,
        templateId: parsed.templateId,
        ownerUserId: parsed.ownerUserId,
        opportunityType: parsed.opportunityType,
        stage: parsed.stage,
        status: parsed.status,
        serviceLine: parsed.serviceLine,
        valueEstimate: parsed.valueEstimate,
        monthlyValue: parsed.monthlyValue,
        oneTimeValue: parsed.oneTimeValue,
        targetCloseDate: parsed.targetCloseDate ? new Date(parsed.targetCloseDate) : parsed.targetCloseDate === null ? null : undefined,
        checklistJson: parsed.checklist ? parsed.checklist : undefined,
        notes: parsed.notes,
        tasks: parsed.tasks ? {
          create: parsed.tasks.map((task, index) => ({
            title: task.title,
            description: task.description ?? null,
            assigneeUserId: task.assigneeUserId ?? null,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            status: task.status ?? "TODO",
            checklistKey: task.checklistKey ?? null,
            sortOrder: index,
          })),
        } : undefined,
      },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, fullName: true, email: true } },
        owner: { select: { id: true, email: true, name: true } },
        template: { select: { id: true, name: true, serviceLine: true } },
        tasks: {
          include: { assignee: { select: { id: true, email: true, name: true } } },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    return NextResponse.json({ data: opportunity });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid opportunity payload" }, { status: 400 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update opportunity" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();

  try {
    const { id } = await params;
    await prisma.opportunity.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete opportunity" }, { status: 500 });
  }
}
