// EN + HA UI message catalogs. English-first UI with a Hausa toggle; content
// plays in its original language. Arabic decorative text lives in `arabic`.

import type { Language } from "@althaqalayn/types";
import { en, type Messages } from "./en";
import { ha } from "./ha";

export type { Messages } from "./en";
export { en } from "./en";
export { ha } from "./ha";
export { arabic, languageNames } from "./arabic";

/** All catalogs, keyed by language code. */
export const messages: Record<Language, Messages> = { en, ha };

/** The full message catalog for a language. */
export function getMessages(lang: Language): Messages {
  return messages[lang];
}

