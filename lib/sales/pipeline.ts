import { prisma } from "@/lib/db";
import { AdminValidationError } from "@/lib/admin/errors";
import type { LeadSegment, SalesLeadStage } from "@prisma/client";

/**
 * The corporate-gifting sales pipeline (brief Section 10.6). Order matters
 * here - it drives the kanban column order and must match the business's
 * real 8-stage process exactly, not a generic funnel.
 */
export const STAGE_ORDER: SalesLeadStage[] = [
  "SOURCE",
  "QUALIFY",
  "OUTREACH_SENT",
  "NURTURE",
  "PROPOSAL_SAMPLE_SENT",
  "CLOSED_WON",
  "CLOSED_LOST",
  "RETAIN_REFERRAL",
];

export const STAGE_LABELS: Record<SalesLeadStage, string> = {
  SOURCE: "Source",
  QUALIFY: "Qualify",
  OUTREACH_SENT: "Outreach sent",
  NURTURE: "Nurture",
  PROPOSAL_SAMPLE_SENT: "Proposal/sample sent",
  CLOSED_WON: "Closed won",
  CLOSED_LOST: "Closed lost",
  RETAIN_REFERRAL: "Retain/referral",
};

export const SEGMENT_ORDER: LeadSegment[] = [
  "HR_WELLBEING_CULTURE",
  "EVENT_MARKETING_AGENCY",
  "SALES_TEAM_CLIENT_GIFTING",
  "OTHER",
];

export const SEGMENT_LABELS: Record<LeadSegment, string> = {
  HR_WELLBEING_CULTURE: "HR / Wellbeing / Culture",
  EVENT_MARKETING_AGENCY: "Event / Marketing agency",
  SALES_TEAM_CLIENT_GIFTING: "Sales team / Client gifting",
  OTHER: "Other",
};

const CLOSED_STAGES: SalesLeadStage[] = ["CLOSED_WON", "CLOSED_LOST"];

export type LeadRow = {
  id: string;
  leadNumber: number;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  segment: LeadSegment;
  stage: SalesLeadStage;
  source: string | null;
  nextActionDate: Date | null;
  nextAction: string | null;
  estOrderValueNzd: number | null;
  notes: string | null;
  lastTouchDate: Date | null;
  ownerName: string;
  createdAt: Date;
}

export async function getLeads(): Promise<LeadRow[]> {
  const leads = await prisma.salesLead.findMany({
    include: { ownerUser: { select: { name: true } } },
    orderBy: { leadNumber: "asc" },
  });
  return leads.map((lead) => ({
    id: lead.id,
    leadNumber: lead.leadNumber,
    companyName: lead.companyName,
    contactName: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    segment: lead.segment,
    stage: lead.stage,
    source: lead.source,
    nextActionDate: lead.nextActionDate,
    nextAction: lead.nextAction,
    estOrderValueNzd: lead.estOrderValueNzd ? Number(lead.estOrderValueNzd) : null,
    notes: lead.notes,
    lastTouchDate: lead.lastTouchDate,
    ownerName: lead.ownerUser.name,
    createdAt: lead.createdAt,
  }));
}

export async function getLead(id: string): Promise<LeadRow | null> {
  const lead = await prisma.salesLead.findUnique({
    where: { id },
    include: { ownerUser: { select: { name: true } } },
  });
  if (!lead) return null;
  return {
    id: lead.id,
    leadNumber: lead.leadNumber,
    companyName: lead.companyName,
    contactName: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    segment: lead.segment,
    stage: lead.stage,
    source: lead.source,
    nextActionDate: lead.nextActionDate,
    nextAction: lead.nextAction,
    estOrderValueNzd: lead.estOrderValueNzd ? Number(lead.estOrderValueNzd) : null,
    notes: lead.notes,
    lastTouchDate: lead.lastTouchDate,
    ownerName: lead.ownerUser.name,
    createdAt: lead.createdAt,
  };
}

export type LeadInput = {
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  segment: LeadSegment;
  stage: SalesLeadStage;
  source: string | null;
  nextActionDate: Date | null;
  nextAction: string | null;
  estOrderValueNzd: number | null;
  notes: string | null;
  lastTouchDate: Date | null;
};

