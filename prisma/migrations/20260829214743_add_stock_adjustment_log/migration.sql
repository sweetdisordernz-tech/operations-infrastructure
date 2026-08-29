-- CreateTable
CREATE TABLE "stock_adjustment_logs" (
    "id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "changed_by_user_id" TEXT NOT NULL,
    "previous_quantity" INTEGER NOT NULL,
    "new_quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_adjustment_logs_inventory_item_id_idx" ON "stock_adjustment_logs"("inventory_item_id");

-- CreateIndex
CREATE INDEX "stock_adjustment_logs_changed_by_user_id_idx" ON "stock_adjustment_logs"("changed_by_user_id");

-- AddForeignKey
ALTER TABLE "stock_adjustment_logs" ADD CONSTRAINT "stock_adjustment_logs_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment_logs" ADD CONSTRAINT "stock_adjustment_logs_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

