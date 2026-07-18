import type { AlbumId, ISODate, PhotoId } from "./common";

/** A single event photo in an album's masonry grid. */
export interface Photo {
  id: PhotoId;
  url: string;
  caption?: string;
  /** Intrinsic dimensions, for masonry layout without reflow. */
  width?: number;
  height?: number;
}

/**
 * A gallery album — photos of an event. Managed under admin → Gallery & events
 * and served read-only to the app's Gallery → Album screens.
 */
export interface Album {
  id: AlbumId;
  title: string;
  date: ISODate;
  /** Event name (e.g. "Maulud 1445"). */
  event?: string;
  /** Cover image URL (defaults to the first photo). */
  cover?: string;
  photos: Photo[];
  published: boolean;
}
