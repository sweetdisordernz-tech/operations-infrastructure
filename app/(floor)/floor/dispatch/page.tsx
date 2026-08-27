import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getNextDispatchOrder } from "@/lib/tasks/dispatch";
import { TaskActionForm } from "@/app/_components/task-action-form";
import { OrderTaskLineItemList } from "@/app/_components/order-task-line-item-list";
import { completeDispatchAction } from "./actions";

export default async function DispatchPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const order = await getNextDispatchOrder();

  return (
    <div className="sd-shell">
      <div className="sd-floor-header">
        <h1>Dispatch</h1>
      </div>
      <main className="sd-main">
        <div className="sd-task-wrap">
          {order ? (
            <div className="sd-task-card">
              <p className="sd-task-order">Order {order.orderNumber}</p>
              <OrderTaskLineItemList lineItems={order.lineItems} />
              <TaskActionForm
                action={completeDispatchAction}
                hiddenFields={{ orderId: order.orderId }}
                buttonLabel="Mark all done"
                pendingLabel="Marking done..."
              />
            </div>
          ) : (
            <div className="sd-task-card">
              <p className="sd-task-product">No tasks right now</p>
              <p className="sd-task-meta">Nothing ready to dispatch. Nice work.</p>
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
