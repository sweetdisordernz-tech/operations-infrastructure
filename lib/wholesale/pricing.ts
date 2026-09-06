import { prisma } from "@/lib/db";
import type { PricingTier, Region } from "@prisma/client";

/**
 * Shared by checkout.ts (the authoritative charge) and catalog.ts (the
 * cart's live preview) so both always agree on which tier prices a given
 * region - see the long comment on resolveTierForRegion below for why this
 * exists at all. A single source of truth here is what makes "what you see
 * in the cart" and "what you're actually charged" the same number.
 */

/** The one standard tier for a region - Molly currently maintains exactly one NZ and one AU price list. */
export async function getCanonicalTierForRegion(region: Region): Promise<PricingTier | null> {
  return prisma.pricingTier.findFirst({ where: { region } });
}

/**
 * Resolves which PricingTier prices a region's line items with. A
 * customer's own assigned tier (customer.pricingTierId) is used for their
 * home region - so a special/negotiated tier stays respected there. For
 * the *other* region (only reachable at all when shipsToBothRegions is
 * true, via the cart's per-line region toggle), the customer has no
 * assigned tier, so this falls back to that region's own standard tier.
 *
 * This matters because before this existed, every line item in a split
 * cart was priced from customer.pricingTierId regardless of which region
 * it actually shipped to - silently harmless while every tier carried the
 * same placeholder prices, but wrong once genuinely different NZ/AU prices
 * exist: an AU-region line would have been charged NZ prices.
 */
export async function resolveTierForRegion(
  region: Region,
  assignedTier: PricingTier | null,
): Promise<PricingTier | null> {
  if (assignedTier && assignedTier.region === region) return assignedTier;
  return getCanonicalTierForRegion(region);
}
