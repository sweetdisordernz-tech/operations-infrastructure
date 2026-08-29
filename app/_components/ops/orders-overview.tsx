"use client";

import { useEffect, useState } from "react";

type ApiOrder = {
  id: string;
  orderNumber: string;
  source: "SHOPIFY" | "WHOLESALE_PORTAL";
  status: "PENDING" | "LABELLING" | "PACKING" | "DISPATCHED";
  placedAt: string;
  wholesaleCustomer: { id: string; companyName: string } | null;
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "sd-badge-neutral",
  LABELLING: "sd-badge-info",
  PACKING: "sd-badge-warning",
  DISPATCHED: "sd-badge-success",
};

export function OpsOrdersOverview() {
  const [orders, setOrders] = useState<ApiOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/orders?limit=200")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((data) => setOrders(data.orders))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load orders."));
  }, []);

  if (error) return <p className="sd-action-error">{error}</p>;
  if (!orders) return <p className="sd-empty-state">Loading orders...</p>;

  const stuckAtLabelling = orders.filter((o) => o.status === "LABELLING");
  const waitingOnDispatch = orders.filter((o) => o.status === "PACKING");
  const notYetStarted = orders.filter((o) => o.status === "PENDING");
  const activeOrders = orders.filter((o) => o.status !== "DISPATCHED");

  return (
    <>
      <div className="sd-stat-row" style={{ marginBottom: "1.5rem" }}>
        <div className="sd-stat">
          <span className="sd-stat-number">{waitingOnDispatch.length}</span>
          <span className="sd-stat-label">Waiting on dispatch</span>
        </div>
        <div className="sd-stat">
          <span className="sd-stat-number">{stuckAtLabelling.length}</span>
          <span className="sd-stat-label">Stuck at labelling</span>
        </div>
        <div className="sd-stat">
          <span className="sd-stat-number">{notYetStarted.length}</span>
          <span className="sd-stat-label">Not yet started</span>
        </div>
      </div>

      {activeOrders.length === 0 ? (
        <p className="sd-empty-state">Nothing needs action right now - every order is dispatched.</p>
      ) : (
        <div className="sd-table-wrap">
          <table className="sd-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Source</th>
                <th>Status</th>
                <th>Placed</th>
              </tr>
            </thead>
            <tbody>
              {activeOrders.map((order) => (
                <tr key={order.id}>
                  <td className="sd-table-name">{order.orderNumber}</td>
                  <td className="sd-table-sub">
                    {order.source === "SHOPIFY" ? "Shopify" : order.wholesaleCustomer?.companyName ?? "Wholesale"}
                  </td>
                  <td>
                    <span className={`sd-badge ${STATUS_BADGE[order.status]}`}>{order.status}</span>
                  </td>
                  <td>{new Date(order.placedAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
