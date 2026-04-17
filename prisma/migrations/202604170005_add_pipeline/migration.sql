CREATE TYPE "OpportunityType" AS ENUM ('NEW_SALE', 'UPSELL', 'RENEWAL');
CREATE TYPE "OpportunityStage" AS ENUM ('DISCOVERED', 'CONTACTED', 'QUALIFIED', 'MEETING_SCHEDULED', 'PROPOSAL_REQUESTED', 'QUOTE_SENT', 'FOLLOW_UP', 'VERBAL_YES', 'CLOSED_WON', 'CLOSED_LOST');
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'WON', 'LOST', 'ON_HOLD');
CREATE TYPE "OpportunityTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED');

CREATE TABLE "OpportunityTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "opportunityType" "OpportunityType" NOT NULL,
  "serviceLine" TEXT,
  "checklistJson" JSONB,
  "taskTemplateJson" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpportunityTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Opportunity" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "contactId" TEXT,
  "templateId" TEXT,
  "ownerUserId" TEXT,
  "createdById" TEXT,
  "opportunityType" "OpportunityType" NOT NULL,
  "stage" "OpportunityStage" NOT NULL DEFAULT 'DISCOVERED',
  "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN',
  "serviceLine" TEXT,
  "valueEstimate" INTEGER,
  "monthlyValue" INTEGER,
  "oneTimeValue" INTEGER,
  "targetCloseDate" TIMESTAMP(3),
  "checklistJson" JSONB,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpportunityTask" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "assigneeUserId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "dueDate" TIMESTAMP(3),
  "status" "OpportunityTaskStatus" NOT NULL DEFAULT 'TODO',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "checklistKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpportunityTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OpportunityTemplate_opportunityType_idx" ON "OpportunityTemplate"("opportunityType");
CREATE INDEX "OpportunityTemplate_serviceLine_idx" ON "OpportunityTemplate"("serviceLine");
CREATE INDEX "OpportunityTemplate_name_idx" ON "OpportunityTemplate"("name");
CREATE INDEX "Opportunity_companyId_idx" ON "Opportunity"("companyId");
CREATE INDEX "Opportunity_contactId_idx" ON "Opportunity"("contactId");
CREATE INDEX "Opportunity_templateId_idx" ON "Opportunity"("templateId");
CREATE INDEX "Opportunity_ownerUserId_idx" ON "Opportunity"("ownerUserId");
CREATE INDEX "Opportunity_stage_idx" ON "Opportunity"("stage");
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");
CREATE INDEX "Opportunity_opportunityType_idx" ON "Opportunity"("opportunityType");
CREATE INDEX "OpportunityTask_opportunityId_idx" ON "OpportunityTask"("opportunityId");
CREATE INDEX "OpportunityTask_assigneeUserId_idx" ON "OpportunityTask"("assigneeUserId");
CREATE INDEX "OpportunityTask_status_idx" ON "OpportunityTask"("status");
CREATE INDEX "OpportunityTask_dueDate_idx" ON "OpportunityTask"("dueDate");

ALTER TABLE "Opportunity"
  ADD CONSTRAINT "Opportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Opportunity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Opportunity_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OpportunityTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Opportunity_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Opportunity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OpportunityTask"
  ADD CONSTRAINT "OpportunityTask_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "OpportunityTask_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
