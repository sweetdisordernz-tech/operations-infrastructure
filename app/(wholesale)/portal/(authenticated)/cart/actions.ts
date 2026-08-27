"use server";

import { requireWholesaleCustomer } from "@/lib/auth/guards";
import { placeWholesaleOrder, type CartItemInput } from "@/lib/wholesale/checkout";
import { toActionResult } from "@/lib/to-action-result";

export type CheckoutResult =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; orderNumbers: string[] };

export async function placeOrderAction(
  _prevState: CheckoutResult,
  formData: FormData,
): Promise<CheckoutResult> {
  try {
    const customer = await requireWholesaleCustomer();

    const raw = formData.get("items");
    if (typeof raw !== "string" || !raw) {
      return { status: "error", error: "Your cart is empty." };
    }

    let items: CartItemInput[];
    try {
      items = JSON.parse(raw);
    } catch {
      return { status: "error", error: "Something went wrong reading your cart. Please try again." };
    }

    const { orders } = await placeWholesaleOrder(customer, items);
    return { status: "success", orderNumbers: orders.map((order) => order.orderNumber) };
  } catch (err) {
    const result = toActionResult(err);
    return result.ok ? { status: "idle" } : { status: "error", error: result.error };
  }
}
