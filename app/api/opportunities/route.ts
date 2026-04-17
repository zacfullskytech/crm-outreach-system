import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/supabase/auth";
import { opportunitySchema } from "@/lib/validators";
import { ensurePipelineTemplates } from "@/lib/pipeline";

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

  return NextResponse.json({ data: { opportunities, templates, users, companies, contacts } });
}

export async function POST(request: NextRequest) {
  const { appUser } = await requireAuth();

  try {
    const payload = await request.json();
    const parsed = opportunitySchema.parse(payload);
    const template = parsed.templateId
      ? await prisma.opportunityTemplate.findUnique({ where: { id: parsed.templateId } })
      : null;

    const checklist = parsed.checklist.length > 0
      ? parsed.checklist
      : Array.isArray(template?.checklistJson)
        ? template.checklistJson
        : [];

    const taskTemplates = (parsed.tasks.length > 0
      ? parsed.tasks
      : Array.isArray(template?.taskTemplateJson)
        ? template.taskTemplateJson
        : []) as Array<{
      title: string;
      description?: string | null;
      assigneeUserId?: string | null;
      dueDate?: string | null;
      status?: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
      checklistKey?: string | null;
    }>;

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
        checklistJson: checklist,
        notes: parsed.notes ?? null,
        tasks: {
          create: taskTemplates.map((task, index) => ({
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

    return NextResponse.json({ data: opportunity }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid opportunity payload" }, { status: 400 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create opportunity" }, { status: 500 });
  }
}
