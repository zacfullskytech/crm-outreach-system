import { prisma } from "@/lib/db";

export type PipelineChecklistEntry = {
  key: string;
  label: string;
  done?: boolean;
};

export type PipelineTaskTemplate = {
  title: string;
  description?: string | null;
  assigneeUserId?: string | null;
  dueDate?: string | null;
  status?: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
  checklistKey?: string | null;
};

export const opportunityTypeOptions = [
  "NEW_SALE",
  "UPSELL",
  "RENEWAL",
] as const;

export const opportunityStageOptions = [
  "DISCOVERED",
  "CONTACTED",
  "QUALIFIED",
  "MEETING_SCHEDULED",
  "PROPOSAL_REQUESTED",
  "QUOTE_SENT",
  "FOLLOW_UP",
  "VERBAL_YES",
  "CLOSED_WON",
  "CLOSED_LOST",
] as const;

export const opportunityStatusOptions = [
  "OPEN",
  "WON",
  "LOST",
  "ON_HOLD",
] as const;

export const opportunityTaskStatusOptions = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "BLOCKED",
] as const;

export const pipelineTemplateSeeds = [
  {
    name: "Internet Sale",
    description: "Standard workflow for selling internet connectivity to a new or existing account.",
    opportunityType: "NEW_SALE",
    serviceLine: "Internet",
    checklistJson: [
      { key: "service_address", label: "Confirm service address", done: false },
      { key: "current_provider", label: "Capture current provider", done: false },
      { key: "current_bill", label: "Collect current bill", done: false },
      { key: "requirements", label: "Confirm bandwidth and usage requirements", done: false },
      { key: "quote", label: "Prepare and send quote", done: false },
      { key: "follow_up", label: "Schedule follow-up", done: false },
    ],
    taskTemplateJson: [
      { title: "Collect current internet bill", description: "Request the latest provider bill and review contract timing.", checklistKey: "current_bill" },
      { title: "Build internet quote", description: "Prepare pricing and package options for the account.", checklistKey: "quote" },
    ],
  },
  {
    name: "Phones Sale",
    description: "Standard workflow for business phone / VoIP sales.",
    opportunityType: "NEW_SALE",
    serviceLine: "Phones",
    checklistJson: [
      { key: "line_count", label: "Confirm line and handset count", done: false },
      { key: "current_provider", label: "Capture current provider", done: false },
      { key: "feature_needs", label: "Confirm required phone features", done: false },
      { key: "quote", label: "Prepare and send quote", done: false },
      { key: "follow_up", label: "Schedule follow-up", done: false },
    ],
    taskTemplateJson: [
      { title: "Review current phone environment", description: "Document provider, line count, and device requirements.", checklistKey: "line_count" },
      { title: "Build phones proposal", description: "Prepare quote and onboarding assumptions.", checklistKey: "quote" },
    ],
  },
  {
    name: "Managed IT Upsell",
    description: "Repeatable upsell flow for managed IT or support services into an existing account.",
    opportunityType: "UPSELL",
    serviceLine: "Managed I.T. Services",
    checklistJson: [
      { key: "pain_points", label: "Confirm pain points and support gaps", done: false },
      { key: "environment", label: "Review current environment", done: false },
      { key: "scope", label: "Define support scope", done: false },
      { key: "quote", label: "Prepare and send quote", done: false },
      { key: "handoff", label: "Prep implementation handoff", done: false },
    ],
    taskTemplateJson: [
      { title: "Assess current IT support model", description: "Document how the client is currently covering IT operations.", checklistKey: "environment" },
      { title: "Draft managed IT proposal", description: "Prepare pricing, scope, and implementation notes.", checklistKey: "quote" },
    ],
  },
] as const;

export function normalizeChecklistEntries(value: unknown): PipelineChecklistEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    .map((entry, index) => ({
      key: typeof entry.key === "string" && entry.key.trim() ? entry.key.trim() : `item-${index + 1}`,
      label: typeof entry.label === "string" ? entry.label.trim() : "",
      done: Boolean(entry.done),
    }))
    .filter((entry) => entry.label);
}

