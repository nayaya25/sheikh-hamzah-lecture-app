"use client";

import { useCallback, useEffect, useState } from "react";
import { admin } from "@althaqalayn/api";
import type { Collection, Lecture } from "@althaqalayn/types";
import { getClient } from "@/lib/supabase";

export interface CollectionNode extends Collection {
  /** This collection's lectures, ordered by `sort` ascending. */
  lectures: Lecture[];
}
export interface ContentTree {
  collections: CollectionNode[];
}

/** One `group_label` bucket within an occasion/topic collection. */
export interface LectureGroup {
  label: string;
  lectures: Lecture[];
}

/** Pure: fold flat collection + lecture rows into the Collection → Lecture tree,
 *  each collection's lectures ordered by `sort` ascending. */
export function shapeTree(collections: Collection[], lectures: Lecture[]): ContentTree {
  const byCollection = new Map<string, Lecture[]>();
  for (const l of lectures) {
    const arr = byCollection.get(l.collectionId) ?? [];
    arr.push(l);
    byCollection.set(l.collectionId, arr);
  }
  for (const arr of byCollection.values()) {
    arr.sort((a, b) => a.sort - b.sort);
  }

  const nodes: CollectionNode[] = collections.map((c) => ({
    ...c,
    lectures: byCollection.get(c.id) ?? [],
  }));

  return { collections: nodes };
}

/**
 * Pure: implements the shared rendering rule for a collection's lectures —
 * `series` renders as one flat `sort`-ordered list (ignoring `groupLabel`);
 * `occasion`/`topic` group lectures by `groupLabel` (label-less lectures fall
 * into a trailing "Ungrouped" bucket), groups appear in first-appearance order
 * (i.e. by the minimum `sort` of their members, since `collection.lectures` is
 * already `sort`-ordered), and lectures within a group stay `sort`-ordered.
 */
export function groupLectures(collection: CollectionNode): Lecture[] | LectureGroup[] {
  if (collection.kind === "series") return collection.lectures;

  const order: string[] = [];
  const byLabel = new Map<string, Lecture[]>();
  const ungrouped: Lecture[] = [];
  for (const l of collection.lectures) {
    if (!l.groupLabel) {
      ungrouped.push(l);
      continue;
    }
    if (!byLabel.has(l.groupLabel)) {
      byLabel.set(l.groupLabel, []);
      order.push(l.groupLabel);
    }
    byLabel.get(l.groupLabel)!.push(l);
  }

  const groups: LectureGroup[] = order.map((label) => ({ label, lectures: byLabel.get(label)! }));
  if (ungrouped.length) groups.push({ label: "Ungrouped", lectures: ungrouped });
  return groups;
}

export function useContentTree() {
  const [tree, setTree] = useState<ContentTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const client = getClient();
    try {
      const [collections, lectures] = await Promise.all([
        admin.listAllCollections(client),
        admin.listAllLectures(client),
      ]);
      setTree(shapeTree(collections, lectures));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tree, loading, error, reload };
}
