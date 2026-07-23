import type { LectureGroup, Playable } from "@/lib/catalog";

interface Navigator {
  push: (href: string) => void;
}

/** The player + catalog hooks `openLecture` needs to resolve a play queue. */
export interface OpenLectureDeps {
  /** Fallback single-item play when a lecture has no resolvable collection. */
  play: (lecture: Playable) => void;
  /** Play `lectures[startIndex]` with the whole list as the queue. */
  playCollection: (lectures: Playable[], startIndex: number) => void;
  /** A collection's lectures — flat (series) or grouped (occasion/topic). */
  lecturesForCollection: (id: string) => Playable[] | LectureGroup[];
}

/**
 * Flatten `lecturesForCollection`'s result into a single play-queue order:
 * a flat `sort`-ordered list stays as-is (series), grouped lectures
 * (occasion/topic) are concatenated in display order — the same order the
 * collection screen renders and queues them.
 */
export function flattenCollection(items: Playable[] | LectureGroup[]): Playable[] {
  if (items.length === 0) return [];
  // LectureGroup has a `lectures` array; a bare Playable does not.
  if ("lectures" in items[0]) {
    return (items as LectureGroup[]).flatMap((g) => g.lectures);
  }
  return items as Playable[];
}

/**
 * Open a lecture from any list: text lectures go to the reader; audio/video
 * load into the player and expand it. Centralized so every screen routes text
 * consistently (README: "Text lectures open THIS, not the audio player").
 *
 * For playable lectures the whole parent collection is resolved (in display
 * order) and loaded as the play queue, so next/prev and the queue work the
 * same as they do from the collection screen. If the collection can't be
 * resolved, we fall back to a single-item play.
 */
export function openLecture(
  router: Navigator,
  lecture: Playable,
  deps: OpenLectureDeps,
): void {
  if (lecture.type === "text") {
    router.push(`/reader/${lecture.id}`);
    return;
  }
  const queue = flattenCollection(deps.lecturesForCollection(lecture.collectionId));
  const index = queue.findIndex((l) => l.id === lecture.id);
  if (queue.length > 0 && index >= 0) {
    deps.playCollection(queue, index);
  } else {
    deps.play(lecture);
  }
  router.push("/player");
}
