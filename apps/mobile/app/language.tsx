import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import { languageNames } from "@althaqalayn/i18n";
import type { Language } from "@althaqalayn/types";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

const NATIVE: Record<Language, string> = { en: "English", ha: "Harshen Hausa" };

/**
 * App-language bottom sheet (transparent modal). Selecting a row flips the whole
 * UI immediately via the i18n context; Done dismisses.
 */
export default function LanguageSheet() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang, setLang, arabic } = useI18n();
  const th = useTheme();

  return (
    <Pressable style={styles.scrim} onPress={() => router.back()}>
      <Pressable
        style={[styles.sheet, { backgroundColor: th.c.surface, paddingBottom: insets.bottom + 24 }]}
        onPress={() => {}}
      >
        <View style={[styles.handle, { backgroundColor: th.c.border }]} />
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: th.c.textPrimary }]}>{t.languageSheet.title}</Text>
          <Text style={[styles.arabic, { color: th.c.accent }]} allowFontScaling={false}>
            {arabic.language}
          </Text>
        </View>
        <Text style={[styles.note, { color: th.c.textMuted }]}>{t.languageSheet.note}</Text>

        {(["en", "ha"] as const).map((code) => {
          const selected = lang === code;
          return (
            <Pressable
              key={code}
              style={[
                styles.langRow,
                selected
                  ? { borderWidth: 1.5, borderColor: colors.greenDeep, backgroundColor: th.c.surfaceAlt }
                  : { borderWidth: 1, borderColor: th.c.borderSubtle, backgroundColor: th.c.surfaceAlt },
              ]}
              onPress={() => setLang(code)}
            >
              <View>
                <Text style={[styles.langName, { color: th.c.textPrimary }]}>{languageNames[code]}</Text>
                <Text style={[styles.langNative, { color: th.c.textMuted }]}>{NATIVE[code]}</Text>
              </View>
              <View
                style={[
                  styles.check,
                  selected
                    ? { backgroundColor: colors.greenDeep }
                    : { borderWidth: 1.5, borderColor: th.c.borderSubtle },
                ]}
              >
                {selected ? <Feather name="check" size={14} color={th.c.onBrand} /> : null}
              </View>
            </Pressable>
          );
        })}

        <Pressable style={[styles.done, { backgroundColor: colors.greenDeep }]} onPress={() => router.back()}>
          <Text style={[styles.doneText, { color: th.c.onBrand }]}>{t.languageSheet.done}</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(20,30,26,0.45)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  titleRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 },
  title: { fontFamily: font.serif.semibold, fontSize: 19 },
  arabic: { fontFamily: font.arabic.regular, fontSize: 17 },
  note: { fontFamily: font.sans.regular, fontSize: 12, marginBottom: 16 },
  langRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  langName: { fontFamily: font.sans.bold, fontSize: 15 },
  langNative: { fontFamily: font.sans.regular, fontSize: 11.5, marginTop: 1 },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  done: { marginTop: 6, alignItems: "center", borderRadius: 14, paddingVertical: 14 },
  doneText: { fontFamily: font.sans.bold, fontSize: 14 },
});
