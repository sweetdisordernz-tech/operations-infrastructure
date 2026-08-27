import { getNextOrderForStage, completeOrderTask, type OrderForTask } from "@/lib/tasks/shared";

export type PackableOrder = OrderForTask;

/** Next order whose LABELLING task is DONE and PACKING is PENDING. */
export function getNextPackingOrder(): Promise<PackableOrder | null> {
  return getNextOrderForStage("PACKING", "LABELLING");
}

/** Marks the whole PACKING task done - no line-item-level tracking here, unlike labelling. */
export function completePackingTask(orderId: string, employeeId: string): Promise<void> {
  return completeOrderTask(orderId, "PACKING", "LABELLING", employeeId);
}
