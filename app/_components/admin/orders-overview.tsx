"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ApiOrder = {
  id: string;
  orderNumber: string;
  source: "SHOPIFY" | "WHOLESALE_PORTAL";
  region: "NZ" | "AU";
  status: "PENDING" | "LABELLING" | "PACKING" | "DISPATCHED";
  paymentPhase: "INVOICE" | "PORTAL_PAYMENT";
  paymentStatus: "AWAITING_INVOICE" | "PAID";
  totalAmount: string;
  currency: string;
  placedAt: string;
  wholesaleCustomer: { id: string; companyName: string } | null;
  lineItemCount: number;
  tasks: Array<{ stage: string; status: string }>;
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "sd-badge-neutral",
  LABELLING: "sd-badge-info",
  PACKING: "sd-badge-info",
  DISPATCHED: "sd-badge-success",
};

export function OrdersOverview() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const region = searchParams.get("region") ?? "";
  const source = searchParams.get("source") ?? "";

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (region) params.set("region", region);
    if (source) params.set("source", source);

    try {
      const res = await fetch(`/api/orders?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      const data = await res.json();
      setOrders(data.orders);
      setTotal(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, [status, region, source]);

  useEffect(() => {
    load();
  }, [load]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`/orders?${params.toString()}`);
  }

  return (
    <div className="sd-panel">
      <div className="sd-panel-header">
        <h2 className="sd-section-heading">All orders</h2>
        <div className="sd-stat">
          <span className="sd-stat-number">{total}</span>
          <span className="sd-stat-label">Matching orders</span>
        </div>
      </div>

      <div className="sd-toolbar" style={{ marginBottom: "1rem" }}>
        <select value={source} onChange={(e) => updateFilter("source", e.target.value)}>
          <option value="">All sources</option>
          <option value="SHOPIFY">Shopify</option>
          <option value="WHOLESALE_PORTAL">Wholesale portal</option>
        </select>
        <select value={region} onChange={(e) => updateFilter("region", e.target.value)}>
          <option value="">All regions</option>
          <option value="NZ">NZ</option>
          <option value="AU">AU</option>
        </select>
        <select value={status} onChange={(e) => updateFilter("status", e.target.value)}>
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="LABELLING">Labelling</option>
          <option value="PACKING">Packing</option>
          <option value="DISPATCHED">Dispatched</option>
        </select>
      </div>

      {error && <p className="sd-action-error">{error}</p>}
      {loading ? (
        <p className="sd-empty-state">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="sd-empty-state">No orders match these filters.</p>
      ) : (
        <div className="sd-table-wrap">
          <table className="sd-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Source</th>
                <th>Customer</th>
                <th>Region</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="sd-table-name">{order.orderNumber}</td>
                  <td>{order.source === "SHOPIFY" ? "Shopify" : "Wholesale"}</td>
                  <td>{order.wholesaleCustomer?.companyName ?? "-"}</td>
                  <td>{order.region}</td>
                  <td>
                    <span className={`sd-badge ${STATUS_BADGE[order.status]}`}>{order.status}</span>
                  </td>
                  <td>{order.paymentStatus === "PAID" ? "Paid" : "Awaiting invoice"}</td>
                  <td>
                    {order.currency} ${Number(order.totalAmount).toFixed(2)}
                  </td>
                  <td>{new Date(order.placedAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