export function normalizeTaskTemplates(value: unknown): PipelineTaskTemplate[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    .map((entry) => {
      const status: PipelineTaskTemplate["status"] =
        entry.status === "TODO" ||
        entry.status === "IN_PROGRESS" ||
        entry.status === "DONE" ||
        entry.status === "BLOCKED"
          ? entry.status
          : "TODO";

      return {
        title: typeof entry.title === "string" ? entry.title.trim() : "",
        description: typeof entry.description === "string" ? entry.description.trim() || null : null,
        assigneeUserId: typeof entry.assigneeUserId === "string" ? entry.assigneeUserId : null,
        dueDate: typeof entry.dueDate === "string" ? entry.dueDate : null,
        status,
        checklistKey: typeof entry.checklistKey === "string" ? entry.checklistKey : null,
      };
    })
    .filter((entry) => entry.title);
}

export function applyDeliveryAutomation(opportunity: {
  status?: string | null;
  deliveryStatus?: "NOT_STARTED" | "KICKOFF_SCHEDULED" | "PAPERWORK_COMPLETE" | "IMPLEMENTATION_IN_PROGRESS" | "INSTALL_SCHEDULED" | "LIVE" | "FOLLOW_UP_COMPLETE" | null;
  checklistJson?: unknown;
  tasks?: Array<{ title: string; description?: string | null; assigneeUserId?: string | null; dueDate?: Date | string | null; status?: string | null; checklistKey?: string | null }>;
}) {
  const normalizedChecklist = normalizeChecklistEntries(opportunity.checklistJson);
  const normalizedTasks = normalizeTaskTemplates(opportunity.tasks || []);

  if (opportunity.status !== "WON") {
    return {
      deliveryStatus: null,
      checklist: normalizedChecklist,
      tasks: normalizedTasks,
    };
  }

  const deliveryStatus = opportunity.deliveryStatus || "NOT_STARTED";
  const deliveryChecklist = [
    { key: "kickoff_booked", label: "Schedule kickoff with client" },
    { key: "paperwork_signed", label: "Complete paperwork and approvals" },
    { key: "delivery_handoff", label: "Hand off delivery scope to implementation" },
    { key: "go_live_confirmed", label: "Confirm live date and acceptance" },
    { key: "post_launch_followup", label: "Run post-launch follow-up" },
  ];
  const deliveryTasks = [
    { title: "Schedule kickoff call", description: "Align scope, timing, and delivery owner.", checklistKey: "kickoff_booked", status: "TODO" as const },
    { title: "Confirm paperwork completion", description: "Verify signatures, billing, and required internal approvals.", checklistKey: "paperwork_signed", status: "TODO" as const },
    { title: "Prepare implementation handoff", description: "Package all sold details for delivery and provisioning.", checklistKey: "delivery_handoff", status: "TODO" as const },
  ];

  const mergedChecklist = [...normalizedChecklist];
  for (const entry of deliveryChecklist) {
    if (!mergedChecklist.some((item) => item.key === entry.key)) {
      mergedChecklist.push({ ...entry, done: false });
    }
  }

  const mergedTasks = [...normalizedTasks];
  for (const task of deliveryTasks) {
    if (!mergedTasks.some((entry) => entry.checklistKey === task.checklistKey || entry.title.toLowerCase() === task.title.toLowerCase())) {
      mergedTasks.push(task);
    }
  }

  return {
    deliveryStatus,
    checklist: mergedChecklist,
    tasks: mergedTasks,
  };
}

export async function ensurePipelineTemplates(userId?: string | null) {
  const existing = await prisma.opportunityTemplate.count();
  if (existing > 0) {
    return;
  }

  await prisma.opportunityTemplate.createMany({
    data: pipelineTemplateSeeds.map((template) => ({
      ...template,
      createdById: userId ?? null,
    })),
  });
}
