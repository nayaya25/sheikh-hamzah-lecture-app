import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { getAlbumWithPhotos } from "@althaqalayn/api";
import type { Album, Photo } from "@althaqalayn/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { getClient } from "@/lib/supabase";

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);

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
  const columns: [Photo[], Photo[]] = [[], []];
  photos.forEach((p, i) => columns[i % 2].push(p));
  const aspect = (p: Photo) => (p.width && p.height ? p.width / p.height : 0.75);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={[styles.hero, { paddingTop: insets.top + 14 }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.heroTitle}>{album?.title ?? "Album"}</Text>
          {album ? (
            <Text style={styles.heroMeta}>
              {album.date} · {photos.length} {t.gallery.photos}
            </Text>
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.greenMid} style={{ marginTop: 40 }} />
        ) : !album ? (
          <Text style={styles.empty}>Album not found.</Text>
        ) : photos.length === 0 ? (
          <Text style={styles.empty}>No photos in this album yet.</Text>
        ) : (
          <View style={styles.masonry}>
            {columns.map((col, ci) => (
              <View key={ci} style={styles.column}>
                {col.map((p) => (
                  <Image key={p.id} source={{ uri: p.url }} style={[styles.photo, { aspectRatio: aspect(p) }]} />
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  hero: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: colors.greenDeep, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  heroTitle: { fontFamily: font.serif.semibold, fontSize: 22, color: "#fff", marginTop: 14, lineHeight: 26 },
  heroMeta: { fontFamily: font.sans.regular, fontSize: 12.5, color: "rgba(255,255,255,0.8)", marginTop: 6 },
  empty: { fontFamily: font.sans.medium, fontSize: 13, color: colors.faint, textAlign: "center", marginTop: 40 },
  masonry: { flexDirection: "row", padding: 16, gap: 10 },
  column: { flex: 1, gap: 10 },
  photo: { width: "100%", borderRadius: 14, backgroundColor: colors.hairline },
});
