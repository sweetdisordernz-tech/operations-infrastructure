import { prisma } from "@/lib/db";
import type { OrderStatus, OrderTaskStage, PaymentStatus, Region } from "@prisma/client";

/**
 * Order history for the wholesale portal - always scoped by customerId at
 * the query level (never returns another customer's orders, regardless of
 * what a caller might otherwise ask for), and only surfaces a three-step
 * progress indicator derived from OrderTask rows, not the floor app's
 * internal per-line-item labelling/batching mechanics.
 */

export type CustomerOrderSummary = {
  id: string;
  orderNumber: string;
  region: Region;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  currency: string;
  placedAt: Date;
  steps: Array<{ stage: OrderTaskStage; done: boolean }>;
  lineItems: Array<{ productName: string; quantity: number; unitPrice: number }>;
};

const STEP_STAGES: OrderTaskStage[] = ["LABELLING", "PACKING", "DISPATCH"];

export async function getCustomerOrders(customerId: string): Promise<CustomerOrderSummary[]> {
  const orders = await prisma.order.findMany({
    where: { wholesaleCustomerId: customerId },
    orderBy: { placedAt: "desc" },
    include: {
      tasks: { select: { stage: true, status: true } },
      lineItems: { include: { product: { select: { name: true } } } },
    },
  });

  return orders.map((order) => {
    const statusByStage = new Map(order.tasks.map((task) => [task.stage, task.status]));

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      region: order.region,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      placedAt: order.placedAt,
      steps: STEP_STAGES.map((stage) => ({ stage, done: statusByStage.get(stage) === "DONE" })),
      lineItems: order.lineItems.map((lineItem) => ({
        productName: lineItem.product.name,
        quantity: lineItem.quantity,
        unitPrice: Number(lineItem.unitPrice),
      })),
    };
  });
}
