-- CreateEnum
CREATE TYPE "LeadSegment" AS ENUM ('HR_WELLBEING_CULTURE', 'EVENT_MARKETING_AGENCY', 'SALES_TEAM_CLIENT_GIFTING', 'OTHER');

-- CreateEnum
CREATE TYPE "EmailTemplateCategory" AS ENUM ('EDM_SEQUENCE', 'COLD_OUTREACH', 'RESPONSE_SCENARIO');

-- AlterEnum
BEGIN;
CREATE TYPE "SalesLeadStage_new" AS ENUM ('SOURCE', 'QUALIFY', 'OUTREACH_SENT', 'NURTURE', 'PROPOSAL_SAMPLE_SENT', 'CLOSED_WON', 'CLOSED_LOST', 'RETAIN_REFERRAL');
ALTER TABLE "sales_leads" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "sales_leads" ALTER COLUMN "stage" TYPE "SalesLeadStage_new" USING ("stage"::text::"SalesLeadStage_new");
ALTER TYPE "SalesLeadStage" RENAME TO "SalesLeadStage_old";
ALTER TYPE "SalesLeadStage_new" RENAME TO "SalesLeadStage";
DROP TYPE "SalesLeadStage_old";
ALTER TABLE "sales_leads" ALTER COLUMN "stage" SET DEFAULT 'SOURCE';
COMMIT;

-- AlterTable
ALTER TABLE "sales_leads" ADD COLUMN     "est_order_value_nzd" DECIMAL(65,30),
ADD COLUMN     "last_touch_date" TIMESTAMP(3),
ADD COLUMN     "lead_number" SERIAL NOT NULL,
ADD COLUMN     "next_action" TEXT,
ADD COLUMN     "next_action_date" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "segment" "LeadSegment" NOT NULL,
ALTER COLUMN "stage" SET DEFAULT 'SOURCE';

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "category" "EmailTemplateCategory" NOT NULL,
    "sequence_position" INTEGER,
    "segment" "LeadSegment",
    "scenario_name" TEXT,
    "send_timing_notes" TEXT,
    "subject" TEXT NOT NULL,
    "subject_alt_hr" TEXT,
    "subject_alt_agency" TEXT,
    "subject_alt_sales" TEXT,
    "preheader" TEXT,
    "body" TEXT NOT NULL,
    "cta_label" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gifting_occasions" (
    "id" TEXT NOT NULL,
    "occasion_name" TEXT NOT NULL,
    "approx_timing" TEXT NOT NULL,
    "trigger_by" TEXT NOT NULL,
    "notes" TEXT,
    "is_always_on" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gifting_occasions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_one_pager" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "blob_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_one_pager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_templates_category_idx" ON "email_templates"("category");

-- CreateIndex
CREATE INDEX "email_templates_segment_idx" ON "email_templates"("segment");

-- CreateIndex
CREATE UNIQUE INDEX "sales_leads_lead_number_key" ON "sales_leads"("lead_number");

-- CreateIndex
CREATE INDEX "sales_leads_segment_idx" ON "sales_leads"("segment");

-- CreateIndex
CREATE INDEX "sales_leads_next_action_date_idx" ON "sales_leads"("next_action_date");

