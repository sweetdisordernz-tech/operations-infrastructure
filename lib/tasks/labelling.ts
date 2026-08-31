import { prisma } from "@/lib/db";
import type { PackagingType } from "@prisma/client";

/**
 * Labelling & filling is deliberately organized by PRODUCT across every
 * pending order, not order-by-order - filling 50 Bear Hugs in one pass is
 * faster than switching products 10 times because 10 different orders each
 * happen to want some. Packing/Dispatch (see packing.ts/dispatch.ts) stay
 * strictly per-order.
 */

export type LabellingBatch = {
  productId: string;
  productName: string;
  packagingType: PackagingType;
  fillingName: string | null;
  imageBlobUrl: string | null;
  totalQuantity: number;
  orderCount: number;
};

export type PendingLabellingItem = {
  quantity: number;
  product: {
    id: string;
    name: string;
    packagingType: PackagingType;
    filling: { name: string } | null;
    imageBlobUrl: string | null;
  };
  order: { id: string; placedAt: Date };
};

/**
 * Pure grouping/sorting logic, factored out from the DB query so it's
 * testable without a live connection: group pending line items by product
 * (summing quantity, counting distinct orders), then rank groups by their
 * oldest contributing order so no order waits forever behind newer ones.
 * Exported for tests; getNextLabellingBatch() is what callers should use.
 */
export function rankLabellingBatches(items: PendingLabellingItem[]): LabellingBatch[] {
  type Group = LabellingBatch & { orderIds: Set<string>; earliestPlacedAt: Date };
  const groups = new Map<string, Group>();

  for (const item of items) {
    const { product, order, quantity } = item;
    let group = groups.get(product.id);
    if (!group) {
      group = {
        productId: product.id,
        productName: product.name,
        packagingType: product.packagingType,
        fillingName: product.filling?.name ?? null,
        imageBlobUrl: product.imageBlobUrl,
        totalQuantity: 0,
        orderCount: 0,
        orderIds: new Set(),
        earliestPlacedAt: order.placedAt,
      };
      groups.set(product.id, group);
    }
    group.totalQuantity += quantity;
    group.orderIds.add(order.id);
    if (order.placedAt < group.earliestPlacedAt) group.earliestPlacedAt = order.placedAt;
  }

  return [...groups.values()]
    .sort((a, b) => a.earliestPlacedAt.getTime() - b.earliestPlacedAt.getTime())
    .map((group) => ({
      productId: group.productId,
      productName: group.productName,
      packagingType: group.packagingType,
      fillingName: group.fillingName,
      imageBlobUrl: group.imageBlobUrl,
      totalQuantity: group.totalQuantity,
      orderCount: group.orderIds.size,
    }));
}

/**
 * The current single highest-priority product batch to work on: every
 * PENDING OrderTaskLineItem across every order's LABELLING task, grouped by
 * product, oldest contributing order first.
 */
export async function getNextLabellingBatch(): Promise<LabellingBatch | null> {
  const pendingItems = await prisma.orderTaskLineItem.findMany({
    where: { status: "PENDING", orderTask: { stage: "LABELLING" } },
    include: {
      orderLineItem: {
        include: {
          product: { include: { filling: true } },
          order: { select: { id: true, placedAt: true } },
        },
      },
    },
  });

  const items: PendingLabellingItem[] = pendingItems.map((item) => ({
    quantity: item.orderLineItem.quantity,
    product: item.orderLineItem.product,
    order: item.orderLineItem.order,
  }));

  const [top] = rankLabellingBatches(items);
  return top ?? null;
}

export type CompleteLabellingBatchResult = {
  itemsCompleted: number;
  ordersCompleted: number;
};

/**
 * Marks every currently-pending OrderTaskLineItem for this product DONE,
 * then flips any LABELLING OrderTask that now has zero pending line items
 * to DONE too - which is what makes PACKING claimable for that order. Can
 * complete zero, one, or several orders' labelling in one call; that's
 * expected, not a bug.
 */
export async function completeLabellingBatch(
  productId: string,
  employeeId: string,
): Promise<CompleteLabellingBatchResult> {
  return prisma.$transaction(async (tx) => {
    const pendingItems = await tx.orderTaskLineItem.findMany({
      where: {
        status: "PENDING",
        orderTask: { stage: "LABELLING" },
        orderLineItem: { productId },
      },
      select: { id: true, orderTaskId: true },
    });

    if (pendingItems.length === 0) {
      return { itemsCompleted: 0, ordersCompleted: 0 };
    }

    const itemIds = pendingItems.map((item) => item.id);
    const taskIds = [...new Set(pendingItems.map((item) => item.orderTaskId))];

    await tx.orderTaskLineItem.updateMany({
      where: { id: { in: itemIds } },
      data: { status: "DONE", completedAt: new Date() },
    });

    const stillPending = await tx.orderTaskLineItem.groupBy({
      by: ["orderTaskId"],
      where: { orderTaskId: { in: taskIds }, status: "PENDING" },
      _count: true,
    });
    const stillPendingTaskIds = new Set(stillPending.map((row) => row.orderTaskId));
    const completedTaskIds = taskIds.filter((id) => !stillPendingTaskIds.has(id));

    if (completedTaskIds.length > 0) {
      await tx.orderTask.updateMany({
        where: { id: { in: completedTaskIds } },
        data: { status: "DONE", completedAt: new Date(), assignedEmployeeId: employeeId },
      });
    }

    return { itemsCompleted: itemIds.length, ordersCompleted: completedTaskIds.length };
  });
}
