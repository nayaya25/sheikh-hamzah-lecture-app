"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { ModalProvider } from "@/components/ModalProvider";
import { Dashboard } from "@/components/views/Dashboard";
import { Collections } from "@/components/views/Collections";
import { CollectionDetail } from "@/components/views/CollectionDetail";
import { Gallery } from "@/components/views/Gallery";
import { Settings } from "@/components/views/Settings";
import type { View } from "@/lib/views";

export function Console() {
  const [view, setView] = useState<View>("dashboard");
  const [query, setQuery] = useState("");
  // Collection detail (T4) is an internal view, not a sidebar destination:
  // opening a card stashes its id and switches to the "collection" view.
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const openCollection = (id: string) => {
    setSelectedCollectionId(id);
    setView("collection");
  };

  return (
    <ModalProvider>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
        <Sidebar view={view} onNavigate={setView} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar query={query} onQuery={setQuery} />
          <div style={{ flex: 1, overflowY: "auto", padding: "26px 28px" }}>
            <div key={view} className="rise" style={{ maxWidth: 1200, margin: "0 auto" }}>
              {view === "dashboard" ? (
                <Dashboard onNavigate={setView} />
              ) : view === "collections" ? (
                <Collections onOpen={openCollection} />
              ) : view === "collection" ? (
                <CollectionDetail collectionId={selectedCollectionId} onBack={() => setView("collections")} />
              ) : view === "gallery" ? (
                <Gallery query={query} />
              ) : (
                <Settings />
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalProvider>
  );
}
