import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Candy } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getNextLabellingBatch } from "@/lib/tasks/labelling";
import { getCompletedTodayCount } from "@/lib/tasks/shared";
import { formatPackagingType } from "@/lib/format";
import { TaskActionForm } from "@/app/_components/task-action-form";
import { completeLabellingBatchAction } from "./actions";

// Always render per-request (never statically prerendered at build time).
export const dynamic = "force-dynamic";

export default async function LabelPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [batch, completedToday] = await Promise.all([
    getNextLabellingBatch(),
    getCompletedTodayCount("LABELLING", user.id),
  ]);

  return (
    <div className="sd-shell sd-shell--label">
      <div className="sd-floor-header">
        <span className="sd-floor-logo">Sweet Disorder</span>
        <h1>Labelling &amp; filling</h1>
      </div>
      <main className="sd-main">
        <div className="sd-task-wrap">
          <div className="sd-completed-today">
            <span className="sd-completed-today-number">{completedToday}</span>
            <span className="sd-completed-today-label">Completed today</span>
          </div>
          {batch ? (
            <div className="sd-task-card">
              {batch.imageBlobUrl ? (
                <div className="sd-task-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Vercel Blob URL, not a local/optimizable asset */}
                  <img src={batch.imageBlobUrl} alt="" />
                </div>
              ) : (
                <Candy className="sd-task-icon" aria-hidden="true" />
              )}
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
