// Supabase-backed data layer. Mobile app imports `content` (public reads);
// admin console imports `admin` (auth + CRUD). Both build the client the same way.

export { createAlthaqalaynClient, unwrap } from "./client";
export type { AlthaqalaynClient, ClientConfig } from "./client";
export * from "./content";
export * as admin from "./admin";
export type {
  LectureInput,
  SeriesInput,
  ProgramInput,
  CategoryInput,
  AlbumInput,
  PhotoInput,
  TranscriptInput,
} from "./admin";
export * from "./mappers";
export type * from "./database.types";
