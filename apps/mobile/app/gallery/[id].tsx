import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { getAlbumWithPhotos } from "@althaqalayn/api";
import type { Album, Photo } from "@althaqalayn/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Lightbox } from "@/components/Lightbox";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { Header } from "@/components/ui/Header";
import { Skeleton } from "@/components/ui/Skeleton";
import { Touchable } from "@/components/ui/Touchable";
import { useI18n } from "@/lib/i18n";
import { getClient } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

const aspectOf = (p: Photo) => (p.width && p.height ? p.width / p.height : 0.75);

/**
 * Packs photos into two columns using shorter-column placement: each photo
 * goes into whichever column currently has the smaller running height (sum
 * of `1/aspect`, since both columns share the same width), instead of the
 * naive alternating `i % 2` which can leave one column visibly longer.
 */
function packMasonry(photos: Photo[]): [Photo[], Photo[]] {
  const columns: [Photo[], Photo[]] = [[], []];
  const heights = [0, 0];
  for (const p of photos) {
    const col = heights[0] <= heights[1] ? 0 : 1;
    columns[col].push(p);
    heights[col] += 1 / aspectOf(p);
  }
  return columns;
}

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const { t: msgs } = useI18n();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const client = getClient();
        if (client) setAlbum(await getAlbumWithPhotos(client, id));
      } catch {
        // null → not-found state
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const photos = album?.photos ?? [];
  const columns = useMemo(() => packMasonry(photos), [photos]);

  return (
    <View style={[styles.root, { backgroundColor: t.c.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Header title={album?.title ?? msgs.gallery.albumFallback} onBack={() => router.back()} />
        {album ? (
          <AppText color="textMuted" style={[styles.heroMeta, { paddingHorizontal: t.space.screen }]}>
            {album.date} · {photos.length} {msgs.gallery.photos}
          </AppText>
        ) : null}

        {loading ? (
          <View style={styles.masonry}>
            {[0, 1].map((ci) => (
              <View key={ci} style={styles.column}>
                {[0, 1, 2].map((ri) => (
                  <Skeleton key={ri} height={ci === 0 ? 160 : 210} radius={14} />
                ))}
              </View>
            ))}
          </View>
        ) : !album ? (
          <EmptyState icon="alert-circle" title={msgs.gallery.albumNotFound} />
        ) : photos.length === 0 ? (
          <EmptyState icon="image" title={msgs.gallery.noPhotos} body={msgs.gallery.noPhotosBody} />
        ) : (
          <View style={styles.masonry}>
            {columns.map((col, ci) => (
              <View key={ci} style={styles.column}>
                {col.map((p) => (
                  <Touchable
                    key={p.id}
                    haptic="light"
                    accessibilityLabel={msgs.gallery.openPhotoA11y}
                    onPress={() => setLightboxIndex(photos.findIndex((x) => x.id === p.id))}
                  >
                    <Image
                      source={{ uri: p.url }}
                      style={[styles.photo, { aspectRatio: aspectOf(p), backgroundColor: t.c.surfaceAlt }]}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                    />
                  </Touchable>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {lightboxIndex !== null ? (
        <Lightbox photos={photos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heroMeta: { fontSize: 12.5, marginTop: 10 },
  masonry: { flexDirection: "row", padding: 16, gap: 10 },
  column: { flex: 1, gap: 10 },
  photo: { width: "100%", borderRadius: 14 },
});
