import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";

export default function DownloadsScreen() {
  const insets = useSafeAreaInsets();
  const { t, arabic } = useI18n();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>{t.downloads.title}</Text>
        <Text style={styles.arabic} allowFontScaling={false}>
          {arabic.downloads}
        </Text>
      </View>

      <View style={styles.body}>
        <Feather name="download-cloud" size={34} color={colors.faint} />
        <Text style={styles.emptyTitle}>{t.downloads.empty}</Text>
        <Text style={styles.emptyBody}>Saved lectures will play offline, without using data.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 4 },
  title: { fontFamily: font.serif.semibold, fontSize: 26, color: colors.ink },
  arabic: { fontFamily: font.arabic.regular, fontSize: 19, color: colors.gold },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 8 },
  emptyTitle: { fontFamily: font.serif.semibold, fontSize: 16, color: colors.ink, marginTop: 6 },
  emptyBody: { fontFamily: font.sans.regular, fontSize: 13, color: colors.muted, textAlign: "center" },
});
