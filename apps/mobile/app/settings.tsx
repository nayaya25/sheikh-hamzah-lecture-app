import { useEffect, useState, type ReactNode } from "react";
import { Image, Linking, ScrollView, Share, StyleSheet, Switch, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography } from "@althaqalayn/theme";
import { languageNames } from "@althaqalayn/i18n";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { Touchable } from "@/components/ui/Touchable";
import { logos } from "@/lib/assets";
import { formatBytes } from "@/lib/catalog";
import { useDownloads } from "@/lib/downloads";
import { useI18n } from "@/lib/i18n";
import { usePlayer } from "@/lib/player";
import { totalBytes } from "@/lib/reducers/downloads";
import { loadJSON, saveJSON, StorageKeys } from "@/lib/storage";
import { useTheme, useThemeMode, type ThemeMode } from "@/lib/theme";

// Foundation contact address - the same one published on the /privacy page.
const CONTACT_EMAIL = "althaqalaynfoundation@gmail.com";
const SHARE_MESSAGE =
  "Althaqalayn - a free archive of the lectures, sermons and tafsīr of Sheikh Hamzah Muhammad Lawal, preserved and shared by the Althaqalayn Cultural Foundation.";

const APPEARANCE_OPTIONS: { key: ThemeMode; icon: string }[] = [
  { key: "system", icon: "smartphone" },
  { key: "light", icon: "sun" },
  { key: "dark", icon: "moon" },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useTheme();
  const { t: msgs, lang, arabic } = useI18n();
  const { mode, setMode } = useThemeMode();
  const { speed, cycleSpeed } = usePlayer();
  const { state } = useDownloads();
  const [wifiOnly, setWifiOnlyState] = useState(true);

  // Hydrate the persisted Wi-Fi-only preference once on mount.
  useEffect(() => {
    void loadJSON<boolean>(StorageKeys.wifiOnly, true).then(setWifiOnlyState);
  }, []);

  const setWifiOnly = (value: boolean) => {
    setWifiOnlyState(value);
    void saveJSON(StorageKeys.wifiOnly, value);
  };

  const storageUsed = formatBytes(totalBytes(state));
  const appearanceCaption =
    mode === "system"
      ? msgs.appearance.systemCaption
      : mode === "light"
        ? msgs.appearance.lightCaption
        : msgs.appearance.darkCaption;

  const onShareApp = () => {
    void Share.share({ message: SHARE_MESSAGE });
  };
  const onContact = () => {
    void Linking.openURL(`mailto:${CONTACT_EMAIL}`);
  };

  return (
    <View style={[styles.root, { backgroundColor: t.c.bg }]}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Green header - brand chrome, fixed regardless of theme (matches Home). */}
        <LinearGradient
          colors={[colors.greenDeep, colors.greenMid]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + t.space.md, borderBottomLeftRadius: t.radii.hero, borderBottomRightRadius: t.radii.hero }]}
        >
          <AppText allowFontScaling={false} style={styles.headerWatermark}>
            {arabic.allah}
          </AppText>
          <Touchable haptic="light" onPress={() => router.back()} accessibilityLabel={msgs.common.goBack} style={styles.backBtn}>
            <Icon name="chevron-left" size={20} color="#fff" />
          </Touchable>
          <AppText allowFontScaling={false} color={colors.goldLight} style={styles.headerArabic}>
            {arabic.settings}
          </AppText>
          <AppText variant="screen" color="onBrand" style={{ marginTop: 2 }}>
            {msgs.settings.title}
          </AppText>
        </LinearGradient>

        <View style={[styles.body, { paddingHorizontal: t.space.lg }]}>
          {/* Profile */}
          <View style={[styles.profile, { backgroundColor: t.c.surface, borderColor: t.c.borderSubtle, borderRadius: t.radii.lg }]}>
            <View style={[styles.avatar, { borderRadius: t.radii.pill }]}>
              <Image source={logos.icon} style={{ width: 40, height: 40 }} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="cardTitle" style={{ fontSize: 15 }}>
                Sheikh Hamzah Muhammad Lawal <AppText style={{ color: colors.gold }}>(QS)</AppText>
              </AppText>
              <AppText variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                Althaqalayn Cultural Foundation
              </AppText>
            </View>
          </View>

          {/* Preferences */}
          <GroupLabel>{msgs.settings.preferences.toUpperCase()}</GroupLabel>
          <View style={[styles.card, { backgroundColor: t.c.surface, borderColor: t.c.borderSubtle, borderRadius: t.radii.lg }]}>
            <Row
              icon="sun"
              label={msgs.appearance.title}
              caption={appearanceCaption}
              right={<AppearanceControl mode={mode} setMode={setMode} />}
            />
            <Row
              icon="globe"
              label={msgs.settings.appLanguage}
              onPress={() => router.push("/language")}
              right={<AppText variant="meta" color="textMuted">{languageNames[lang]}</AppText>}
              chevron
            />
            <Row
              icon="align-left"
              label={msgs.settings.contentLanguage}
              right={<AppText variant="meta" color="textMuted">{msgs.settings.contentLanguageValue}</AppText>}
            />
            <Row
              icon="download"
              label={msgs.settings.downloadWifiOnly}
              last
              right={
                <Switch
                  value={wifiOnly}
                  onValueChange={setWifiOnly}
                  trackColor={{ false: t.c.trackInactive, true: t.c.accent }}
                  thumbColor="#fff"
                />
              }
            />
          </View>

          {/* Playback */}
          <GroupLabel>{msgs.settings.playback.toUpperCase()}</GroupLabel>
          <View style={[styles.card, { backgroundColor: t.c.surface, borderColor: t.c.borderSubtle, borderRadius: t.radii.lg }]}>
            <Row
              icon="clock"
              label={msgs.settings.defaultSpeed}
              onPress={cycleSpeed}
              right={
                <AppText variant="meta" color="accent" style={{ fontWeight: "700" }}>
                  {speed}×
                </AppText>
              }
            />
            <Row
              icon="list"
              label={msgs.settings.manageDownloads}
              last
              onPress={() => router.push("/downloads")}
              right={<AppText variant="meta" color="textMuted">{storageUsed}</AppText>}
              chevron
            />
          </View>

          {/* About */}
          <GroupLabel>{msgs.settings.about.toUpperCase()}</GroupLabel>
          <View style={[styles.aboutCard, { backgroundColor: t.c.surface, borderColor: t.c.borderSubtle, borderRadius: t.radii.lg }]}>
            <AppText variant="body" color="textMuted" style={{ lineHeight: 21 }}>
              A public archive of the lectures, sermons and tafsīr of Sheikh Hamzah Muhammad Lawal,
              preserved and shared freely by the Althaqalayn Cultural Foundation.
            </AppText>
            <View style={styles.aboutActions}>
              <Touchable
                haptic="light"
                onPress={onShareApp}
                accessibilityLabel={msgs.settings.shareApp}
                style={[styles.aboutBtn, { backgroundColor: t.c.surfaceAlt, borderRadius: t.radii.md }]}
              >
                <AppText variant="meta" color="accent" style={{ fontWeight: "700" }}>
                  {msgs.settings.shareApp}
                </AppText>
              </Touchable>
              <Touchable
                haptic="light"
                onPress={onContact}
                accessibilityLabel={msgs.settings.contact}
                style={[styles.aboutBtn, { backgroundColor: t.c.surfaceAlt, borderRadius: t.radii.md }]}
              >
                <AppText variant="meta" color="accent" style={{ fontWeight: "700" }}>
                  {msgs.settings.contact}
                </AppText>
              </Touchable>
            </View>
            <AppText variant="caption" color="textFaint" style={{ textAlign: "center", marginTop: t.space.md }}>
              {msgs.settings.version} 1.0 · صدقة جارية
            </AppText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** Compact System / Light / Dark segmented control, wired to `useThemeMode()`. */
