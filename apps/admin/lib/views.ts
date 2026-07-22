// Collections-first IA (see docs/superpowers/plans/2026-07-22-admin-modern-rebuild.md).
// "collection" (singular) is the detail screen reached by clicking a card in
// "collections" — it isn't a nav destination, so it's absent from NAV but still
// a first-class View so Console can route to it and Sidebar can keep
// "Collections" highlighted while a collection is open.
export type View = "dashboard" | "collections" | "collection" | "gallery" | "settings";

export interface NavItem {
  key: View;
  label: string;
  icon: string;
  group: "MENU" | "SYSTEM";
}

export const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard", group: "MENU" },
  { key: "collections", label: "Collections", icon: "collections", group: "MENU" },
  { key: "gallery", label: "Gallery", icon: "gallery", group: "MENU" },
  { key: "settings", label: "Settings", icon: "settings", group: "SYSTEM" },
];

/** Topbar/page title per view. */
export const VIEW_TITLES: Record<View, string> = {
  dashboard: "Dashboard",
  collections: "Collections",
  collection: "Collection",
  gallery: "Gallery",
  settings: "Settings",
};
