import { prisma } from "@/lib/db";

/**
 * Upcoming gifting occasions (brief Section 10.6) - sorted by proximity to
 * today. The source data is deliberately free text ("Late September",
 * "Early March") since real dates shift yearly, so this is a best-effort
 * parse (month name + early/mid/late-in-month heuristic) off `triggerBy`
 * (literally "when to act"), not an attempt at exact calendar dates. The
 * always-on row (Work Anniversaries) is never date-ranked - it's a
 * standing reminder, not a "next occasion" contender.
 */

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function parseApproxUpcomingDate(text: string, referenceDate: Date): Date | null {
  const lower = text.toLowerCase();
  const monthIndex = MONTH_NAMES.findIndex((month) => lower.includes(month));
  if (monthIndex === -1) return null;

  let day = 15;
  if (lower.includes("early")) day = 5;
  else if (lower.includes("late")) day = 25;

  const year = referenceDate.getUTCFullYear();
  let candidate = new Date(Date.UTC(year, monthIndex, day));
  if (candidate < referenceDate) {
    candidate = new Date(Date.UTC(year + 1, monthIndex, day));
  }
  return candidate;
}

export type OccasionRow = {
  id: string;
  occasionName: string;
  approxTiming: string;
  triggerBy: string;
  notes: string | null;
  isAlwaysOn: boolean;
  nextTriggerDate: Date | null;
};

export async function getGiftingOccasions(referenceDate: Date = new Date()): Promise<{
  seasonal: OccasionRow[];
  alwaysOn: OccasionRow[];
}> {
  const occasions = await prisma.giftingOccasion.findMany();

  const rows: OccasionRow[] = occasions.map((occasion) => ({
    id: occasion.id,
    occasionName: occasion.occasionName,
    approxTiming: occasion.approxTiming,
    triggerBy: occasion.triggerBy,
    notes: occasion.notes,
    isAlwaysOn: occasion.isAlwaysOn,
    nextTriggerDate: occasion.isAlwaysOn ? null : parseApproxUpcomingDate(occasion.triggerBy, referenceDate),
  }));

  const seasonal = rows
    .filter((row) => !row.isAlwaysOn)
    .sort((a, b) => {
      if (a.nextTriggerDate && b.nextTriggerDate) return a.nextTriggerDate.getTime() - b.nextTriggerDate.getTime();
      if (a.nextTriggerDate) return -1;
      if (b.nextTriggerDate) return 1;
      return a.occasionName.localeCompare(b.occasionName);
    });

  const alwaysOn = rows.filter((row) => row.isAlwaysOn);

  return { seasonal, alwaysOn };
}
