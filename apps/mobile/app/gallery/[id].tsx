import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { albumById, albumPhotos } from "@/lib/sampleData";

type Photo = { height: number; gradient: readonly [string, string] };

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();

  const album = albumById(id);
  if (!album) {
    return (
      <View style={styles.missing}>
        <StatusBar style="dark" />
        <Text style={styles.missingText}>Album not found</Text>
      </View>
    );
  }

  // Split into two columns for a masonry layout (RN has no CSS columns).
  const photos = albumPhotos(album.count > 12 ? 12 : album.count);
  const columns: [Photo[], Photo[]] = [[], []];
  photos.forEach((p, i) => columns[i % 2].push(p));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Album hero */}
        <View style={[styles.hero, { paddingTop: insets.top + 14 }]}>
          <LinearGradient
            colors={[album.gradient[0], album.gradient[1]]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.heroWatermark} allowFontScaling={false}>
            {album.ar}
          </Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.heroTitle}>{album.title}</Text>
          <Text style={styles.heroMeta}>
            {album.date} · {album.count} {t.gallery.photos}
          </Text>
        </View>

        {/* Masonry */}
        <View style={styles.masonry}>
          {columns.map((col, ci) => (
            <View key={ci} style={styles.column}>
              {col.map((photo, pi) => (
                <View key={pi} style={[styles.photo, { height: photo.height }]}>
                  <LinearGradient
                    colors={[photo.gradient[0], photo.gradient[1]]}
                    start={{ x: 0.15, y: 0 }}
                    end={{ x: 0.85, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Feather name="image" size={26} color="rgba(255,255,255,0.5)" />
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  missingText: { fontFamily: font.sans.medium, fontSize: 14, color: colors.muted },

  hero: { paddingHorizontal: 20, paddingBottom: 20, overflow: "hidden" },
  heroWatermark: { position: "absolute", right: -18, top: 8, fontFamily: font.arabic.regular, fontSize: 110, color: "rgba(255,255,255,0.12)" },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontFamily: font.serif.semibold, fontSize: 22, color: "#fff", marginTop: 14, lineHeight: 26 },
  heroMeta: { fontFamily: font.sans.regular, fontSize: 12.5, color: "rgba(255,255,255,0.8)", marginTop: 6 },

  masonry: { flexDirection: "row", padding: 16, gap: 10 },
  column: { flex: 1, gap: 10 },
  photo: { borderRadius: 14, overflow: "hidden", alignItems: "center", justifyContent: "center" },
});
