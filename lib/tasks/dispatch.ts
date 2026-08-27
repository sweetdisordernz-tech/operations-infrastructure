import { getNextOrderForStage, completeOrderTask, type OrderForTask } from "@/lib/tasks/shared";

export type DispatchableOrder = OrderForTask;

/** Next order whose PACKING task is DONE and DISPATCH is PENDING. */
export function getNextDispatchOrder(): Promise<DispatchableOrder | null> {
  return getNextOrderForStage("DISPATCH", "PACKING");
}

/** Marks DISPATCH done and the order itself as DISPATCHED, in one transaction. */
export function completeDispatchTask(orderId: string, employeeId: string): Promise<void> {
  return completeOrderTask(orderId, "DISPATCH", "PACKING", employeeId, async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "DISPATCHED" } });
  });
}
