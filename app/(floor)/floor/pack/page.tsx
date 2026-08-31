import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getNextPackingOrder } from "@/lib/tasks/packing";
import { getCompletedTodayCount } from "@/lib/tasks/shared";
import { TaskActionForm } from "@/app/_components/task-action-form";
import { OrderTaskLineItemList } from "@/app/_components/order-task-line-item-list";
import { completePackingAction } from "./actions";

// Always render per-request (never statically prerendered at build time).
export const dynamic = "force-dynamic";

export default async function PackPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [order, completedToday] = await Promise.all([
    getNextPackingOrder(),
    getCompletedTodayCount("PACKING", user.id),
  ]);

  return (
    <div className="sd-shell sd-shell--pack">
      <div className="sd-floor-header">
        <span className="sd-floor-logo">Sweet Disorder</span>
        <h1>Packing</h1>
      </div>
      <main className="sd-main">
        <div className="sd-task-wrap">
          <div className="sd-completed-today">
            <span className="sd-completed-today-number">{completedToday}</span>
            <span className="sd-completed-today-label">Completed today</span>
          </div>
          {order ? (
            <div className="sd-task-card">
              <Package className="sd-task-icon" aria-hidden="true" />
              <p className="sd-task-order">Order {order.orderNumber}</p>
              <OrderTaskLineItemList lineItems={order.lineItems} />
              <TaskActionForm
                action={completePackingAction}
                hiddenFields={{ orderId: order.orderId }}
                buttonLabel="Mark all done"
                pendingLabel="Marking done..."
              />
            </div>
          ) : (
            <div className="sd-task-card">
              <CheckCircle2 className="sd-task-icon" aria-hidden="true" />
              <p className="sd-task-product">No tasks right now</p>
              <p className="sd-task-meta">Nothing ready to pack. Nice work.</p>
            </div>
          )}
          <p className="sd-switch-station">
            <Link href="/">Switch station</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
