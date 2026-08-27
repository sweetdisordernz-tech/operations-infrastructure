import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getNextDispatchOrder } from "@/lib/tasks/dispatch";
import { BigSubmitButton } from "@/app/_components/big-submit-button";
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
              <form action={completeDispatchAction}>
                <input type="hidden" name="orderId" value={order.orderId} />
                <BigSubmitButton pendingLabel="Marking done...">Mark all done</BigSubmitButton>
              </form>
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
