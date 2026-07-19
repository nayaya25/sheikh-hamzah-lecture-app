import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import { languageNames } from "@althaqalayn/i18n";
import type { Language } from "@althaqalayn/types";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";

const NATIVE: Record<Language, string> = { en: "English", ha: "Harshen Hausa" };

/**
 * App-language bottom sheet (transparent modal). Selecting a row flips the whole
 * UI immediately via the i18n context; Done dismisses.
 */
export default function LanguageSheet() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang, setLang, arabic } = useI18n();

  return (
    <Pressable style={styles.scrim} onPress={() => router.back()}>
      <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]} onPress={() => {}}>
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t.languageSheet.title}</Text>
          <Text style={styles.arabic} allowFontScaling={false}>
            {arabic.language}
          </Text>
        </View>
        <Text style={styles.note}>{t.languageSheet.note}</Text>

        {(["en", "ha"] as const).map((code) => {
          const selected = lang === code;
          return (
            <Pressable
              key={code}
              style={[styles.langRow, selected ? styles.langRowOn : styles.langRowOff]}
              onPress={() => setLang(code)}
            >
              <View>
                <Text style={styles.langName}>{languageNames[code]}</Text>
                <Text style={styles.langNative}>{NATIVE[code]}</Text>
              </View>
              <View style={[styles.check, selected ? styles.checkOn : styles.checkOff]}>
                {selected ? <Feather name="check" size={14} color="#fff" /> : null}
              </View>
            </Pressable>
          );
        })}

        <Pressable style={styles.done} onPress={() => router.back()}>
          <Text style={styles.doneText}>{t.languageSheet.done}</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(20,30,26,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#d8cfb9", alignSelf: "center", marginBottom: 16 },
  titleRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 },
  title: { fontFamily: font.serif.semibold, fontSize: 19, color: colors.ink },
  arabic: { fontFamily: font.arabic.regular, fontSize: 17, color: colors.gold },
  note: { fontFamily: font.sans.regular, fontSize: 12, color: colors.mutedAlt, marginBottom: 16 },
  langRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  langRowOn: { borderWidth: 1.5, borderColor: colors.greenDeep, backgroundColor: "#EAF3EF" },
  langRowOff: { borderWidth: 1, borderColor: "#E4DCC9", backgroundColor: "#fff" },
  langName: { fontFamily: font.sans.bold, fontSize: 15, color: colors.ink },
  langNative: { fontFamily: font.sans.regular, fontSize: 11.5, color: colors.mutedAlt, marginTop: 1 },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: colors.greenDeep },
  checkOff: { borderWidth: 1.5, borderColor: "#cfc7b2" },
  done: { marginTop: 6, alignItems: "center", backgroundColor: colors.greenDeep, borderRadius: 14, paddingVertical: 14 },
  doneText: { fontFamily: font.sans.bold, fontSize: 14, color: "#fff" },
});
