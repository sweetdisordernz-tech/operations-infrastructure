"use client";

import { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import { SEGMENT_LABELS } from "@/lib/sales/pipeline";
import type { TemplateRow } from "@/lib/sales/templates";

const CATEGORY_LABELS = {
  ALL: "All",
  EDM_SEQUENCE: "EDM sequence",
  COLD_OUTREACH: "Cold outreach",
  RESPONSE_SCENARIO: "Response scenarios",
} as const;

function renderBodyWithTokens(text: string) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) =>
    part.startsWith("[") && part.endsWith("]") ? (
      <span key={i} className="sd-merge-token">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function copyPayload(template: TemplateRow): string {
  const lines = [`Subject: ${template.subject}`];
  if (template.preheader) lines.push(`Preheader: ${template.preheader}`);
  lines.push("", template.body);
  if (template.ctaLabel) lines.push("", `CTA: ${template.ctaLabel}`);
  return lines.join("\n");
}

function CopyButton({ template }: { template: TemplateRow }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="sd-btn sd-btn-sm"
      onClick={async () => {
        await navigator.clipboard.writeText(copyPayload(template));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? (
        <>
          <Check size={14} aria-hidden="true" /> Copied
        </>
      ) : (
        <>
          <Copy size={14} aria-hidden="true" /> Copy
        </>
      )}
    </button>
  );
}

function TemplateCard({ template }: { template: TemplateRow }) {
  return (
    <div className="sd-template-card">
      <div className="sd-template-card-header">
        <div>
          <p className="sd-card-title" style={{ marginBottom: "0.15rem" }}>
            {template.category === "EDM_SEQUENCE" && `${template.sequencePosition}/5 - `}
            {template.scenarioName ?? template.subject}
          </p>
          {template.scenarioName && <p className="sd-caption">Subject: {template.subject}</p>}
          {template.sendTimingNotes && <p className="sd-caption">{template.sendTimingNotes}</p>}
        </div>
        <CopyButton template={template} />
      </div>

      {(template.subjectAltHr || template.subjectAltAgency || template.subjectAltSales) && (
        <p className="sd-caption">
          Alt subjects — HR: {template.subjectAltHr ?? "-"} · Agency: {template.subjectAltAgency ?? "-"} · Sales:{" "}
          {template.subjectAltSales ?? "-"}
        </p>
      )}
      {template.preheader && <p className="sd-caption">Preheader: {template.preheader}</p>}

      <div className="sd-template-body">{renderBodyWithTokens(template.body)}</div>

      {template.ctaLabel && <p className="sd-caption">CTA: {template.ctaLabel}</p>}
      {template.notes && <p className="sd-caption">Note: {template.notes}</p>}
    </div>
  );
}

export function TemplatesLibrary({ templates }: { templates: TemplateRow[] }) {
  const [category, setCategory] = useState<keyof typeof CATEGORY_LABELS>("ALL");
  const [segment, setSegment] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (category !== "ALL" && t.category !== category) return false;
      if (category === "COLD_OUTREACH" && segment && t.segment !== segment) return false;
      if (search.trim()) {
        const needle = search.trim().toLowerCase();
        const haystack = `${t.scenarioName ?? ""} ${t.subject} ${t.body}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [templates, category, segment, search]);

  return (
    <div>
      <div className="sd-toolbar" style={{ marginBottom: "1.25rem" }}>
        {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map((key) => (
          <button
            key={key}
            type="button"
            className={`sd-btn sd-btn-sm${category === key ? " sd-btn-primary" : ""}`}
            onClick={() => setCategory(key)}
          >
            {CATEGORY_LABELS[key]}
          </button>
        ))}
        {category === "COLD_OUTREACH" && (
          <select value={segment} onChange={(e) => setSegment(e.target.value)}>
            <option value="">All segments</option>
            {Object.entries(SEGMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}
        {category === "RESPONSE_SCENARIO" && (
          <input
            type="text"
            placeholder="Search scenarios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="sd-empty-state">No templates match these filters.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filtered.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}
