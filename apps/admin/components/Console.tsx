"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { Dashboard } from "@/components/views/Dashboard";
import { Placeholder } from "@/components/views/Placeholder";
import type { View } from "@/lib/views";

export function Console() {
  const [view, setView] = useState<View>("dashboard");
  const [query, setQuery] = useState("");

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar view={view} onNavigate={setView} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "var(--bg)" }}>
        <Topbar view={view} query={query} onQuery={setQuery} />
        <div className="noscroll" style={{ flex: 1, overflowY: "auto", padding: 26 }}>
          {view === "dashboard" ? <Dashboard onNavigate={setView} /> : <Placeholder view={view} />}
        </div>
      </div>
    </div>
  );
}
