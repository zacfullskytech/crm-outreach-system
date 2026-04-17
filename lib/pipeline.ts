import { prisma } from "@/lib/db";

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
