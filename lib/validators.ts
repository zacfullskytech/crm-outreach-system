import { z } from "zod";

const customFieldEntrySchema = z.object({
  key: z.string().trim().min(1),
  value: z.string().trim().min(1),
});

const tagEntrySchema = z.string().trim().min(1);
const serviceEntrySchema = z.string().trim().min(1);

export const contactSchema = z.object({
  companyId: z.string().cuid().optional().nullable(),
  firstName: z.string().trim().min(1).optional().nullable(),
  lastName: z.string().trim().min(1).optional().nullable(),
  fullName: z.string().trim().min(1).optional().nullable(),
  jobTitle: z.string().trim().min(1).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  phone: z.string().trim().min(1).optional().nullable(),
  linkedinUrl: z.string().trim().url().optional().nullable(),
  status: z.enum(["ACTIVE", "UNSUBSCRIBED", "BOUNCED", "INVALID", "DO_NOT_CONTACT"]).optional(),
  source: z.string().trim().min(1).optional().nullable(),
  notes: z.string().trim().min(1).optional().nullable(),
  customFields: z.array(customFieldEntrySchema).optional(),
});

export const companySchema = z.object({
  name: z.string().trim().min(1),
  businessType: z.string().trim().min(1).optional().nullable(),
  industry: z.string().trim().min(1).optional().nullable(),
  website: z.string().trim().min(1).optional().nullable(),
  phone: z.string().trim().min(1).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  city: z.string().trim().min(1).optional().nullable(),
  state: z.string().trim().min(1).max(2).optional().nullable(),
  postalCode: z.string().trim().min(1).optional().nullable(),
  source: z.string().trim().min(1).optional().nullable(),
  notes: z.string().trim().min(1).optional().nullable(),
  status: z.enum(["CLIENT", "LEAD", "PROSPECT", "INACTIVE"]).optional(),
  services: z.array(serviceEntrySchema).optional(),
  customFields: z.array(customFieldEntrySchema).optional(),
});

export const segmentRuleSchema = z.object({
  field: z.string().min(1),
  comparator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "in",
    "not_in",
    "starts_with",
    "ends_with",
    "is_empty",
    "is_not_empty",
    "gt",
    "gte",
    "lt",
    "lte",
    "between",
    "has",
    "not_has",
  ]),
  value: z.any().optional(),
});

export const segmentGroupSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    operator: z.enum(["AND", "OR"]),
    rules: z.array(z.union([segmentRuleSchema, segmentGroupSchema])).min(1),
  }),
);

export const segmentSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional().nullable(),
  entityType: z.enum(["contact", "company", "prospect"]),
  filterJson: segmentGroupSchema,
});

export const campaignSchema = z.object({
  name: z.string().trim().min(1),
  subject: z.string().trim().min(1),
  fromName: z.string().trim().min(1).optional().nullable(),
  fromEmail: z.string().trim().email(),
  replyTo: z.string().trim().email().optional().nullable(),
  templateHtml: z.string().min(1),
  templateText: z.string().min(1).optional().nullable(),
  segmentId: z.string().cuid().optional().nullable(),
  status: z.enum(["DRAFT", "SCHEDULED", "SENDING", "SENT", "PAUSED", "FAILED"]).optional(),
  scheduledAt: z
    .string()
    .trim()
    .min(1)
    .optional()
    .nullable()
    .refine((value) => value == null || !Number.isNaN(new Date(value).getTime()), "Invalid datetime"),
});

export const prospectSchema = z.object({
  companyName: z.string().trim().min(1),
  contactName: z.string().trim().min(1).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  phone: z.string().trim().min(1).optional().nullable(),
  website: z.string().trim().min(1).optional().nullable(),
  industry: z.string().trim().min(1).optional().nullable(),
  businessType: z.string().trim().min(1).optional().nullable(),
  city: z.string().trim().min(1).optional().nullable(),
  state: z.string().trim().min(1).max(2).optional().nullable(),
  postalCode: z.string().trim().min(1).optional().nullable(),
  source: z.string().trim().min(1).optional().nullable(),
  sourceUrl: z.string().trim().url().optional().nullable(),
  qualificationStatus: z.enum(["NEW", "REVIEWING", "QUALIFIED", "REJECTED", "CONVERTED"]).optional(),
  matchStatus: z.enum(["NEW", "POSSIBLE_MATCH", "EXISTING_COMPANY", "EXISTING_CONTACT"]).optional(),
  matchReason: z.string().trim().min(1).optional().nullable(),
  score: z.number().int().optional().nullable(),
  notes: z.string().trim().min(1).optional().nullable(),
  searchJobId: z.string().cuid().optional().nullable(),
  candidateId: z.string().cuid().optional().nullable(),
});

export const prospectSearchJobSchema = z.object({
  name: z.string().trim().min(1),
  industry: z.string().trim().min(1).optional().nullable(),
  geography: z.array(z.string().trim().min(1)).min(1),
  includeKeywords: z.array(z.string().trim().min(1)).optional().default([]),
  excludeKeywords: z.array(z.string().trim().min(1)).optional().default([]),
  companyTypes: z.array(z.string().trim().min(1)).optional().default([]),
  notes: z.string().trim().min(1).optional().nullable(),
  realDataOnly: z.boolean().optional().default(false),
  rerunJobId: z.string().cuid().optional().nullable(),
  automationId: z.string().cuid().optional().nullable(),
});

