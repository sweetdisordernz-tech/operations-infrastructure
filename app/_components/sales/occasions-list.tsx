import type { OccasionRow } from "@/lib/sales/occasions";

export function OccasionsList({ seasonal, alwaysOn }: { seasonal: OccasionRow[]; alwaysOn: OccasionRow[] }) {
  return (
    <div>
      <div>
        {seasonal.map((occasion, index) => (
          <div key={occasion.id} className="sd-occasion-row">
            <div>
              <p className="sd-occasion-name">
                {occasion.occasionName}
                {index === 0 && <span className="sd-badge sd-badge-info" style={{ marginLeft: "0.5rem" }}>Next up</span>}
              </p>
              <p className="sd-occasion-meta">{occasion.approxTiming}</p>
              {occasion.notes && <p className="sd-occasion-meta">{occasion.notes}</p>}
            </div>
            <div className="sd-occasion-meta" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
              Act by: {occasion.triggerBy}
            </div>
          </div>
        ))}
      </div>

      {alwaysOn.length > 0 && (
        <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--sd-border)" }}>
          <p className="sd-caption" style={{ marginBottom: "0.5rem" }}>
            Standing / always-on
          </p>
          {alwaysOn.map((occasion) => (
            <div key={occasion.id} className="sd-occasion-row">
              <div>
                <p className="sd-occasion-name">{occasion.occasionName}</p>
                <p className="sd-occasion-meta">{occasion.approxTiming}</p>
                {occasion.notes && <p className="sd-occasion-meta">{occasion.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
