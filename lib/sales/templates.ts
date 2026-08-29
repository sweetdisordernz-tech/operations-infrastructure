import { prisma } from "@/lib/db";
import type { EmailTemplateCategory, LeadSegment } from "@prisma/client";

/**
 * The send-ready outreach copy library (brief Section 10.6) - read-only
 * reference content Molly copies from. Sort order matters per category:
 * EDM sequence shows in numbered order (1-5), cold outreach groups by
 * segment, response scenarios are alphabetical by scenario name so they're
 * easy to scan/search mid-conversation.
 */

export type TemplateRow = {
  id: string;
  category: EmailTemplateCategory;
  sequencePosition: number | null;
  segment: LeadSegment | null;
  scenarioName: string | null;
  sendTimingNotes: string | null;
  subject: string;
  subjectAltHr: string | null;
  subjectAltAgency: string | null;
  subjectAltSales: string | null;
  preheader: string | null;
  body: string;
  ctaLabel: string | null;
  notes: string | null;
};

export async function getEmailTemplates(): Promise<TemplateRow[]> {
  const templates = await prisma.emailTemplate.findMany();

  return templates
    .map((t) => ({
      id: t.id,
      category: t.category,
      sequencePosition: t.sequencePosition,
      segment: t.segment,
      scenarioName: t.scenarioName,
      sendTimingNotes: t.sendTimingNotes,
      subject: t.subject,
      subjectAltHr: t.subjectAltHr,
      subjectAltAgency: t.subjectAltAgency,
      subjectAltSales: t.subjectAltSales,
      preheader: t.preheader,
      body: t.body,
      ctaLabel: t.ctaLabel,
      notes: t.notes,
    }))
    .sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      if (a.category === "EDM_SEQUENCE") return (a.sequencePosition ?? 0) - (b.sequencePosition ?? 0);
      if (a.category === "COLD_OUTREACH") return (a.segment ?? "").localeCompare(b.segment ?? "");
      return (a.scenarioName ?? "").localeCompare(b.scenarioName ?? "");
    });
}
