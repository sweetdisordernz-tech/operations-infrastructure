-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER_ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('NZ', 'AU');

-- CreateEnum
CREATE TYPE "PackagingType" AS ENUM ('BOTTLE', 'JAR', 'TIN', 'STAND');

-- CreateEnum
CREATE TYPE "AllergenStatus" AS ENUM ('CORRECT', 'NEEDS_CHANGE_URGENT', 'NEEDS_CHANGE_NON_URGENT');

-- CreateEnum
CREATE TYPE "AddressStatus" AS ENUM ('CORRECT', 'INCORRECT');

-- CreateEnum
CREATE TYPE "CountryOfOriginStatus" AS ENUM ('CORRECT', 'INCORRECT');

-- CreateEnum
CREATE TYPE "NutritionBoxStatus" AS ENUM ('CORRECT', 'NEEDS_COLUMN_ADDED', 'INCORRECT');

-- CreateEnum
CREATE TYPE "LabelUrgency" AS ENUM ('TOP_PRIORITY_URGENT', 'URGENT_CHANGE_NEEDED', 'CHANGE_NEEDED_NOT_URGENT', 'NO_CHANGE_NEEDED');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('SHOPIFY', 'WHOLESALE_PORTAL');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'LABELLING', 'PACKING', 'DISPATCHED');

