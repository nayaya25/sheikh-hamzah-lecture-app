import type { CategoryId } from "./common";

/**
 * An Explore category tile on Home (managed under admin → Categories).
 * `active` controls whether it appears in the app; `archived` moves it to the
 * admin's Archived section (restorable).
 */
export interface Category {
  id: CategoryId;
  /** English label shown under the motif. */
  label: string;
  /** Arabic motif/label. */
  ar: string;
  /** Count/subtitle text, e.g. "12 lectures". */
  meta?: string;
  active: boolean;
  archived: boolean;
}
