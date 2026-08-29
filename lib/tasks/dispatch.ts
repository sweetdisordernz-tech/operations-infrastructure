import { prisma } from "@/lib/db";
import { sendDispatchConfirmationEmail } from "@/lib/email";
import { getNextOrderForStage, completeOrderTask, type OrderForTask } from "@/lib/tasks/shared";

export type DispatchableOrder = OrderForTask;

/** Next order whose PACKING task is DONE and DISPATCH is PENDING. */
export function getNextDispatchOrder(): Promise<DispatchableOrder | null> {
  return getNextOrderForStage("DISPATCH", "PACKING");
}

/**
 * Marks DISPATCH done and the order itself as DISPATCHED, in one
 * transaction. Once that's committed, wholesale orders get a dispatch
 * confirmation email (brief Section 6.4/14) - Shopify orders already get
 * their own dispatch notification from Shopify itself, so this never fires
 * for those. The email send happens after the transaction, not inside it -
 * an external API call has no business holding a DB transaction open, and
 * a failed send must never undo/block the dispatch completion itself.
 */
export async function completeDispatchTask(orderId: string, employeeId: string): Promise<void> {
  await completeOrderTask(orderId, "DISPATCH", "PACKING", employeeId, async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "DISPATCHED" } });
  });

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { wholesaleCustomer: true },
    });

    if (order?.source === "WHOLESALE_PORTAL" && order.wholesaleCustomer) {
      await sendDispatchConfirmationEmail(order.wholesaleCustomer.email, order.wholesaleCustomer.contactName, {
        orderNumber: order.orderNumber,
        region: order.region,
        currency: order.currency,
        totalAmount: Number(order.totalAmount),
      });
    }
  } catch (err) {
    console.error(`Failed to send dispatch confirmation for order ${orderId}:`, err);
  }
}
