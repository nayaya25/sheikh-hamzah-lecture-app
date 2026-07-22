"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { ContentWorkspace } from "@/components/content/ContentWorkspace";
import { Dashboard } from "@/components/views/Dashboard";
import { Featured } from "@/components/views/Featured";
import { Gallery } from "@/components/views/Gallery";
import { MediaLibrary } from "@/components/views/MediaLibrary";
import { Settings } from "@/components/views/Settings";
import { Transcripts } from "@/components/views/Transcripts";
import type { View } from "@/lib/views";

export function Console() {
  const [view, setView] = useState<View>("dashboard");
  const [query, setQuery] = useState("");

  const onPrimary = () => {
    if (view === "dashboard") setView("content");
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar view={view} onNavigate={setView} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "var(--bg)" }}>
        <Topbar view={view} query={query} onQuery={setQuery} onPrimary={onPrimary} />
        <div className="noscroll" style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
          {view === "dashboard" ? (
            <Dashboard onNavigate={setView} />
          ) : view === "content" ? (
            <ContentWorkspace />
          ) : view === "featured" ? (
            <Featured />
          ) : view === "gallery" ? (
            <Gallery query={query} />
          ) : view === "transcripts" ? (
            <Transcripts query={query} />
          ) : view === "media" ? (
            <MediaLibrary query={query} />
          ) : (
            <Settings />
          )}
        </div>
      </div>
    </div>
  );
}
