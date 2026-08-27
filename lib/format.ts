import type { PackagingType } from "@prisma/client";

const PACKAGING_TYPE_LABELS: Record<PackagingType, string> = {
  BOTTLE: "Bottle",
  JAR: "Jar",
  TIN: "Tin",
  STAND: "Stand",
};

export function formatPackagingType(type: PackagingType): string {
  return PACKAGING_TYPE_LABELS[type];
}
