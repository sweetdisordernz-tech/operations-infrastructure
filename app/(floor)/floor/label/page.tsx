import { redirect } from "next/navigation";
import Link from "next/link";
import { Tag, CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getNextLabellingBatch } from "@/lib/tasks/labelling";
import { formatPackagingType } from "@/lib/format";
import { TaskActionForm } from "@/app/_components/task-action-form";
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
              <Tag className="sd-task-icon" aria-hidden="true" />
              <p className="sd-task-product">
                {batch.productName} — {formatPackagingType(batch.packagingType)}
                {batch.fillingName ? ` — ${batch.fillingName}` : ""}
              </p>
              <p className="sd-task-qty">{batch.totalQuantity}</p>
              <p className="sd-task-qty-label">
                needed across {batch.orderCount} order{batch.orderCount === 1 ? "" : "s"}
              </p>
              <TaskActionForm
                action={completeLabellingBatchAction}
                hiddenFields={{ productId: batch.productId }}
                buttonLabel="Mark this batch done"
                pendingLabel="Marking done..."
              />
            </div>
          ) : (
            <div className="sd-task-card">
              <CheckCircle2 className="sd-task-icon" aria-hidden="true" />
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
