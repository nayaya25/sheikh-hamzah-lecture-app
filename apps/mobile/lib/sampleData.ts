// Home/catalog view-model TYPES. (No sample data — everything is real, from
// Supabase via @/lib/catalogProvider. Filename kept to avoid import churn.)

export type Gradient = readonly [from: string, to: string];

export interface HomeLecture {
  id: string;
  title: string;
  sub: string;
  type: import("@althaqalayn/types").MediaType;
  date: string;
  ar: string;
  gradient: Gradient;
}

export interface HomeAlbum {
  id: string;
  title: string;
  date: string;
  count: number;
  ar?: string;
  gradient?: Gradient;
  /** Cover photo URL, when the album has photos. */
  cover?: string;
}
