import { getClient } from "@/lib/supabase";

const BUCKET = "media";
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`;

/** Upload a media file to the public `media` bucket; returns its public URL + path. */
export async function uploadMedia(file: File): Promise<{ url: string; path: string }> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `lectures/${crypto.randomUUID()}.${ext}`;
  const client = getClient();
  const { error } = await client.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  const url = client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return { url, path };
}

/** The object path inside the bucket, if this URL points at our media bucket. */
export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const i = url.indexOf(PUBLIC_MARKER);
  return i >= 0 ? url.slice(i + PUBLIC_MARKER.length) : null;
}

/** Best-effort delete of a previously-uploaded object (ignores failures). */
export async function deleteMedia(path: string): Promise<void> {
  try {
    await getClient().storage.from(BUCKET).remove([path]);
  } catch {
    // orphaned object is harmless; don't block the save
  }
}