function AppearanceControl({ mode, setMode }: { mode: ThemeMode; setMode: (m: ThemeMode) => void }) {
  const t = useTheme();
  const { t: msgs } = useI18n();
  return (
    <View style={[styles.segmented, { backgroundColor: t.c.surfaceAlt, borderRadius: t.radii.pill }]}>
      {APPEARANCE_OPTIONS.map((opt) => {
        const active = mode === opt.key;
        const label = msgs.appearance[opt.key];
        return (
          <Touchable
            key={opt.key}
            haptic="light"
            onPress={() => setMode(opt.key)}
            accessibilityLabel={`${msgs.appearance.title}: ${label}`}
            accessibilityState={{ selected: active }}
            style={[
              styles.segmentBtn,
              { borderRadius: t.radii.pill },
              active ? { backgroundColor: t.c.surface, ...t.elevation.sm } : null,
            ]}
          >
            <Icon name={opt.icon} size={14} color={active ? "accent" : "textFaint"} />
          </Touchable>
        );
      })}
    </View>
  );
}

function GroupLabel({ children }: { children: string }) {
  const t = useTheme();
  return (
    <AppText variant="caption" color="textFaint" style={{ letterSpacing: 1, fontWeight: "800", marginTop: t.space.xl - 2, marginBottom: t.space.sm, marginLeft: 4 }}>
      {children}
    </AppText>
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
  icon: string;
  label: string;
  caption?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  last?: boolean;
}) {
  const t = useTheme();
  return (
    <Touchable
      haptic="light"
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, !last ? [styles.rowBorder, { borderBottomColor: t.c.borderSubtle }] : null]}
    >
      <Icon name={icon} size={20} color="accent" />
      <View style={{ flex: 1 }}>
        <AppText variant="body" style={{ fontWeight: "600" }}>{label}</AppText>
        {caption ? (
          <AppText variant="caption" color="textMuted" style={{ marginTop: 1 }}>
            {caption}
          </AppText>
        ) : null}
      </View>
      {right}
      {chevron ? <Icon name="chevron-right" size={18} color="textFaint" /> : null}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 22, overflow: "hidden" },
  headerWatermark: { position: "absolute", right: -24, top: 0, fontFamily: typography.fonts.arabic, fontSize: 120, color: "rgba(255,255,255,0.06)" },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  headerArabic: { fontFamily: typography.fonts.arabic, fontSize: 15, marginTop: 16 },

  body: { paddingTop: 18 },
  profile: { flexDirection: "row", alignItems: "center", gap: 13, borderWidth: 1, padding: 16 },
  avatar: { width: 54, height: 54, backgroundColor: colors.greenDeep, alignItems: "center", justifyContent: "center" },

  card: { borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 13, padding: 15 },
  rowBorder: { borderBottomWidth: 1 },

  segmented: { flexDirection: "row", padding: 3, gap: 2 },
  segmentBtn: { width: 30, height: 26, alignItems: "center", justifyContent: "center" },

  aboutCard: { borderWidth: 1, padding: 16 },
  aboutActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  aboutBtn: { flex: 1, alignItems: "center", paddingVertical: 10 },
});