export const prospectAutomationSchema = z.object({
  name: z.string().trim().min(1),
  industry: z.string().trim().min(1).optional().nullable(),
  geography: z.array(z.string().trim().min(1)).min(1),
  includeKeywords: z.array(z.string().trim().min(1)).optional().default([]),
  excludeKeywords: z.array(z.string().trim().min(1)).optional().default([]),
  companyTypes: z.array(z.string().trim().min(1)).optional().default([]),
  notes: z.string().trim().min(1).optional().nullable(),
  realDataOnly: z.boolean().optional().default(false),
  requireEmail: z.boolean().optional().default(false),
  preferBusinessEmail: z.boolean().optional().default(true),
  minimumScore: z.number().int().min(0).optional().nullable(),
  maxResultsPerRun: z.number().int().min(1).max(100).optional().default(30),
  scheduleType: z.enum(["daily", "weekdays"]).optional().default("weekdays"),
  scheduleHourLocal: z.number().int().min(0).max(23).optional().default(5),
  scheduleMinuteLocal: z.number().int().min(0).max(59).optional().default(30),
  timezone: z.string().trim().min(1).optional().default("UTC"),
  isActive: z.boolean().optional().default(true),
});

export const prospectCandidateReviewSchema = z.object({
  status: z.enum(["NEW", "APPROVED", "REJECTED", "IMPORTED"]),
  notes: z.string().trim().min(1).optional().nullable(),
  matchStatus: z.enum(["NEW", "POSSIBLE_MATCH", "EXISTING_COMPANY", "EXISTING_CONTACT"]).optional(),
  matchReason: z.string().trim().min(1).optional().nullable(),
});

export const opportunityChecklistEntrySchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
  done: z.boolean().optional().default(false),
  notes: z.string().trim().min(1).optional().nullable(),
});

export const opportunityTaskEntrySchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).optional().nullable(),
  assigneeUserId: z.string().cuid().optional().nullable(),
  dueDate: z.string().trim().min(1).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]).optional(),
  checklistKey: z.string().trim().min(1).optional().nullable(),
});

export const opportunityTemplateSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional().nullable(),
  opportunityType: z.enum(["NEW_SALE", "UPSELL", "RENEWAL"]),
  serviceLine: z.string().trim().min(1).optional().nullable(),
  checklist: z.array(opportunityChecklistEntrySchema).optional().default([]),
  taskTemplates: z.array(opportunityTaskEntrySchema).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

export const opportunitySchema = z.object({
  name: z.string().trim().min(1),
  companyId: z.string().cuid(),
  contactId: z.string().cuid().optional().nullable(),
  templateId: z.string().cuid().optional().nullable(),
  ownerUserId: z.string().cuid().optional().nullable(),
  opportunityType: z.enum(["NEW_SALE", "UPSELL", "RENEWAL"]),
  stage: z.enum(["DISCOVERED", "CONTACTED", "QUALIFIED", "MEETING_SCHEDULED", "PROPOSAL_REQUESTED", "QUOTE_SENT", "FOLLOW_UP", "VERBAL_YES", "CLOSED_WON", "CLOSED_LOST"]).optional(),
  status: z.enum(["OPEN", "WON", "LOST", "ON_HOLD"]).optional(),
  deliveryStatus: z.enum(["NOT_STARTED", "KICKOFF_SCHEDULED", "PAPERWORK_COMPLETE", "IMPLEMENTATION_IN_PROGRESS", "INSTALL_SCHEDULED", "LIVE", "FOLLOW_UP_COMPLETE"]).optional().nullable(),
  serviceLine: z.string().trim().min(1).optional().nullable(),
  valueEstimate: z.number().int().optional().nullable(),
  monthlyValue: z.number().int().optional().nullable(),
  oneTimeValue: z.number().int().optional().nullable(),
  targetCloseDate: z.string().trim().min(1).optional().nullable(),
  checklist: z.array(opportunityChecklistEntrySchema).optional().default([]),
  notes: z.string().trim().min(1).optional().nullable(),
  tasks: z.array(opportunityTaskEntrySchema).optional().default([]),
});

export const opportunityTaskSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).optional().nullable(),
  assigneeUserId: z.string().cuid().optional().nullable(),
  dueDate: z.string().trim().min(1).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]).optional(),
  checklistKey: z.string().trim().min(1).optional().nullable(),
});

export const marketingContentSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).optional().nullable(),
  contentType: z.string().trim().min(1),
  serviceLine: z.string().trim().min(1).optional().nullable(),
  audience: z.string().trim().min(1).optional().nullable(),
  channel: z.string().trim().min(1).optional().nullable(),
  industry: z.string().trim().min(1).optional().nullable(),
  offerType: z.string().trim().min(1).optional().nullable(),
  assetFormat: z.string().trim().min(1).optional().nullable(),
  tone: z.string().trim().min(1).optional().nullable(),
  lifecycleStage: z.string().trim().min(1).optional().nullable(),
  fileName: z.string().trim().min(1).optional().nullable(),
  fileUrl: z.string().trim().min(1).optional().nullable(),
  imagePrompt: z.string().trim().min(1).optional().nullable(),
  imageUrl: z.string().trim().min(1).optional().nullable(),
  callToAction: z.string().trim().min(1).optional().nullable(),
  bodyText: z.string().trim().min(1).optional().nullable(),
  bodyHtml: z.string().trim().min(1).optional().nullable(),
  promptNotes: z.string().trim().min(1).optional().nullable(),
  promptTemplateKey: z.string().trim().min(1).optional().nullable(),
  tags: z.array(tagEntrySchema).optional(),
  taxonomy: z.array(tagEntrySchema).optional(),
  variables: z.array(customFieldEntrySchema).optional(),
});
