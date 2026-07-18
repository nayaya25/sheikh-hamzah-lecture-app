// Shared content model for the Althaqalayn platform — consumed by the mobile app
// (@althaqalayn/api reads published content) and the admin console (full CRUD).

export * from "./common";
export type { Lecture } from "./lecture";
export type { Series, SeriesCover } from "./series";
export type { Program } from "./program";
export type { Category } from "./category";
export type { Album, Photo } from "./gallery";
export type { Transcript } from "./transcript";
export type { User } from "./user";
