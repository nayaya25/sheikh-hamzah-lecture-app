import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import { GradientCover } from "@/components/GradientCover";
import { SearchField } from "@/components/SearchField";
import { gradientForLecture, lectureById } from "@/lib/catalog";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { usePlayer } from "@/lib/player";
import { downloads } from "@/lib/sampleData";

export default function DownloadsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, arabic } = useI18n();
  const { play } = usePlayer();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const items = useMemo(() => {
    return downloads
      .map((d) => ({ ...d, lecture: lectureById(d.id) }))
      .filter((d): d is typeof d & { lecture: NonNullable<typeof d.lecture> } => Boolean(d.lecture))
      .filter((d) => !q || `${d.lecture.title} ${d.meta}`.toLowerCase().includes(q));
  }, [q]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={[styles.pad, { paddingTop: insets.top + 16 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.downloads.title}</Text>
            <Text style={styles.arabic} allowFontScaling={false}>
              {arabic.downloads}
            </Text>
          </View>

          {/* Storage card */}
          <LinearGradient
            colors={[colors.greenDeep, colors.greenHighlight]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.storageCard}
          >
            <Text style={styles.storageLabel}>Offline storage</Text>
            <Text style={styles.storageValue}>
              1.4 GB <Text style={styles.storageOf}>of 4 GB used</Text>
            </Text>
            <View style={styles.storageTrack}>
              <View style={styles.storageFill} />
            </View>
            <Text style={styles.storageNote}>Available offline · plays without data</Text>
          </LinearGradient>

          <View style={{ marginTop: 16 }}>
            <SearchField value={query} onChangeText={setQuery} placeholder="Search downloads…" />
          </View>
        </View>

        <View style={styles.list}>
          {items.map((d) => (
            <Pressable
              key={d.id}
              style={styles.row}
              onPress={() => {
                play(d.lecture);
                router.push("/player");
              }}
            >
              <GradientCover gradient={gradientForLecture(d.lecture)} style={styles.cover}>
                <Ionicons name="play" size={16} color="#fff" />
              </GradientCover>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {d.lecture.title}
                </Text>
                <Text style={styles.rowMeta}>{d.meta}</Text>
              </View>
              <MaterialCommunityIcons name="check-circle" size={22} color={colors.greenMid} />
            </Pressable>
          ))}
          {items.length === 0 ? <Text style={styles.empty}>{t.downloads.empty}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  pad: { paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 2 },
  title: { fontFamily: font.serif.semibold, fontSize: 26, color: colors.ink },
  arabic: { fontFamily: font.arabic.regular, fontSize: 19, color: colors.gold },

  storageCard: { marginTop: 16, borderRadius: 18, padding: 16, overflow: "hidden" },
  storageLabel: { fontFamily: font.sans.regular, fontSize: 12, color: "rgba(255,255,255,0.75)" },
  storageValue: { fontFamily: font.serif.semibold, fontSize: 20, color: "#fff", marginTop: 3 },
  storageOf: { fontFamily: font.sans.regular, fontSize: 13, color: "rgba(255,255,255,0.6)" },
  storageTrack: { height: 6, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 3, marginTop: 12, overflow: "hidden" },
  storageFill: { width: "35%", height: "100%", backgroundColor: colors.goldLight, borderRadius: 3 },
  storageNote: { fontFamily: font.sans.regular, fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 8 },

  list: { paddingHorizontal: 16, paddingTop: 18 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 16,
    padding: 11,
    marginBottom: 11,
  },
  cover: { width: 52, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontFamily: font.serif.semibold, fontSize: 13.5, color: colors.ink },
  rowMeta: { fontFamily: font.sans.regular, fontSize: 11, color: colors.mutedAlt, marginTop: 3 },
  empty: { fontFamily: font.sans.medium, fontSize: 13, color: colors.faint, textAlign: "center", paddingTop: 24 },
});
