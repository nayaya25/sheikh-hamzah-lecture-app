import { ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { colors } from "@althaqalayn/theme";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { Header } from "@/components/ui/Header";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { Touchable } from "@/components/ui/Touchable";
import { useCatalog } from "@/lib/catalogProvider";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function GalleryScreen() {
  const router = useRouter();
  const t = useTheme();
  const { t: msgs } = useI18n();
  const { albums, loading } = useCatalog();

  return (
    <View style={[styles.root, { backgroundColor: t.c.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Header title={msgs.gallery.title} arabic="معرض" onBack={() => router.back()} />
        <AppText color="textMuted" style={[styles.headerSub, { paddingHorizontal: t.space.screen }]}>
          Photographs from Foundation events
        </AppText>

        {loading ? (
          <View style={styles.list}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={172} radius={20} style={{ marginBottom: 14 }} />
            ))}
          </View>
        ) : albums.length === 0 ? (
          <EmptyState icon="image" title="No albums yet" />
        ) : (
          <View style={styles.list}>
            {albums.map((album) => (
              <Touchable
                key={album.id}
                haptic="light"
                style={[styles.card, { backgroundColor: t.c.border }]}
                onPress={() => router.push(`/gallery/${album.id}`)}
              >
                {album.cover ? (
                  <Image
                    source={{ uri: album.cover }}
                    style={[StyleSheet.absoluteFill, { backgroundColor: colors.greenDeep }]}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.greenDeep }]} />
                )}
                <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)"]} style={StyleSheet.absoluteFill} />
                <View style={styles.cardBody}>
                  <View style={styles.countChip}>
                    <Icon name="image" size={12} color="#FFFFFF" />
                    <AppText variant="caption" color="#FFFFFF" style={styles.countChipText}>
                      {album.count} {msgs.gallery.photos}
                    </AppText>
                  </View>
                  <AppText variant="cardTitle" color="#FFFFFF" style={styles.cardTitle}>
                    {album.title}
                  </AppText>
                  <AppText variant="caption" color="rgba(255,255,255,0.8)" style={styles.cardDate}>
                    {album.date}
                  </AppText>
                </View>
              </Touchable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerSub: { fontSize: 12.5, marginTop: 10 },
  list: { padding: 16 },
  card: { height: 172, borderRadius: 20, overflow: "hidden", marginBottom: 14, justifyContent: "flex-end" },
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
  countChipText: { fontWeight: "700" },
  cardTitle: { fontWeight: "600" },
  cardDate: { marginTop: 2 },
});
