import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import { languageNames } from "@althaqalayn/i18n";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { usePlayer } from "@/lib/player";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang, arabic } = useI18n();
  const { speed, cycleSpeed } = usePlayer();
  const [wifiOnly, setWifiOnly] = useState(true);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Green header */}
        <LinearGradient
          colors={[colors.greenDeep, colors.greenMid]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 14 }]}
        >
          <Text style={styles.headerWatermark} allowFontScaling={false}>
            {arabic.allah}
          </Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerArabic} allowFontScaling={false}>
            {arabic.settings}
          </Text>
          <Text style={styles.headerTitle}>{t.settings.title}</Text>
        </LinearGradient>

        <View style={styles.body}>
          {/* Profile */}
          <View style={styles.profile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter} allowFontScaling={false}>
                {arabic.emblemLetter}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>
                Sheikh Hamzah Muhammad Lawal <Text style={{ color: colors.gold }}>(QS)</Text>
              </Text>
              <Text style={styles.profileOrg}>Althaqalayn Cultural Foundation</Text>
            </View>
          </View>

          {/* Preferences */}
          <Text style={styles.groupLabel}>{t.settings.preferences.toUpperCase()}</Text>
          <View style={styles.card}>
            <Row
              icon="globe"
              label={t.settings.appLanguage}
              onPress={() => router.push("/language")}
              right={<Text style={styles.value}>{languageNames[lang]}</Text>}
              chevron
            />
            <Row
              icon="align-left"
              label={t.settings.contentLanguage}
              caption="Hausa & English lectures"
              right={<Text style={styles.value}>{t.settings.contentLanguageValue}</Text>}
            />
            <Row
              icon="download"
              label={t.settings.downloadWifiOnly}
              last
              right={
                <Switch
                  value={wifiOnly}
                  onValueChange={setWifiOnly}
                  trackColor={{ false: "#d5cdb8", true: colors.greenDeep }}
                  thumbColor="#fff"
                />
              }
            />
          </View>

          {/* Playback */}
          <Text style={styles.groupLabel}>{t.settings.playback.toUpperCase()}</Text>
          <View style={styles.card}>
            <Row
              icon="clock"
              label={t.settings.defaultSpeed}
              onPress={cycleSpeed}
              right={<Text style={[styles.value, styles.valueStrong]}>{speed}×</Text>}
            />
            <Row
              icon="list"
              label={t.settings.manageDownloads}
              last
              right={<Text style={styles.value}>1.4 GB</Text>}
            />
          </View>

          {/* About */}
          <Text style={styles.groupLabel}>{t.settings.about.toUpperCase()}</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutText}>
              A public archive of the lectures, sermons and tafsīr of Sheikh Hamzah Muhammad Lawal,
              preserved and shared freely by the Althaqalayn Cultural Foundation.
            </Text>
            <View style={styles.aboutActions}>
              <Pressable style={styles.aboutBtn}>
                <Text style={styles.aboutBtnText}>{t.settings.shareApp}</Text>
              </Pressable>
              <Pressable style={styles.aboutBtn}>
                <Text style={styles.aboutBtnText}>{t.settings.contact}</Text>
              </Pressable>
            </View>
            <Text style={styles.version}>{t.settings.version} 1.0 · صدقة جارية</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({
  icon,
  label,
  caption,
  right,
  onPress,
  chevron,
  last,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  caption?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable style={[styles.row, last ? null : styles.rowBorder]} onPress={onPress} disabled={!onPress}>
      <Feather name={icon} size={20} color={colors.greenMid} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {caption ? <Text style={styles.rowCaption}>{caption}</Text> : null}
      </View>
      {right}
      {chevron ? <Feather name="chevron-right" size={18} color="#c4ccc5" /> : null}
    </Pressable>
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
  headerWatermark: { position: "absolute", right: -24, top: 0, fontFamily: font.arabic.regular, fontSize: 120, color: "rgba(255,255,255,0.06)" },
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

  body: { paddingHorizontal: 16, paddingTop: 18 },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 18,
    padding: 16,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.greenDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontFamily: font.arabic.bold, fontSize: 26, color: colors.goldLight },
  profileName: { fontFamily: font.serif.semibold, fontSize: 15, color: colors.ink },
  profileOrg: { fontFamily: font.sans.regular, fontSize: 11.5, color: colors.mutedAlt, marginTop: 2 },

  groupLabel: { fontFamily: font.sans.extrabold, fontSize: 10.5, letterSpacing: 1, color: "#a3ada4", marginTop: 22, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.hairline, borderRadius: 18, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 13, padding: 15 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#F0E9D9" },
  rowLabel: { fontFamily: font.sans.semibold, fontSize: 14, color: colors.ink },
  rowCaption: { fontFamily: font.sans.regular, fontSize: 11, color: colors.mutedAlt, marginTop: 1 },
  value: { fontFamily: font.sans.regular, fontSize: 12.5, color: colors.mutedAlt },
  valueStrong: { fontFamily: font.sans.bold, color: colors.greenMid },

  aboutCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.hairline, borderRadius: 18, padding: 16 },
  aboutText: { fontFamily: font.sans.regular, fontSize: 13, color: "#5a665f", lineHeight: 21 },
  aboutActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  aboutBtn: { flex: 1, alignItems: "center", backgroundColor: "#EAF3EF", borderRadius: 11, paddingVertical: 10 },
  aboutBtnText: { fontFamily: font.sans.bold, fontSize: 12.5, color: colors.greenMid },
  version: { textAlign: "center", fontFamily: font.sans.regular, fontSize: 10.5, color: "#b3bcb4", marginTop: 14 },
});
