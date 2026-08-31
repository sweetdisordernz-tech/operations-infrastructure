import { readFileSync } from "fs";
import { join } from "path";
import {
  PrismaClient,
  PackagingType,
  Region,
  UserRole,
  AllergenStatus,
  AddressStatus,
  CountryOfOriginStatus,
  NutritionBoxStatus,
  LabelUrgency,
  EmailTemplateCategory,
  LeadSegment,
} from "@prisma/client";
import { hashPin } from "../lib/auth/pin";
import { backfillProductImages } from "../lib/products/image-backfill";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Minimal RFC4180-ish CSV parser (handles quoted fields, embedded commas,
// and "" as an escaped quote) - enough for our single known-shape catalog
// file, no need for a dependency.
// ---------------------------------------------------------------------------

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      // skip, \n handles the line break
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

type CatalogRow = {
  range: string;
  sku: string | null;
  barcode: string | null;
  name: string;
  packagingType: PackagingType;
  minOrderQty: number;
  filling: string | null;
};

const PACKAGING_TYPE_MAP: Record<string, PackagingType> = {
  Bottle: PackagingType.BOTTLE,
  Jar: PackagingType.JAR,
  Tin: PackagingType.TIN,
  Stand: PackagingType.STAND,
};

// No real SKU series exists yet for Christmas products - assumed prefix.
const RANGE_SKU_PREFIXES: Record<string, string> = {
  "Sweet Disorder Core Range": "SDP",
  "Kiwi Range": "SDK",
  "Old Classics Range": "CL",
  Treatmints: "SDT",
  Christmas: "SDX",
};

function titleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ");
}

