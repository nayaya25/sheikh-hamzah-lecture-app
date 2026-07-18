// Decorative / Qur'anic Arabic strings, rendered in the Amiri serif. These are
// CONSTANT — they do not flip with the EN/HA language toggle. Kept apart from the
// message catalogs so the toggle only ever swaps Latin-script UI copy.

export const arabic = {
  greeting: "السلام عليكم",
  bismillah: "﷽",
  allah: "ﷲ",
  emblemLetter: "ح", // Home header badge (ḥ for Hamzah / Ḥaqq)
  // Screen sub-labels shown beside the Latin title.
  library: "المكتبة",
  downloads: "التنزيلات",
  settings: "الإعدادات",
  language: "اللغة",
} as const;

/**
 * Native language names for the language switch rows — shown regardless of the
 * active UI language (README: "with native names").
 */
export const languageNames = {
  en: "English",
  ha: "Hausa",
} as const;
