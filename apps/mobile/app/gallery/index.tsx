import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { galleryAlbums } from "@/lib/sampleData";

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Green header */}
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

        <View style={styles.list}>
          {galleryAlbums.map((album) => (
            <Pressable
              key={album.id}
              style={styles.card}
              onPress={() => router.push(`/gallery/${album.id}`)}
            >
              <LinearGradient
                colors={[album.gradient[0], album.gradient[1]]}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.cardAr} allowFontScaling={false}>
                {album.ar}
              </Text>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    overflow: "hidden",
  },
  headerWatermark: { position: "absolute", right: -20, top: 6, fontFamily: font.arabic.regular, fontSize: 120, color: "rgba(255,255,255,0.07)" },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerArabic: { fontFamily: font.arabic.regular, color: colors.goldLight, fontSize: 15, marginTop: 16 },
  headerTitle: { fontFamily: font.serif.semibold, fontSize: 25, color: "#fff", lineHeight: 28 },
  headerSub: { fontFamily: font.sans.regular, fontSize: 12.5, color: "rgba(255,255,255,0.66)", marginTop: 6 },

  list: { padding: 16 },
  card: { height: 172, borderRadius: 20, overflow: "hidden", marginBottom: 14, justifyContent: "flex-end" },
  cardAr: { position: "absolute", right: -6, top: -16, fontFamily: font.arabic.regular, fontSize: 90, color: "rgba(255,255,255,0.16)" },
  cardBody: { padding: 16 },
  countChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 9,
  },
  countChipText: { fontFamily: font.sans.bold, fontSize: 10, color: "#fff" },
  cardTitle: { fontFamily: font.serif.semibold, fontSize: 18, color: "#fff" },
  cardDate: { fontFamily: font.sans.regular, fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
});