-- CreateEnum
CREATE TYPE "PaymentPhase" AS ENUM ('INVOICE', 'PORTAL_PAYMENT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('AWAITING_INVOICE', 'PAID');

-- CreateEnum
CREATE TYPE "OrderTaskStage" AS ENUM ('LABELLING', 'PACKING', 'DISPATCH');

-- CreateEnum
CREATE TYPE "OrderTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "SalesLeadStage" AS ENUM ('NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "IntegrationName" AS ENUM ('SHOPIFY', 'XERO', 'KLAVIYO', 'BREVO');

-- CreateEnum
CREATE TYPE "IntegrationDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "IntegrationSyncStatus" AS ENUM ('SUCCESS', 'FAILURE', 'PARTIAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "pin_hash" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wholesale_customers" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "region" "Region" NOT NULL,
    "pricing_tier_id" TEXT,
    "shopify_customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wholesale_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_tiers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" "Region" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magic_link_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "user_id" TEXT,
    "wholesale_customer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "magic_link_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_ranges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku_prefix" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_ranges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fillings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplier_id" TEXT,
    "unit_of_purchase" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fillings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filling_inventory" (
    "id" TEXT NOT NULL,
    "filling_id" TEXT NOT NULL,
    "quantity_on_hand" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "portions_per_purchase_unit" DECIMAL(65,30),
    "reorder_threshold" DECIMAL(65,30),
    "last_counted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filling_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "range_id" TEXT NOT NULL,
    "packaging_type" "PackagingType" NOT NULL,
    "filling_id" TEXT,
    "min_order_qty" INTEGER NOT NULL DEFAULT 1,
    "image_blob_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "discontinued" BOOLEAN NOT NULL DEFAULT false,
    "wholesale_visible" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "lead_time_days" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity_on_hand" INTEGER NOT NULL DEFAULT 0,
    "reorder_threshold" INTEGER,
    "recommended_reorder_qty" INTEGER,
    "supplier_id" TEXT,
    "last_counted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "label_compliance_records" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "allergen_status" "AllergenStatus" NOT NULL,
    "allergen_notes" TEXT,
    "address_status" "AddressStatus" NOT NULL,
    "country_of_origin_status" "CountryOfOriginStatus" NOT NULL,
    "nutrition_box_status" "NutritionBoxStatus" NOT NULL,
    "labels_in_stock" INTEGER,
    "urgency" "LabelUrgency" NOT NULL,
    "last_reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "label_compliance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "source" "OrderSource" NOT NULL,
    "wholesale_customer_id" TEXT,
    "shopify_order_id" TEXT,
    "region" "Region" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "payment_phase" "PaymentPhase" NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL,
    "total_amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "placed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_line_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_tasks" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "stage" "OrderTaskStage" NOT NULL,
    "status" "OrderTaskStatus" NOT NULL DEFAULT 'PENDING',
    "assigned_employee_id" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_labour_logs" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hours_worked" DECIMAL(65,30) NOT NULL,
    "order_task_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_labour_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_leads" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_name" TEXT,
    "email" TEXT,
    "stage" "SalesLeadStage" NOT NULL DEFAULT 'NEW',
    "source" TEXT,
    "notes" TEXT,
    "owner_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_sync_logs" (
    "id" TEXT NOT NULL,
    "integration" "IntegrationName" NOT NULL,
    "direction" "IntegrationDirection" NOT NULL,
    "status" "IntegrationSyncStatus" NOT NULL,
    "payload_summary" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wholesale_customers_email_key" ON "wholesale_customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wholesale_customers_shopify_customer_id_key" ON "wholesale_customers"("shopify_customer_id");

-- CreateIndex
CREATE INDEX "wholesale_customers_pricing_tier_id_idx" ON "wholesale_customers"("pricing_tier_id");

-- CreateIndex
CREATE UNIQUE INDEX "magic_link_tokens_token_hash_key" ON "magic_link_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "magic_link_tokens_email_idx" ON "magic_link_tokens"("email");

-- CreateIndex
CREATE INDEX "magic_link_tokens_user_id_idx" ON "magic_link_tokens"("user_id");

-- CreateIndex
CREATE INDEX "magic_link_tokens_wholesale_customer_id_idx" ON "magic_link_tokens"("wholesale_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "fillings_name_key" ON "fillings"("name");

-- CreateIndex
CREATE INDEX "fillings_supplier_id_idx" ON "fillings"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "filling_inventory_filling_id_key" ON "filling_inventory"("filling_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_range_id_idx" ON "products"("range_id");

-- CreateIndex
CREATE INDEX "products_filling_id_idx" ON "products"("filling_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_product_id_key" ON "inventory_items"("product_id");

-- CreateIndex
CREATE INDEX "inventory_items_supplier_id_idx" ON "inventory_items"("supplier_id");

-- CreateIndex
CREATE INDEX "label_compliance_records_product_id_idx" ON "label_compliance_records"("product_id");

-- CreateIndex
CREATE INDEX "label_compliance_records_urgency_idx" ON "label_compliance_records"("urgency");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_shopify_order_id_key" ON "orders"("shopify_order_id");

-- CreateIndex
CREATE INDEX "orders_wholesale_customer_id_idx" ON "orders"("wholesale_customer_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "order_line_items_order_id_idx" ON "order_line_items"("order_id");

-- CreateIndex
CREATE INDEX "order_line_items_product_id_idx" ON "order_line_items"("product_id");

-- CreateIndex
CREATE INDEX "order_tasks_order_id_idx" ON "order_tasks"("order_id");

-- CreateIndex
CREATE INDEX "order_tasks_assigned_employee_id_idx" ON "order_tasks"("assigned_employee_id");

-- CreateIndex
CREATE INDEX "order_tasks_status_idx" ON "order_tasks"("status");

-- CreateIndex
CREATE INDEX "employee_labour_logs_employee_id_idx" ON "employee_labour_logs"("employee_id");

-- CreateIndex
CREATE INDEX "employee_labour_logs_order_task_id_idx" ON "employee_labour_logs"("order_task_id");

-- CreateIndex
CREATE INDEX "employee_labour_logs_date_idx" ON "employee_labour_logs"("date");

-- CreateIndex
CREATE INDEX "sales_leads_owner_user_id_idx" ON "sales_leads"("owner_user_id");

-- CreateIndex
CREATE INDEX "sales_leads_email_idx" ON "sales_leads"("email");

-- CreateIndex
CREATE INDEX "sales_leads_stage_idx" ON "sales_leads"("stage");

-- CreateIndex
CREATE INDEX "integration_sync_logs_integration_idx" ON "integration_sync_logs"("integration");

-- CreateIndex
CREATE INDEX "integration_sync_logs_status_idx" ON "integration_sync_logs"("status");

-- AddForeignKey
ALTER TABLE "wholesale_customers" ADD CONSTRAINT "wholesale_customers_pricing_tier_id_fkey" FOREIGN KEY ("pricing_tier_id") REFERENCES "pricing_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_link_tokens" ADD CONSTRAINT "magic_link_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_link_tokens" ADD CONSTRAINT "magic_link_tokens_wholesale_customer_id_fkey" FOREIGN KEY ("wholesale_customer_id") REFERENCES "wholesale_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fillings" ADD CONSTRAINT "fillings_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filling_inventory" ADD CONSTRAINT "filling_inventory_filling_id_fkey" FOREIGN KEY ("filling_id") REFERENCES "fillings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_range_id_fkey" FOREIGN KEY ("range_id") REFERENCES "product_ranges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_filling_id_fkey" FOREIGN KEY ("filling_id") REFERENCES "fillings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "label_compliance_records" ADD CONSTRAINT "label_compliance_records_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_wholesale_customer_id_fkey" FOREIGN KEY ("wholesale_customer_id") REFERENCES "wholesale_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_tasks" ADD CONSTRAINT "order_tasks_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_tasks" ADD CONSTRAINT "order_tasks_assigned_employee_id_fkey" FOREIGN KEY ("assigned_employee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_labour_logs" ADD CONSTRAINT "employee_labour_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_labour_logs" ADD CONSTRAINT "employee_labour_logs_order_task_id_fkey" FOREIGN KEY ("order_task_id") REFERENCES "order_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_leads" ADD CONSTRAINT "sales_leads_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

