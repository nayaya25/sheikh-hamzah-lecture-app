import type { Playable } from "@/lib/catalog";

interface Navigator {
  push: (href: string) => void;
}

/**
 * Open a lecture from any list: text lectures go to the reader; audio/video load
 * into the player and expand it. Centralized so every screen routes text
 * consistently (README: "Text lectures open THIS, not the audio player").
 */
export function openLecture(
  router: Navigator,
  play: (lecture: Playable) => void,
  lecture: Playable,
): void {
  if (lecture.type === "text") {
    router.push(`/reader/${lecture.id}`);
    return;
  }
  play(lecture);
  router.push("/player");
}
