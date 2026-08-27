import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getNextLabellingBatch } from "@/lib/tasks/labelling";
import { formatPackagingType } from "@/lib/format";
import { BigSubmitButton } from "@/app/_components/big-submit-button";
import { completeLabellingBatchAction } from "./actions";

export default async function LabelPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const batch = await getNextLabellingBatch();

  return (
    <div className="sd-shell">
      <div className="sd-floor-header">
        <h1>Labelling &amp; filling</h1>
      </div>
      <main className="sd-main">
        <div className="sd-task-wrap">
          {batch ? (
            <div className="sd-task-card">
              <p className="sd-task-product">
                {batch.productName} — {formatPackagingType(batch.packagingType)}
                {batch.fillingName ? ` — ${batch.fillingName}` : ""}
              </p>
              <p className="sd-task-qty">{batch.totalQuantity}</p>
              <p className="sd-task-qty-label">
                needed across {batch.orderCount} order{batch.orderCount === 1 ? "" : "s"}
              </p>
              <form action={completeLabellingBatchAction}>
                <input type="hidden" name="productId" value={batch.productId} />
                <BigSubmitButton pendingLabel="Marking done...">
                  Mark this batch done
                </BigSubmitButton>
              </form>
            </div>
          ) : (
            <div className="sd-task-card">
              <p className="sd-task-product">No tasks right now</p>
              <p className="sd-task-meta">Nothing pending for labelling. Nice work.</p>
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