function validate(input: LeadInput) {
  if (!input.companyName.trim()) throw new AdminValidationError("Company name is required.");
  if (!STAGE_ORDER.includes(input.stage)) throw new AdminValidationError("Invalid pipeline stage.");
  if (input.estOrderValueNzd !== null && (!Number.isFinite(input.estOrderValueNzd) || input.estOrderValueNzd < 0)) {
    throw new AdminValidationError("Estimated order value must be a number of 0 or more, or left blank.");
  }
}

export async function createLead(input: LeadInput, ownerUserId: string) {
  validate(input);
  return prisma.salesLead.create({
    data: {
      companyName: input.companyName.trim(),
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      segment: input.segment,
      stage: input.stage,
      source: input.source,
      nextActionDate: input.nextActionDate,
      nextAction: input.nextAction,
      estOrderValueNzd: input.estOrderValueNzd,
      notes: input.notes,
      lastTouchDate: input.lastTouchDate,
      ownerUserId,
    },
  });
}

export async function updateLead(id: string, input: LeadInput): Promise<void> {
  validate(input);
  const existing = await prisma.salesLead.findUnique({ where: { id } });
  if (!existing) throw new AdminValidationError("That lead no longer exists.");

  await prisma.salesLead.update({
    where: { id },
    data: {
      companyName: input.companyName.trim(),
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      segment: input.segment,
      stage: input.stage,
      source: input.source,
      nextActionDate: input.nextActionDate,
      nextAction: input.nextAction,
      estOrderValueNzd: input.estOrderValueNzd,
      notes: input.notes,
      lastTouchDate: input.lastTouchDate,
    },
  });
}

/**
 * Kanban stage move - a real "touch" (unlike a plain notes edit), so this
 * bumps lastTouchDate automatically instead of requiring a separate action.
 */
export async function moveLeadStage(id: string, stage: SalesLeadStage): Promise<void> {
  if (!STAGE_ORDER.includes(stage)) throw new AdminValidationError("Invalid pipeline stage.");
  const existing = await prisma.salesLead.findUnique({ where: { id } });
  if (!existing) throw new AdminValidationError("That lead no longer exists.");

  await prisma.salesLead.update({
    where: { id },
    data: { stage, lastTouchDate: new Date() },
  });
}

export async function deleteLead(id: string): Promise<void> {
  await prisma.salesLead.delete({ where: { id } });
}

export type PipelineMetrics = {
  totalLeads: number;
  totalPipelineValue: number;
  closedWonValue: number;
  winRate: number | null;
  stageBreakdown: Array<{ stage: SalesLeadStage; count: number }>;
  segmentBreakdown: Array<{ segment: LeadSegment; count: number }>;
};

/** Mirrors the business's existing spreadsheet Pipeline Dashboard tab exactly (brief Section 10.6). */
export function computePipelineMetrics(leads: LeadRow[]): PipelineMetrics {
  const totalPipelineValue = leads
    .filter((lead) => !CLOSED_STAGES.includes(lead.stage))
    .reduce((sum, lead) => sum + (lead.estOrderValueNzd ?? 0), 0);

  const closedWonValue = leads
    .filter((lead) => lead.stage === "CLOSED_WON")
    .reduce((sum, lead) => sum + (lead.estOrderValueNzd ?? 0), 0);

  const closedWonCount = leads.filter((lead) => lead.stage === "CLOSED_WON").length;
  const closedLostCount = leads.filter((lead) => lead.stage === "CLOSED_LOST").length;
  const closedTotal = closedWonCount + closedLostCount;
  const winRate = closedTotal > 0 ? closedWonCount / closedTotal : null;

  const stageBreakdown = STAGE_ORDER.map((stage) => ({
    stage,
    count: leads.filter((lead) => lead.stage === stage).length,
  }));

  const segmentBreakdown = SEGMENT_ORDER.map((segment) => ({
    segment,
    count: leads.filter((lead) => lead.segment === segment).length,
  }));

  return {
    totalLeads: leads.length,
    totalPipelineValue,
    closedWonValue,
    winRate,
    stageBreakdown,
    segmentBreakdown,
  };
}
