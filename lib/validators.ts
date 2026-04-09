import { z } from "zod";

const customFieldEntrySchema = z.object({
  key: z.string().trim().min(1),
  value: z.string().trim().min(1),
});

const tagEntrySchema = z.string().trim().min(1);

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
  city: z.string().trim().min(1).optional().nullable(),
  state: z.string().trim().min(1).max(2).optional().nullable(),
  postalCode: z.string().trim().min(1).optional().nullable(),
  source: z.string().trim().min(1).optional().nullable(),
  notes: z.string().trim().min(1).optional().nullable(),
  status: z.enum(["CLIENT", "LEAD", "PROSPECT", "INACTIVE"]).optional(),
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
  scheduledAt: z.string().datetime().optional().nullable(),
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
  score: z.number().int().optional().nullable(),
  notes: z.string().trim().min(1).optional().nullable(),
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
