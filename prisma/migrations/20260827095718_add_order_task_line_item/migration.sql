-- CreateEnum
CREATE TYPE "OrderTaskLineItemStatus" AS ENUM ('PENDING', 'DONE');

-- CreateTable
CREATE TABLE "order_task_line_items" (
    "id" TEXT NOT NULL,
    "order_task_id" TEXT NOT NULL,
    "order_line_item_id" TEXT NOT NULL,
    "status" "OrderTaskLineItemStatus" NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_task_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_task_line_items_order_line_item_id_key" ON "order_task_line_items"("order_line_item_id");

-- CreateIndex
CREATE INDEX "order_task_line_items_order_task_id_idx" ON "order_task_line_items"("order_task_id");

-- CreateIndex
CREATE INDEX "order_task_line_items_status_idx" ON "order_task_line_items"("status");

-- AddForeignKey
ALTER TABLE "order_task_line_items" ADD CONSTRAINT "order_task_line_items_order_task_id_fkey" FOREIGN KEY ("order_task_id") REFERENCES "order_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_task_line_items" ADD CONSTRAINT "order_task_line_items_order_line_item_id_fkey" FOREIGN KEY ("order_line_item_id") REFERENCES "order_line_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

