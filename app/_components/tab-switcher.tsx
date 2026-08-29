"use client";

import { useState, type ReactNode } from "react";

export function TabSwitcher({ tabs }: { tabs: Array<{ id: string; label: string; content: ReactNode }> }) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div>
      <div className="sd-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`sd-btn${tab.id === active ? " sd-btn-primary" : ""}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} hidden={tab.id !== active}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
