export type View =
  | "dashboard"
  | "content"
  | "categories"
  | "media"
  | "featured"
  | "gallery"
  | "transcripts"
  | "settings";

export interface NavItem {
  key: View;
  label: string;
  icon: string;
  group: "MANAGE" | "SYSTEM";
}

export const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard", group: "MANAGE" },
  { key: "content", label: "Content", icon: "lectures", group: "MANAGE" },
  { key: "categories", label: "Categories", icon: "categories", group: "MANAGE" },
  { key: "media", label: "Media library", icon: "media", group: "MANAGE" },
  { key: "featured", label: "Featured & Home", icon: "featured", group: "MANAGE" },
  { key: "gallery", label: "Gallery & events", icon: "gallery", group: "MANAGE" },
  { key: "transcripts", label: "Transcripts", icon: "transcripts", group: "MANAGE" },
  { key: "settings", label: "Settings", icon: "settings", group: "SYSTEM" },
];

/** Topbar page title per view. */
export const VIEW_TITLES: Record<View, string> = {
  dashboard: "Dashboard",
  content: "Content",
  categories: "Categories",
  media: "Media library",
  featured: "Featured & Home",
  gallery: "Gallery & events",
  transcripts: "Transcripts",
  settings: "Settings",
};
