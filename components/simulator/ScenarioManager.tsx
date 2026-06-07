"use client";

import React from "react";
import { Scenario } from "@/lib/scenarios";

interface ScenarioManagerProps {
  scenarios: Scenario[];
  saveName: string;
  setSaveName: (v: string) => void;
  handleSave: () => void;
  handleLoad: (scenario: Scenario) => void;
  handleDelete: (id: string) => void;
  saveMessage: string;
}

export default function ScenarioManager({
  scenarios,
  saveName,
  setSaveName,
  handleSave,
  handleLoad,
  handleDelete,
  saveMessage,
}: ScenarioManagerProps) {
  return (
    <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--border-subtle)" }}>
      <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
        💾 儲存劇本（{scenarios.length}/3）
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="劇本名稱..."
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          className="input-field !py-2 text-sm flex-1"
          maxLength={20}
        />
        <button onClick={handleSave} className="btn-accent !py-2 !px-4 text-sm shrink-0">
          存檔
        </button>
      </div>
      {saveMessage && <p className="text-xs mt-2" style={{ color: "var(--accent-primary)" }}>{saveMessage}</p>}
      {scenarios.length > 0 && (
        <div className="mt-3 space-y-2">
          {scenarios.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-2.5 rounded-lg text-sm"
              style={{ background: "var(--bg-secondary)" }}
            >
              <button
                onClick={() => handleLoad(s)}
                className="text-left flex-1 truncate font-medium hover:text-[var(--accent-primary)] transition-colors"
                style={{ color: "var(--text-secondary)" }}
              >
                {s.name}
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="ml-2 text-xs px-2 py-1 rounded hover:bg-red-500/20 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
