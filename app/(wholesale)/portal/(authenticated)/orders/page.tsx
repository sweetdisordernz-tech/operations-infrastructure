import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { getCurrentWholesaleCustomer } from "@/lib/auth/current-user";
import { getCustomerOrders } from "@/lib/wholesale/orders";
import { OrderStepIndicator } from "@/app/_components/order-step-indicator";
import { PortalBottomNav } from "@/app/_components/portal-bottom-nav";
import { PortalHeader } from "@/app/_components/portal-header";
import { PortalFooter } from "@/app/_components/portal-footer";

export default async function OrdersPage() {
  const customer = await getCurrentWholesaleCustomer();
  if (!customer) redirect("/login");
  const orders = await getCustomerOrders(customer.id);

  return (
    <div className="sd-portal-shell">
      <PortalHeader companyName={customer.companyName} title="Order history" />
      <div className="sd-portal-body">
        {orders.length === 0 ? (
          <div className="sd-reorder-empty">
            <ClipboardList aria-hidden="true" size={22} />
            <p>No orders yet - anything you place will show up here.</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="sd-order-card">
              <div className="sd-order-card-top">
                <span className="sd-order-number">{order.orderNumber}</span>
                <span className="sd-order-date">
                  {order.placedAt.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <p className="sd-order-lines">
                {order.lineItems.map((li) => `${li.quantity}× ${li.productName}`).join(", ")}
              </p>
              <div className="sd-product-row">
                <span className="sd-product-price">
                  {order.currency} ${order.totalAmount.toFixed(2)}
                </span>
                <span className="sd-note" style={{ margin: 0 }}>
                  {order.region} · {order.paymentStatus === "PAID" ? "Paid" : "Awaiting invoice"}
                </span>
              </div>
              <OrderStepIndicator steps={order.steps} />
            </div>
          ))
        )}
      </div>
      <PortalFooter />
      <PortalBottomNav />
    </div>
  );
}
