import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/supabase/auth";
import { opportunitySchema, opportunityTemplateSchema } from "@/lib/validators";
import { applyDeliveryAutomation, normalizeChecklistEntries, normalizeTaskTemplates } from "@/lib/pipeline";

function serializeOpportunity(opportunity: {
  id: string;
  name: string;
  opportunityType: string;
  stage: string;
  status: string;
  deliveryStatus: string | null;
  serviceLine: string | null;
  valueEstimate: number | null;
  monthlyValue: number | null;
  oneTimeValue: number | null;
  targetCloseDate: Date | null;
  notes: string | null;
  checklistJson: unknown;
  company: { id: string; name: string };
  contact: { id: string; fullName: string | null; email: string | null } | null;
  owner: { id: string; email: string; name: string | null } | null;
  template: { id: string; name: string; serviceLine: string | null } | null;
  tasks: Array<{ id: string; title: string; description: string | null; status: string; dueDate: Date | null; checklistKey: string | null; assignee: { id: string; email: string; name: string | null } | null }>;
}) {
  return {
    ...opportunity,
    checklistJson: normalizeChecklistEntries(opportunity.checklistJson),
    tasks: opportunity.tasks.map((task) => ({
      ...task,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    })),
    targetCloseDate: opportunity.targetCloseDate ? opportunity.targetCloseDate.toISOString() : null,
  };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();

  try {
    const { id } = await params;
    const payload = await request.json();

    if (payload && typeof payload === "object" && "template" in payload) {
      const parsedTemplate = opportunityTemplateSchema.partial({ name: true, opportunityType: true }).parse((payload as { template: unknown }).template);
      const template = await prisma.opportunityTemplate.update({
        where: { id },
        data: {
          name: parsedTemplate.name,
          description: parsedTemplate.description,
          opportunityType: parsedTemplate.opportunityType,
          serviceLine: parsedTemplate.serviceLine,
          checklistJson: parsedTemplate.checklist,
          taskTemplateJson: parsedTemplate.taskTemplates,
          isActive: parsedTemplate.isActive,
        },
      });

      return NextResponse.json({ data: template });
    }

    const parsed = opportunitySchema.partial({ name: true, companyId: true, opportunityType: true }).parse(payload);

    if (parsed.tasks) {
      await prisma.opportunityTask.deleteMany({ where: { opportunityId: id } });
    }

    const automated = applyDeliveryAutomation({
      status: parsed.status,
      deliveryStatus: parsed.deliveryStatus,
      checklistJson: parsed.checklist,
      tasks: parsed.tasks,
    });

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
        deliveryStatus: parsed.status ? (automated.deliveryStatus as "NOT_STARTED" | "KICKOFF_SCHEDULED" | "PAPERWORK_COMPLETE" | "IMPLEMENTATION_IN_PROGRESS" | "INSTALL_SCHEDULED" | "LIVE" | "FOLLOW_UP_COMPLETE" | null) : parsed.deliveryStatus,
        checklistJson: parsed.checklist ? automated.checklist : undefined,
        notes: parsed.notes,
        tasks: parsed.tasks ? {
          create: automated.tasks.map((task, index) => ({
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

    return NextResponse.json({ data: serializeOpportunity(opportunity) });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid opportunity payload" }, { status: 400 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update opportunity" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();

  try {
    const { id } = await params;
    const search = new URL(request.url).searchParams;
    if (search.get("entity") === "template") {
      await prisma.opportunityTemplate.update({ where: { id }, data: { isActive: false } });
      return NextResponse.json({ ok: true });
    }

    await prisma.opportunity.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete opportunity" }, { status: 500 });
  }
}
