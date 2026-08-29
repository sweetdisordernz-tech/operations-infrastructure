"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { INITIAL_ACTION_RESULT, type ActionResult } from "@/lib/action-result";
import { moveLeadStageAction } from "@/app/(ops)/dashboard/(authenticated)/sales/actions";
import { STAGE_ORDER, STAGE_LABELS, SEGMENT_LABELS, type LeadRow } from "@/lib/sales/pipeline";

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

function formatValue(value: number | null): string {
  if (value === null) return "-";
  return `$${value.toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
}

function LeadCard({ lead }: { lead: LeadRow }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(moveLeadStageAction, INITIAL_ACTION_RESULT);

  return (
    <div className="sd-lead-card">
      <Link href={`/sales/leads/${lead.id}`}>{lead.companyName}</Link>
      <div className="sd-lead-card-meta">
        {lead.contactName ?? "No contact yet"} - {SEGMENT_LABELS[lead.segment]}
      </div>
      <div className="sd-lead-card-meta">
        {formatValue(lead.estOrderValueNzd)} · Next action: {formatDate(lead.nextActionDate)}
      </div>
      <form
        action={formAction}
        onChange={(e) => {
          (e.currentTarget as HTMLFormElement).requestSubmit();
        }}
      >
        <input type="hidden" name="id" value={lead.id} />
        <select name="stage" defaultValue={lead.stage}>
          {STAGE_ORDER.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
      </form>
      {!state.ok && <p className="sd-action-error" style={{ margin: 0 }}>{state.error}</p>}
    </div>
  );
}

function KanbanView({ leads }: { leads: LeadRow[] }) {
  return (
    <div className="sd-kanban-board">
      {STAGE_ORDER.map((stage) => {
        const stageLeads = leads.filter((lead) => lead.stage === stage);
        return (
          <div key={stage} className="sd-kanban-column">
            <div className="sd-kanban-column-header">
              <span>{STAGE_LABELS[stage]}</span>
              <span>{stageLeads.length}</span>
            </div>
            {stageLeads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TableView({ leads }: { leads: LeadRow[] }) {
  const sorted = [...leads].sort((a, b) => {
    if (a.nextActionDate && b.nextActionDate) return a.nextActionDate.getTime() - b.nextActionDate.getTime();
    if (a.nextActionDate) return -1;
    if (b.nextActionDate) return 1;
    return a.leadNumber - b.leadNumber;
  });

  if (sorted.length === 0) {
    return <p className="sd-empty-state">No leads yet - add your first one above.</p>;
  }

  return (
    <div className="sd-table-wrap">
      <table className="sd-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Company</th>
            <th>Segment</th>
            <th>Stage</th>
            <th>Est. value</th>
            <th>Next action</th>
            <th>Next action date</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((lead) => (
            <tr key={lead.id}>
              <td>{lead.leadNumber}</td>
              <td>
                <Link href={`/sales/leads/${lead.id}`} className="sd-table-name">
                  {lead.companyName}
                </Link>
                <div className="sd-table-sub">{lead.contactName ?? ""}</div>
              </td>
              <td>{SEGMENT_LABELS[lead.segment]}</td>
              <td>{STAGE_LABELS[lead.stage]}</td>
              <td>{formatValue(lead.estOrderValueNzd)}</td>
              <td className="sd-table-sub">{lead.nextAction ?? "-"}</td>
              <td>{formatDate(lead.nextActionDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PipelineBoard({ leads }: { leads: LeadRow[] }) {
  const [view, setView] = useState<"kanban" | "table">("kanban");

  return (
    <div>
      <div className="sd-toolbar" style={{ marginBottom: "1rem" }}>
        <button type="button" className={`sd-btn sd-btn-sm${view === "kanban" ? " sd-btn-primary" : ""}`} onClick={() => setView("kanban")}>
          Kanban
        </button>
        <button type="button" className={`sd-btn sd-btn-sm${view === "table" ? " sd-btn-primary" : ""}`} onClick={() => setView("table")}>
          Table
        </button>
      </div>
      {view === "kanban" ? <KanbanView leads={leads} /> : <TableView leads={leads} />}
    </div>
  );
}
