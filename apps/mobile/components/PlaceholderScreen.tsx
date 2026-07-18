import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import { font } from "@/lib/fonts";

/**
 * Cream-background screen shell with the design's title + Arabic sub-label.
 * Stands in for Library/Search/Downloads until each is built out.
 */
export function PlaceholderScreen({ title, arabic }: { title: string; arabic: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.arabic} allowFontScaling={false}>
          {arabic}
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.note}>Coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  title: { fontFamily: font.serif.semibold, fontSize: 26, color: colors.ink },
  arabic: { fontFamily: font.arabic.regular, fontSize: 19, color: colors.gold },
  body: { flex: 1, alignItems: "center", justifyContent: "center" },
  note: { fontFamily: font.sans.medium, fontSize: 13, color: colors.faint },
});
