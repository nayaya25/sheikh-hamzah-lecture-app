import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import { useCatalog } from "@/lib/catalogProvider";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { albums, loading } = useCatalog();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <LinearGradient
          colors={[colors.greenDeep, colors.greenMid]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 14 }]}
        >
          <Text style={styles.headerWatermark} allowFontScaling={false}>
            معرض
          </Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerArabic} allowFontScaling={false}>
            المعرض
          </Text>
          <Text style={styles.headerTitle}>{t.gallery.title}</Text>
          <Text style={styles.headerSub}>Photographs from Foundation events</Text>
        </LinearGradient>

        {loading ? (
          <ActivityIndicator color={colors.greenMid} style={{ marginTop: 40 }} />
        ) : albums.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="image" size={30} color={colors.faint} />
            <Text style={styles.emptyText}>No albums yet</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {albums.map((album) => (
              <Pressable key={album.id} style={styles.card} onPress={() => router.push(`/gallery/${album.id}`)}>
                {album.cover ? (
                  <Image source={{ uri: album.cover }} style={StyleSheet.absoluteFill} />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.greenDeep }]} />
                )}
                <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)"]} style={StyleSheet.absoluteFill} />
                <View style={styles.cardBody}>
                  <View style={styles.countChip}>
                    <Feather name="image" size={12} color="#fff" />
                    <Text style={styles.countChipText}>
                      {album.count} {t.gallery.photos}
                    </Text>
                  </View>
                  <Text style={styles.cardTitle}>{album.title}</Text>
                  <Text style={styles.cardDate}>{album.date}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: "hidden" },
  headerWatermark: { position: "absolute", right: -20, top: 6, fontFamily: font.arabic.regular, fontSize: 120, color: "rgba(255,255,255,0.07)" },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  headerArabic: { fontFamily: font.arabic.regular, color: colors.goldLight, fontSize: 15, marginTop: 16 },
  headerTitle: { fontFamily: font.serif.semibold, fontSize: 25, color: "#fff", lineHeight: 28 },
  headerSub: { fontFamily: font.sans.regular, fontSize: 12.5, color: "rgba(255,255,255,0.66)", marginTop: 6 },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontFamily: font.serif.semibold, fontSize: 16, color: colors.ink },
  list: { padding: 16 },
  card: { height: 172, borderRadius: 20, overflow: "hidden", marginBottom: 14, justifyContent: "flex-end", backgroundColor: colors.hairline },
  cardBody: { padding: 16 },
  countChip: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 9 },
  countChipText: { fontFamily: font.sans.bold, fontSize: 10, color: "#fff" },
  cardTitle: { fontFamily: font.serif.semibold, fontSize: 18, color: "#fff" },
  cardDate: { fontFamily: font.sans.regular, fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
});
