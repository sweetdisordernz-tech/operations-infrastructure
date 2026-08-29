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
} from "@prisma/client";
import { hashPin } from "../lib/auth/pin";

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
