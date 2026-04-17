import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/supabase/auth";
import { opportunitySchema, opportunityTemplateSchema } from "@/lib/validators";
import { applyDeliveryAutomation, ensurePipelineTemplates, normalizeChecklistEntries, normalizeTaskTemplates } from "@/lib/pipeline";

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

export async function GET() {
  const { appUser } = await requireAuth();
  await ensurePipelineTemplates(appUser.id);

  const [opportunities, templates, users, companies, contacts] = await Promise.all([
    prisma.opportunity.findMany({
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
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
    }),
    prisma.opportunityTemplate.findMany({ where: { isActive: true }, orderBy: [{ name: "asc" }] }),
    prisma.user.findMany({ select: { id: true, email: true, name: true }, orderBy: [{ email: "asc" }] }),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: [{ name: "asc" }], take: 300 }),
    prisma.contact.findMany({ select: { id: true, fullName: true, email: true, companyId: true }, orderBy: [{ fullName: "asc" }], take: 300 }),
  ]);

  return NextResponse.json({
    data: {
      opportunities: opportunities.map((opportunity) => serializeOpportunity(opportunity)),
      templates,
      users,
      companies,
      contacts,
    },
  });
}

export async function POST(request: NextRequest) {
  const { appUser } = await requireAuth();

  try {
    const payload = await request.json();
    if (payload && typeof payload === "object" && "template" in payload) {
      const parsedTemplate = opportunityTemplateSchema.parse((payload as { template: unknown }).template);
      const createdTemplate = await prisma.opportunityTemplate.create({
        data: {
          name: parsedTemplate.name,
          description: parsedTemplate.description ?? null,
          opportunityType: parsedTemplate.opportunityType,
          serviceLine: parsedTemplate.serviceLine ?? null,
          checklistJson: parsedTemplate.checklist,
          taskTemplateJson: parsedTemplate.taskTemplates,
          isActive: parsedTemplate.isActive ?? true,
          createdById: appUser.id,
        },
      });

      return NextResponse.json({ data: createdTemplate }, { status: 201 });
    }

    const parsed = opportunitySchema.parse(payload);
    const template = parsed.templateId
      ? await prisma.opportunityTemplate.findUnique({ where: { id: parsed.templateId } })
      : null;

    const baseChecklist = parsed.checklist.length > 0
      ? parsed.checklist
      : normalizeChecklistEntries(template?.checklistJson);

    const baseTasks = parsed.tasks.length > 0
      ? parsed.tasks
      : normalizeTaskTemplates(template?.taskTemplateJson);

    const automated = applyDeliveryAutomation({
      status: parsed.status ?? "OPEN",
      deliveryStatus: parsed.deliveryStatus ?? null,
      checklistJson: baseChecklist,
      tasks: baseTasks,
    });

    const opportunity = await prisma.opportunity.create({
      data: {
        name: parsed.name,
        companyId: parsed.companyId,
        contactId: parsed.contactId ?? null,
        templateId: parsed.templateId ?? null,
        ownerUserId: parsed.ownerUserId ?? null,
        createdById: appUser.id,
        opportunityType: parsed.opportunityType,
        stage: parsed.stage ?? "DISCOVERED",
        status: parsed.status ?? "OPEN",
        serviceLine: parsed.serviceLine ?? template?.serviceLine ?? null,
        valueEstimate: parsed.valueEstimate ?? null,
        monthlyValue: parsed.monthlyValue ?? null,
        oneTimeValue: parsed.oneTimeValue ?? null,
        targetCloseDate: parsed.targetCloseDate ? new Date(parsed.targetCloseDate) : null,
        deliveryStatus: automated.deliveryStatus,
        checklistJson: automated.checklist,
        notes: parsed.notes ?? null,
        tasks: {
          create: automated.tasks.map((task, index) => ({
            title: String(task.title),
            description: task.description ? String(task.description) : null,
            assigneeUserId: task.assigneeUserId ? String(task.assigneeUserId) : null,
            dueDate: task.dueDate ? new Date(String(task.dueDate)) : null,
            status: task.status ? String(task.status) as "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED" : "TODO",
            checklistKey: task.checklistKey ? String(task.checklistKey) : null,
            sortOrder: index,
          })),
        },
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

    return NextResponse.json({ data: serializeOpportunity(opportunity) }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid opportunity payload" }, { status: 400 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create opportunity" }, { status: 500 });
  }
}
