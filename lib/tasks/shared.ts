import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { OrderTaskStage, PackagingType, Region, Prisma } from "@prisma/client";

/**
 * Shared "next order for this stage" / "complete this stage's task" logic
 * used by both packing.ts and dispatch.ts - both stages are strictly
 * per-order (unlike labelling, which is batched by product) and follow the
 * identical shape: one order at a time, gated on the previous stage being
 * DONE.
 */

export type OrderForTask = {
  orderId: string;
  orderNumber: string;
  region: Region;
  lineItems: Array<{
    id: string;
    productName: string;
    packagingType: PackagingType;
    fillingName: string | null;
    quantity: number;
  }>;
};

export async function getNextOrderForStage(
  stage: OrderTaskStage,
  prerequisiteStage: OrderTaskStage,
): Promise<OrderForTask | null> {
  const task = await prisma.orderTask.findFirst({
    where: {
      stage,
      status: "PENDING",
      order: { tasks: { some: { stage: prerequisiteStage, status: "DONE" } } },
    },
    orderBy: { order: { placedAt: "asc" } },
    include: {
      order: {
        include: {
          lineItems: { include: { product: { include: { filling: true } } } },
        },
      },
    },
  });

  if (!task) return null;

  return {
    orderId: task.order.id,
    orderNumber: task.order.orderNumber,
    region: task.order.region,
    lineItems: task.order.lineItems.map((lineItem) => ({
      id: lineItem.id,
      productName: lineItem.product.name,
      packagingType: lineItem.product.packagingType,
      fillingName: lineItem.product.filling?.name ?? null,
      quantity: lineItem.quantity,
    })),
  };
}

export class TaskGatingError extends Error {}

/** For API route catch blocks: turns a TaskGatingError into a 409, or returns null for anything else. */
export function gatingErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof TaskGatingError) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }
  return null;
}

/**
 * Marks the `stage` OrderTask for this order DONE, after re-checking (not
 * just trusting the UI/a stale "next order" read) that the prerequisite
 * stage is actually DONE for this order. `onComplete` runs in the same
 * transaction for stage-specific side effects (dispatch sets Order.status).
 */
export async function completeOrderTask(
  orderId: string,
  stage: OrderTaskStage,
  prerequisiteStage: OrderTaskStage,
  employeeId: string,
  onComplete?: (tx: Prisma.TransactionClient) => Promise<void>,
): Promise<void> {
  const [task, prerequisite] = await Promise.all([
    prisma.orderTask.findFirst({ where: { orderId, stage } }),
    prisma.orderTask.findFirst({ where: { orderId, stage: prerequisiteStage } }),
  ]);

  if (!task) throw new TaskGatingError(`No ${stage} task found for this order`);
  if (task.status !== "PENDING") throw new TaskGatingError(`${stage} is not pending for this order`);
  if (!prerequisite || prerequisite.status !== "DONE") {
    throw new TaskGatingError(`${prerequisiteStage} must be completed before ${stage}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderTask.update({
      where: { id: task.id },
      data: { status: "DONE", completedAt: new Date(), assignedEmployeeId: employeeId },
    });
    if (onComplete) await onComplete(tx);
  });
}
