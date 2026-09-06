-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PackagingType" ADD VALUE 'BADGE';
ALTER TYPE "PackagingType" ADD VALUE 'MUG';
ALTER TYPE "PackagingType" ADD VALUE 'RING';
ALTER TYPE "PackagingType" ADD VALUE 'BOX';

-- AlterTable
ALTER TABLE "pricing_tiers" ADD COLUMN     "minimum_order_value" DECIMAL(65,30);

