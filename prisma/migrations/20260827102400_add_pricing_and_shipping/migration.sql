-- AlterTable
ALTER TABLE "wholesale_customers" ADD COLUMN     "ships_to_both_regions" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "pricing_tier_products" (
    "id" TEXT NOT NULL,
    "pricing_tier_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_tier_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pricing_tier_products_product_id_idx" ON "pricing_tier_products"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_tier_products_pricing_tier_id_product_id_key" ON "pricing_tier_products"("pricing_tier_id", "product_id");

-- AddForeignKey
ALTER TABLE "pricing_tier_products" ADD CONSTRAINT "pricing_tier_products_pricing_tier_id_fkey" FOREIGN KEY ("pricing_tier_id") REFERENCES "pricing_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_tier_products" ADD CONSTRAINT "pricing_tier_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

