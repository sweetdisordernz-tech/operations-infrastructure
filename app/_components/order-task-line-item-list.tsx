import { formatPackagingType } from "@/lib/format";
import type { PackagingType } from "@prisma/client";

export function OrderTaskLineItemList({
  lineItems,
}: {
  lineItems: Array<{
    id: string;
    productName: string;
    packagingType: PackagingType;
    fillingName: string | null;
    quantity: number;
  }>;
}) {
  return (
    <ul className="sd-line-item-list">
      {lineItems.map((item) => (
        <li key={item.id}>
          <span>
            {item.productName} — {formatPackagingType(item.packagingType)}
            {item.fillingName ? ` — ${item.fillingName}` : ""}
          </span>
          <span className="sd-line-item-qty">×{item.quantity}</span>
        </li>
      ))}
    </ul>
  );
}