function nullIfBlank(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function loadCatalog(): CatalogRow[] {
  const csvPath = join(__dirname, "data", "catalog.csv");
  const content = readFileSync(csvPath, "utf8");
  const [header, ...dataRows] = parseCsv(content);

  const columnIndex = (name: string) => header.indexOf(name);
  const rangeIdx = columnIndex("range");
  const skuIdx = columnIndex("sku");
  const barcodeIdx = columnIndex("barcode");
  const nameIdx = columnIndex("name");
  const packagingIdx = columnIndex("packaging_type");
  const minOrderQtyIdx = columnIndex("min_order_qty");
  const fillingIdx = columnIndex("filling");

  return dataRows.map((cells, rowNumber) => {
    const packagingRaw = cells[packagingIdx]?.trim();
    const packagingType = PACKAGING_TYPE_MAP[packagingRaw];
    if (!packagingType) {
      throw new Error(`Row ${rowNumber + 2}: unknown packaging_type "${packagingRaw}"`);
    }

    const minOrderQtyRaw = cells[minOrderQtyIdx]?.trim();
    const minOrderQty = minOrderQtyRaw ? parseInt(minOrderQtyRaw, 10) : 1;

    return {
      range: cells[rangeIdx].trim(),
      sku: nullIfBlank(cells[skuIdx]),
      barcode: nullIfBlank(cells[barcodeIdx]),
      name: cells[nameIdx].trim(),
      packagingType,
      minOrderQty,
      filling: nullIfBlank(cells[fillingIdx]),
    };
  });
}

type LabelComplianceRow = {
  name: string;
  sku: string | null;
  allergenStatus: AllergenStatus;
  allergenNotes: string | null;
  addressStatus: AddressStatus;
  countryOfOriginStatus: CountryOfOriginStatus;
  nutritionBoxStatus: NutritionBoxStatus;
  labelsInStock: number | null;
  urgency: LabelUrgency;
};

function loadLabelCompliance(): LabelComplianceRow[] {
  const csvPath = join(__dirname, "data", "label-compliance.csv");
  const content = readFileSync(csvPath, "utf8");
  const [header, ...dataRows] = parseCsv(content);

  const columnIndex = (name: string) => header.indexOf(name);
  const nameIdx = columnIndex("name");
  const skuIdx = columnIndex("sku");
  const allergenStatusIdx = columnIndex("allergen_status");
  const allergenNotesIdx = columnIndex("allergen_notes");
  const addressStatusIdx = columnIndex("address_status");
  const countryIdx = columnIndex("country_of_origin_status");
  const nutritionIdx = columnIndex("nutrition_box_status");
  const labelsInStockIdx = columnIndex("labels_in_stock");
  const urgencyIdx = columnIndex("urgency");

  return dataRows.map((cells) => {
    const labelsInStockRaw = nullIfBlank(cells[labelsInStockIdx]);
    return {
      name: cells[nameIdx].trim(),
      sku: nullIfBlank(cells[skuIdx]),
      allergenStatus: cells[allergenStatusIdx].trim() as AllergenStatus,
      allergenNotes: nullIfBlank(cells[allergenNotesIdx]),
      addressStatus: cells[addressStatusIdx].trim() as AddressStatus,
      countryOfOriginStatus: cells[countryIdx].trim() as CountryOfOriginStatus,
      nutritionBoxStatus: cells[nutritionIdx].trim() as NutritionBoxStatus,
      labelsInStock: labelsInStockRaw ? parseInt(labelsInStockRaw, 10) : null,
      urgency: cells[urgencyIdx].trim() as LabelUrgency,
    };
  });
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Plausible wholesale unit prices by packaging type, for seed/test data only
// - Molly will set real pricing later. Tins are sold in 4-packs
// (min_order_qty), so priced lower per unit than a bottle/jar.
const WHOLESALE_PRICE_RANGE_BY_PACKAGING: Record<PackagingType, [number, number]> = {
  [PackagingType.BOTTLE]: [6, 8],
  [PackagingType.JAR]: [9, 11],
  [PackagingType.TIN]: [2.5, 3.5],
  [PackagingType.STAND]: [120, 160],
};

function wholesalePriceFor(packagingType: PackagingType): number {
  const [min, max] = WHOLESALE_PRICE_RANGE_BY_PACKAGING[packagingType];
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Sales & marketing seed data (stage 6) - real content from the business's
// NZ Gifting Calendar and send-ready outreach copy, not placeholders.
// ---------------------------------------------------------------------------

type GiftingOccasionSeed = {
  occasionName: string;
  approxTiming: string;
  triggerBy: string;
  notes: string | null;
  isAlwaysOn: boolean;
};

const GIFTING_OCCASIONS: GiftingOccasionSeed[] = [
  {
    occasionName: "End of Financial Year (NZ)",
    approxTiming: "Late March",
    triggerBy: "Early March",
    notes: "Good angle for client thank-yous and staff recognition as teams close out the year.",
    isAlwaysOn: false,
  },
  {
    occasionName: "Employee Appreciation Day",
    approxTiming: "Early March",
    triggerBy: "Mid February",
    notes: "Staff-facing gifting angle — pairs well with EOFY wind-down.",
    isAlwaysOn: false,
  },
  {
    occasionName: "Mental Health Awareness Week",
    approxTiming: "Late September (dates shift yearly — confirm at mentalhealth.org.nz)",
    triggerBy: "Late August",
    notes: "Strong fit for the wellbeing segment specifically.",
    isAlwaysOn: false,
  },
  {
    occasionName: "R U OK Day",
    approxTiming: "Mid September",
    triggerBy: "Late August",
    notes: "Growing in NZ workplaces — good secondary wellbeing hook.",
    isAlwaysOn: false,
  },
  {
    occasionName: "New Financial Year Kick-off",
    approxTiming: "April",
    triggerBy: "Mid March",
    notes: "Good moment for agencies/sales teams planning new-quarter client outreach.",
    isAlwaysOn: false,
  },
  {
    occasionName: "Client Appreciation / EOY Gifting",
    approxTiming: "November – mid December",
    triggerBy: "Mid October",
    notes: "Biggest seasonal window — book this in early, production lead times get tight.",
    isAlwaysOn: false,
  },
  {
    occasionName: "Valentine's / Client Love",
    approxTiming: "Early-mid February",
    triggerBy: "Mid January",
    notes: "Lighter-touch option for sales teams re-engaging dormant prospects.",
    isAlwaysOn: false,
  },
  {
    occasionName: "Work Anniversaries / Milestones",
    approxTiming: "Ongoing, per-client",
    triggerBy: "N/A — always-on",
    notes: "Not seasonal, but worth a standing template for account managers to request jars ad hoc.",
    isAlwaysOn: true,
  },
];

type EmailTemplateSeed = {
  category: EmailTemplateCategory;
  sequencePosition: number | null;
  segment: LeadSegment | null;
  scenarioName: string | null;
  sendTimingNotes: string | null;
  subject: string;
  subjectAltHr?: string | null;
  subjectAltAgency?: string | null;
  subjectAltSales?: string | null;
  preheader?: string | null;
  body: string;
  ctaLabel?: string | null;
  notes?: string | null;
};

const EMAIL_TEMPLATES: EmailTemplateSeed[] = [
  {
    category: EmailTemplateCategory.EDM_SEQUENCE,
    sequencePosition: 1,
    segment: null,
    scenarioName: null,
    sendTimingNotes: "Day 0 (immediately on sign-up/enquiry)",
    subject: "A jar of sweets with a job to do",
    preheader: "Meet the joy-first approach to corporate gifting.",
    body: "Hi [First Name],\n\nI'm Molly — founder (Chief Dream Officer, if you want the full title) of Sweet Disorder.\n\nWe started out making novelty sweet jars because New Zealand could use a bit more joy in its inboxes, desks, and doorsteps. Now we're bringing that same energy to companies — as custom-branded gifts for clients, staff, and events.\n\nNo beige gift baskets. No forgettable pens. Just genuinely fun, fully branded gifting that gets talked about.\n\nOver the next couple of weeks I'll share a few ways companies are using this, plus exactly how the process works. For now — welcome aboard.\n\nMolly\nChief Dream Officer, Sweet Disorder",
    ctaLabel: "See what bespoke looks like →",
  },
  {
    category: EmailTemplateCategory.EDM_SEQUENCE,
    sequencePosition: 2,
    segment: null,
    scenarioName: null,
    sendTimingNotes: "Day 5–7",
    subject: "3 ways companies are using this right now",
    preheader: "Client gifts, staff wellbeing, and event swag — sorted.",
    body: 'Hi [First Name],\n\nWondering what "bespoke corporate gifting" actually looks like in practice? Here are three ways it\'s playing out:\n\n1. The client thank-you. A branded jar sent after a signed contract or milestone — the kind of gift that gets photographed and shared internally, not left in a drawer.\n\n2. The wellbeing drop. A team-wide joy boost timed to a wellbeing week or a tough quarter — small, genuine, and not another generic hamper nobody asked for.\n\n3. The event swag. Fully branded jars or boxes handed out at activations and conferences — memorable enough that people actually keep the jar.\n\nWhich of these sounds closest to what you\'re picturing? Hit reply and I\'ll tailor some ideas for [Company].',
    ctaLabel: "Show me examples →",
  },
  {
    category: EmailTemplateCategory.EDM_SEQUENCE,
    sequencePosition: 3,
    segment: null,
    scenarioName: null,
    sendTimingNotes: "Day 12–14",
    subject: 'From "let\'s do this" to boxes on desks',
    preheader: "A simple 4-step process, and how far ahead to plan.",
    body: "Hi [First Name],\n\nIf you're weighing this up, here's exactly how it goes from idea to delivered:\n\n1. Quick chat or brief — tell us the occasion, quantity, and vibe.\n\n2. Mockup & quote — see your branding on the actual product before committing.\n\n3. Production — [X] business days once approved (build in extra time for 100+ units).\n\n4. Delivery — straight to your office, or drop-shipped direct to recipients.\n\nMinimum order: [insert once confirmed]. Fully customisable packaging, ribbon, and card message. Want a mockup with [Company]'s actual branding? Send through your logo and I'll put one together — no cost, no obligation.",
    ctaLabel: "Request a mockup →",
  },
  {
    category: EmailTemplateCategory.EDM_SEQUENCE,
    sequencePosition: 4,
    segment: null,
    scenarioName: null,
    sendTimingNotes: "Timed to nearest occasion — see GiftingOccasion",
    subject: "Getting ahead of [Season] gifting",
    subjectAltHr: "Still planning [Wellbeing Week/Occasion]? Let's talk timing",
    subjectAltAgency: "Client gifting for [Season] — booking now to hit deadlines",
    subjectAltSales: "Beat the [Season] rush with gifts that actually get opened",
    preheader: "Lead times get tight closer to the date — here's the cut-off.",
    body: "Hi [First Name],\n\n[Occasion] is coming up, and bespoke orders need lead time — especially for larger quantities or custom packaging.\n\nTo have jars ready by [date], we'd need to lock in the brief by [cut-off date]. Keen to grab 15 minutes this week to sort the details before the calendar fills up?",
    ctaLabel: "Book a time before the rush →",
    notes: "Shift timing to the nearest GiftingOccasion row when sending",
  },
  {
    category: EmailTemplateCategory.EDM_SEQUENCE,
    sequencePosition: 5,
    segment: null,
    scenarioName: null,
    sendTimingNotes: "Day 25–30, or final email in sequence",
    subject: "Want to see (and taste) it first?",
    preheader: "Lowest-friction next step: a free sample, or a 15-minute call.",
    body: "Hi [First Name],\n\nNo hard sell here — just an easy way to see if this is a fit.\n\nI'll send a sample jar so you (and whoever else needs convincing) can see the quality and branding for yourselves. Or, if it's easier, grab 15 minutes and I'll talk through options tailored to [Company].\n\nEither way, zero obligation — just let me know which works.",
    ctaLabel: "Request a free sample →",
  },
  {
    category: EmailTemplateCategory.COLD_OUTREACH,
    sequencePosition: null,
    segment: LeadSegment.HR_WELLBEING_CULTURE,
    scenarioName: null,
    sendTimingNotes: "First touch, after identifying a genuine culture/wellbeing signal on LinkedIn or elsewhere",
    subject: "Quick idea for [Company]'s next wellbeing moment",
    body: "Hi [Name],\n\nI noticed [specific detail — recent culture award, LinkedIn post about a team event, wellbeing initiative]. Really loved what you're building around team culture.\n\nI run Sweet Disorder — we make custom, branded sweet jars and gift boxes designed to bring genuine joy (not another generic hamper). A few NZ teams use them for wellbeing weeks, milestones, and just-because moments.\n\nWould it be useful if I sent through a couple of ideas tailored to [Company]? No pressure either way — happy to just send a sample jar so you can see/taste it first.\n\nCheers,\nMolly\nChief Dream Officer, Sweet Disorder",
  },
  {
    category: EmailTemplateCategory.COLD_OUTREACH,
    sequencePosition: null,
    segment: LeadSegment.EVENT_MARKETING_AGENCY,
    scenarioName: null,
    sendTimingNotes: "First touch, after seeing a recent campaign or activation from the agency",
    subject: "White-label gifting for your next client activation",
    body: "Hi [Name],\n\nSaw [specific event/campaign they ran] — great execution. I imagine sourcing memorable, on-brand gifting for activations like that isn't always easy.\n\nI run Sweet Disorder — custom branded sweet jars/boxes that can go out fully white-labelled under your brand or your client's. Built for agencies who need something that doesn't look like everyone else's swag.\n\nWorth a quick chat about your upcoming pipeline? Happy to send a sample so you can see the quality first.\n\nCheers,\nMolly",
  },
  {
    category: EmailTemplateCategory.COLD_OUTREACH,
    sequencePosition: null,
    segment: LeadSegment.SALES_TEAM_CLIENT_GIFTING,
    scenarioName: null,
    sendTimingNotes: "First touch, general or after a referral/intro",
    subject: "A gift that gets the reply",
    body: "Hi [Name],\n\nFollowing up on outbound gifting that actually works — most corporate gifts get binned or forgotten. Sweet Disorder makes custom sweet jars designed to be memorable enough that they become the reason a prospect takes your next call.\n\nWant me to put together a quick mockup for [Company]'s branding?\n\nCheers,\nMolly",
  },
  {
    category: EmailTemplateCategory.RESPONSE_SCENARIO,
    sequencePosition: null,
    segment: null,
    scenarioName: "No response (Follow-up 1)",
    sendTimingNotes: "~4–5 days after initial outreach, no reply",
    subject: "Re: [original subject]",
    body: "Hi [Name], just floating this back up in case it got buried! Still happy to send a sample jar with zero obligation if useful.",
  },
  {
    category: EmailTemplateCategory.RESPONSE_SCENARIO,
    sequencePosition: null,
    segment: null,
    scenarioName: "No response (Follow-up 2 / breakup)",
    sendTimingNotes: "~10 days after Follow-up 1, still no reply",
    subject: "Should I close the loop?",
    body: "Hi [Name], I don't want to clutter your inbox — I'll assume the timing's not right and won't follow up again. If it's useful down the track, my door's always open: [link/contact]. Wishing you a great [season/quarter]!",
  },
  {
    category: EmailTemplateCategory.RESPONSE_SCENARIO,
    sequencePosition: null,
    segment: null,
    scenarioName: "Interested, wants info/pricing",
    sendTimingNotes: "Reply expresses interest or asks for details",
    subject: "Re: [original subject]",
    body: "Love it! Here's a quick overview of options and pricing: [attach/link]. To tailor it properly — roughly how many recipients, and any occasion in mind? Happy to jump on a 15-min call if easier: [booking link].",
  },
  {
    category: EmailTemplateCategory.RESPONSE_SCENARIO,
    sequencePosition: null,
    segment: null,
    scenarioName: "Interested but timing isn't right",
    sendTimingNotes: "Reply is positive but says 'not now'",
    subject: "Re: [original subject]",
    body: "Totally understand — timing is everything. When would be a better moment to check back in? I'll pop a reminder in and reach out then with something tailored.",
    notes: "Action: tag lead 'nurture — revisit [date]' and add to EDM list.",
  },
  {
    category: EmailTemplateCategory.RESPONSE_SCENARIO,
    sequencePosition: null,
    segment: null,
    scenarioName: "Not interested / declined",
    sendTimingNotes: "Clear no",
    subject: "Re: [original subject]",
    body: "No worries at all, appreciate you letting me know. If anything changes, I'm here — and if you know anyone else who might find this useful, always grateful for an intro. Have a great one!",
    notes: "Keep the tone warm — declines today are often yeses in six months.",
  },
  {
    category: EmailTemplateCategory.RESPONSE_SCENARIO,
    sequencePosition: null,
    segment: null,
    scenarioName: "Objection: budget/cost",
    sendTimingNotes: "Reply raises price as a concern",
    subject: "Re: [original subject]",
    body: "Fair call — happy to work within a range rather than a fixed package. What sort of per-person budget were you thinking? There's usually a version of this that fits most ranges without losing the 'wow' factor.",
  },
  {
    category: EmailTemplateCategory.RESPONSE_SCENARIO,
    sequencePosition: null,
    segment: null,
    scenarioName: "Objection: 'we already have a supplier'",
    sendTimingNotes: "Reply mentions an existing gifting supplier",
    subject: "Re: [original subject]",
    body: "Makes sense! Out of curiosity — is it something you're locked into, or open to mixing it up for a specific moment (like [upcoming occasion])? No pressure either way, just always keen to be the backup option if ever needed.",
  },
  {
    category: EmailTemplateCategory.RESPONSE_SCENARIO,
    sequencePosition: null,
    segment: null,
    scenarioName: "Requests a sample/portfolio",
    sendTimingNotes: "Reply asks to see the product first",
    subject: "Sample on its way!",
    body: "Great — I'll get a sample jar out to you this week. Can you confirm the best delivery address? Would also love to hear what resonates once you've seen it in person.",
  },
  {
    category: EmailTemplateCategory.RESPONSE_SCENARIO,
    sequencePosition: null,
    segment: null,
    scenarioName: "Requests a call/meeting",
    sendTimingNotes: "Reply asks to talk directly",
    subject: "Re: [original subject]",
    body: "Great — here's my booking link: [link], or let me know a couple of times that suit and I'll lock it in.",
  },
  {
    category: EmailTemplateCategory.RESPONSE_SCENARIO,
    sequencePosition: null,
    segment: null,
    scenarioName: "Post-quote follow-up",
    sendTimingNotes: "Quote sent, 4–5 days with no response",
    subject: "Any questions on the quote?",
    body: "Hi [Name], just checking whether the quote made sense or if you'd like anything adjusted (quantities, budget, timeline). Keen to make this easy to say yes to!",
  },
  {
    category: EmailTemplateCategory.RESPONSE_SCENARIO,
    sequencePosition: null,
    segment: null,
    scenarioName: "Post-sale thank you + referral/review ask",
    sendTimingNotes: "Immediately after successful delivery",
    subject: "Thank you — and one small favour",
    body: "Hi [Name], so glad these landed well with [Company]! If you have 30 seconds, a quick testimonial (or an intro to anyone else who might love this) would mean a lot as we grow the corporate side of Sweet Disorder. Already looking forward to the next one!",
  },
];

async function main() {
  const catalog = loadCatalog();
  console.log(`Loaded ${catalog.length} catalog rows from prisma/data/catalog.csv`);

  // -------------------------------------------------------------------------
  // Product ranges
  // -------------------------------------------------------------------------
  const rangeNames = [...new Set(catalog.map((row) => row.range))];
  const rangeByName = new Map<string, { id: string }>();

  for (const rangeName of rangeNames) {
    const skuPrefix = RANGE_SKU_PREFIXES[rangeName];
    if (!skuPrefix) {
      throw new Error(`No sku_prefix configured for range "${rangeName}"`);
    }
    const range = await prisma.productRange.upsert({
      where: { id: `seed-range-${skuPrefix}` },
      update: { name: rangeName, skuPrefix },
      create: { id: `seed-range-${skuPrefix}`, name: rangeName, skuPrefix },
    });
    rangeByName.set(rangeName, range);
  }
  console.log(`Seeded ${rangeByName.size} product ranges`);

  // -------------------------------------------------------------------------
  // Fillings (deduped by normalized/title-cased name - the raw catalog has
  // inconsistent casing for the same filling, e.g. "Black Balls" vs
  // "Black balls" vs "small Jelly Beans" vs "Small jelly beans")
  // -------------------------------------------------------------------------
  const fillingNames = [
    ...new Set(
      catalog
        .map((row) => row.filling)
        .filter((name): name is string => !!name)
        .map(titleCase),
    ),
  ].sort();

  const supplier = await prisma.supplier.upsert({
    where: { id: "seed-supplier-main" },
    update: {
      name: "Confectionery Ingredients Ltd",
      contactEmail: "orders@confectioneryingredients.example.com",
      contactPhone: "+64 9 555 0100",
      leadTimeDays: 14,
      notes: "Primary bulk filling/lolly supplier (seed data placeholder).",
    },
    create: {
      id: "seed-supplier-main",
      name: "Confectionery Ingredients Ltd",
      contactEmail: "orders@confectioneryingredients.example.com",
      contactPhone: "+64 9 555 0100",
      leadTimeDays: 14,
      notes: "Primary bulk filling/lolly supplier (seed data placeholder).",
    },
  });

  const fillingByName = new Map<string, { id: string }>();
  for (const name of fillingNames) {
    const filling = await prisma.filling.upsert({
      where: { name },
      update: { supplierId: supplier.id, unitOfPurchase: "kg" },
      create: { name, supplierId: supplier.id, unitOfPurchase: "kg" },
    });
    fillingByName.set(name, filling);

    await prisma.fillingInventory.upsert({
      where: { fillingId: filling.id },
      update: {},
      create: {
        fillingId: filling.id,
        quantityOnHand: randomInt(5, 60),
        portionsPerPurchaseUnit: 1000, // e.g. ~1000 pieces per kg purchase unit, adjust later
        reorderThreshold: 10,
        lastCountedAt: new Date(),
      },
    });
  }
  console.log(`Seeded ${fillingByName.size} distinct fillings (deduped, case-normalized)`);

  // -------------------------------------------------------------------------
  // Pricing tier (created before products so each product can get a
  // PricingTierProduct row in the same pass below)
  // -------------------------------------------------------------------------
  const pricingTier = await prisma.pricingTier.upsert({
    where: { id: "seed-pricing-tier-nz-standard" },
    update: { name: "NZ Standard Wholesale", region: Region.NZ },
    create: { id: "seed-pricing-tier-nz-standard", name: "NZ Standard Wholesale", region: Region.NZ },
  });

  // -------------------------------------------------------------------------
  // Products (+ inventory item + wholesale price per product)
  // -------------------------------------------------------------------------
  let productCount = 0;
  for (const row of catalog) {
    const range = rangeByName.get(row.range)!;
    const filling = row.filling ? fillingByName.get(titleCase(row.filling)) : null;

    // Every seeded product is wholesale-visible so the portal has a full
    // catalog to test against - Molly can narrow this down for real later.
    const product = row.sku
      ? await prisma.product.upsert({
          where: { sku: row.sku },
          update: {
            barcode: row.barcode,
            name: row.name,
            rangeId: range.id,
            packagingType: row.packagingType,
            fillingId: filling?.id,
            minOrderQty: row.minOrderQty,
            wholesaleVisible: true,
          },
          create: {
            sku: row.sku,
            barcode: row.barcode,
            name: row.name,
            rangeId: range.id,
            packagingType: row.packagingType,
            fillingId: filling?.id,
            minOrderQty: row.minOrderQty,
            wholesaleVisible: true,
          },
        })
      : await (async () => {
          // No SKU assigned yet - match on (range, name) so re-running the
          // seed doesn't create duplicates for skuless products.
          const existing = await prisma.product.findFirst({
            where: { rangeId: range.id, name: row.name, sku: null },
          });
          if (existing) {
            return prisma.product.update({
              where: { id: existing.id },
              data: {
                barcode: row.barcode,
                packagingType: row.packagingType,
                fillingId: filling?.id,
                minOrderQty: row.minOrderQty,
                wholesaleVisible: true,
              },
            });
          }
          return prisma.product.create({
            data: {
              sku: null,
              barcode: row.barcode,
              name: row.name,
              rangeId: range.id,
              packagingType: row.packagingType,
              fillingId: filling?.id,
              minOrderQty: row.minOrderQty,
              wholesaleVisible: true,
            },
          });
        })();

    await prisma.inventoryItem.upsert({
      where: { productId: product.id },
      update: {},
      create: {
        productId: product.id,
        quantityOnHand: randomInt(0, 200),
        reorderThreshold: 20,
        recommendedReorderQty: 100,
        supplierId: supplier.id,
        lastCountedAt: new Date(),
      },
    });

    // Don't overwrite a price someone's already set via Master Connect -
    // only fill it in the first time, same idempotency pattern as inventory
    // above.
    await prisma.pricingTierProduct.upsert({
      where: { pricingTierId_productId: { pricingTierId: pricingTier.id, productId: product.id } },
      update: {},
      create: {
        pricingTierId: pricingTier.id,
        productId: product.id,
        price: wholesalePriceFor(product.packagingType),
      },
    });

    productCount++;
  }
  console.log(`Seeded ${productCount} products (+ inventory items + NZ Standard wholesale prices)`);

  // -------------------------------------------------------------------------
  // Label compliance records - matched to products by name (case/whitespace
  // -insensitive), since most rows in the real compliance tracker have no
  // sku to match on. Where a row does carry a sku, it's used to verify the
  // name match rather than as the primary key. A catalog product with no
  // matching compliance row simply gets no LabelComplianceRecord - never
  // invented, per the "don't guess data that doesn't exist" rule used
  // throughout this seed script.
  // -------------------------------------------------------------------------
  const complianceRows = loadLabelCompliance();
  const allProducts = await prisma.product.findMany();
  const productsByNormalizedName = new Map<string, typeof allProducts>();
  for (const product of allProducts) {
    const key = product.name.trim().toLowerCase();
    const bucket = productsByNormalizedName.get(key) ?? [];
    bucket.push(product);
    productsByNormalizedName.set(key, bucket);
  }

  let complianceCount = 0;
  for (const row of complianceRows) {
    const matches = productsByNormalizedName.get(row.name.toLowerCase());
    if (!matches || matches.length === 0) {
      console.warn(`Label compliance: no product matches name "${row.name}" - skipping row`);
      continue;
    }
    if (matches.length > 1) {
      console.warn(
        `Label compliance: ambiguous match for name "${row.name}" (${matches.length} products) - skipping row`,
      );
      continue;
    }
    const product = matches[0];
    if (row.sku && product.sku && row.sku !== product.sku) {
      console.warn(
        `Label compliance: sku mismatch for "${row.name}" - CSV says ${row.sku}, product sku is ${product.sku} (using the name match anyway)`,
      );
    }

    await prisma.labelComplianceRecord.upsert({
      where: { id: `seed-compliance-${product.id}` },
      update: {
        allergenStatus: row.allergenStatus,
        allergenNotes: row.allergenNotes,
        addressStatus: row.addressStatus,
        countryOfOriginStatus: row.countryOfOriginStatus,
        nutritionBoxStatus: row.nutritionBoxStatus,
        labelsInStock: row.labelsInStock,
        urgency: row.urgency,
        lastReviewedAt: new Date(),
      },
      create: {
        id: `seed-compliance-${product.id}`,
        productId: product.id,
        allergenStatus: row.allergenStatus,
        allergenNotes: row.allergenNotes,
        addressStatus: row.addressStatus,
        countryOfOriginStatus: row.countryOfOriginStatus,
        nutritionBoxStatus: row.nutritionBoxStatus,
        labelsInStock: row.labelsInStock,
        urgency: row.urgency,
        lastReviewedAt: new Date(),
      },
    });
    complianceCount++;
  }
  console.log(`Seeded ${complianceCount} label compliance records (of ${complianceRows.length} CSV rows)`);

  // -------------------------------------------------------------------------
  // Wholesale customer, staff users
  // -------------------------------------------------------------------------
  await prisma.wholesaleCustomer.upsert({
    where: { email: "buyer@example-giftshop.co.nz" },
    update: {},
    create: {
      companyName: "Example Gift Shop Ltd",
      contactName: "Sam Buyer",
      email: "buyer@example-giftshop.co.nz",
      phone: "+64 21 555 0123",
      region: Region.NZ,
      // True in seed data specifically so the demo customer can exercise
      // the NZ/AU cart-splitting flow end to end.
      shipsToBothRegions: true,
      pricingTierId: pricingTier.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "molly@sweetdisorder.co.nz" },
    update: { role: UserRole.OWNER_ADMIN, active: true },
    create: {
      email: "molly@sweetdisorder.co.nz",
      name: "Molly",
      role: UserRole.OWNER_ADMIN,
      active: true,
    },
  });

  const employeePinHash = await hashPin("1234");
  await prisma.user.upsert({
    where: { email: "employee@sweetdisorder.co.nz" },
    update: { role: UserRole.EMPLOYEE, pinHash: employeePinHash, active: true },
    create: {
      email: "employee@sweetdisorder.co.nz",
      name: "Floor Staff Demo",
      role: UserRole.EMPLOYEE,
      pinHash: employeePinHash,
      active: true,
    },
  });
  console.log("Seeded pricing tier, wholesale customer, and two staff users (PIN for employee: 1234)");

  // -------------------------------------------------------------------------
  // Gifting occasions + email templates (stage 6) - real reference content
  // for Molly's Sales & Marketing dashboard. No SalesLead rows are seeded -
  // the business's real tracker has zero real leads yet (only a template
  // example row explicitly marked "delete before use"), so that table stays
  // empty until Molly adds real leads herself.
  // -------------------------------------------------------------------------
  for (const [index, occasion] of GIFTING_OCCASIONS.entries()) {
    const id = `seed-occasion-${index + 1}`;
    await prisma.giftingOccasion.upsert({
      where: { id },
      update: occasion,
      create: { id, ...occasion },
    });
  }
  console.log(`Seeded ${GIFTING_OCCASIONS.length} gifting occasions`);

  for (const [index, template] of EMAIL_TEMPLATES.entries()) {
    const id = `seed-template-${index + 1}`;
    await prisma.emailTemplate.upsert({
      where: { id },
      update: template,
      create: { id, ...template },
    });
  }
  console.log(`Seeded ${EMAIL_TEMPLATES.length} email templates`);

  // -------------------------------------------------------------------------
  // Product image backfill - pulls real photos from the live Shopify
  // storefront (sweetdisorder.co.nz/products.json) and matches them to our
  // Product rows by exact normalized name. Idempotent (skips any product
  // that already has imageBlobUrl set) and never throws - a network failure
  // here must never block the rest of the seed. See lib/products/image-backfill.ts.
  // -------------------------------------------------------------------------
  const imageBackfill = await backfillProductImages(prisma);
  console.log(
    `Product image backfill: ${imageBackfill.matchedAndUpdated} matched and updated, ` +
      `${imageBackfill.alreadyHadImage} already had an image, ` +
      `${imageBackfill.matchedButFailed.length} matched but failed to download/upload, ` +
      `${imageBackfill.unmatched.length} unmatched.`,
  );
  if (imageBackfill.matchedButFailed.length > 0) {
    console.log("  Matched but failed (network/upload error, will retry next seed run):");
    for (const { name, reason } of imageBackfill.matchedButFailed) {
      console.log(`    - ${name}: ${reason}`);
    }
  }
  if (imageBackfill.unmatched.length > 0) {
    console.log("  No confident match on the live site (expected for seasonal/internal-only items):");
    for (const name of imageBackfill.unmatched) {
      console.log(`    - ${name}`);
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
