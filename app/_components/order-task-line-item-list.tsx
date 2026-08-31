import { Candy } from "lucide-react";
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
    imageBlobUrl: string | null;
  }>;
}) {
  return (
    <ul className="sd-line-item-list">
      {lineItems.map((item) => (
        <li key={item.id}>
          <span className="sd-line-item-photo">
            {item.imageBlobUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Vercel Blob URLs, not a local/optimizable asset
              <img src={item.imageBlobUrl} alt="" />
            ) : (
              <Candy aria-hidden="true" size={20} />
            )}
          </span>
          <span className="sd-line-item-text">
            {item.productName} — {formatPackagingType(item.packagingType)}
            {item.fillingName ? ` — ${item.fillingName}` : ""}
          </span>
          <span className="sd-line-item-qty">×{item.quantity}</span>
        </li>
      ))}
    </ul>
  );
}
