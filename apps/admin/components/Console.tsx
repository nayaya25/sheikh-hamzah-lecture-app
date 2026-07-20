"use client";

import { useState } from "react";
import type { Lecture } from "@althaqalayn/types";
import { LectureEditor } from "@/components/LectureEditor";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { Dashboard } from "@/components/views/Dashboard";
import { Lectures } from "@/components/views/Lectures";
import { Placeholder } from "@/components/views/Placeholder";
import { SeriesManager } from "@/components/views/SeriesManager";
import type { View } from "@/lib/views";

export function Console() {
  const [view, setView] = useState<View>("dashboard");
  const [query, setQuery] = useState("");
  // null = closed, "new" = create, Lecture = edit that lecture.
  const [editing, setEditing] = useState<Lecture | "new" | null>(null);
  const [version, setVersion] = useState(0); // bump to refetch lists after a save

  const onPrimary = () => {
    if (view === "dashboard" || view === "lectures") {
      setView("lectures");
      setEditing("new");
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar view={view} onNavigate={setView} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "var(--bg)" }}>
        <Topbar view={view} query={query} onQuery={setQuery} onPrimary={onPrimary} />
        <div className="noscroll" style={{ flex: 1, overflowY: "auto", padding: 26 }}>
          {view === "dashboard" ? (
            <Dashboard onNavigate={setView} />
          ) : view === "lectures" ? (
            <Lectures query={query} version={version} onEdit={(l) => setEditing(l)} />
          ) : view === "series" ? (
            <SeriesManager query={query} />
          ) : (
            <Placeholder view={view} />
          )}
        </div>
      </div>

      {editing !== null ? (
        <LectureEditor
          lecture={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setVersion((v) => v + 1);
          }}
        />
      ) : null}
    </div>
  );
}
