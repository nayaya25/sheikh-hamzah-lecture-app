import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { languageNames } from "@althaqalayn/i18n";
import { lectureById } from "@/lib/catalog";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { readerSample } from "@/lib/sampleData";

const MIN_SCALE = 0.8;
const MAX_SCALE = 1.5;
const STEP = 0.12;
const PAPER = "#F4ECD8";

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang } = useI18n();
  const [scale, setScale] = useState(1);

  const lecture = lectureById(id);
  const body = readerSample[lang];
  const bodySize = 15 * scale;
  const bodyStyle = { fontFamily: font.serif.regular, fontSize: bodySize, lineHeight: bodySize * 1.9, color: "#3a2c10" };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {/* Sticky top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={19} color="#3a2c10" />
        </Pressable>
        <Text style={styles.reading}>
          {t.reader.reading.toUpperCase()} · {languageNames[lang]}
        </Text>
        <Pressable
          style={styles.iconBtn}
          onPress={() => setScale((s) => Math.max(MIN_SCALE, +(s - STEP).toFixed(2)))}
        >
          <Text style={styles.aSmall}>A</Text>
        </Pressable>
        <Pressable
          style={styles.iconBtn}
          onPress={() => setScale((s) => Math.min(MAX_SCALE, +(s + STEP).toFixed(2)))}
        >
          <Text style={styles.aLarge}>A</Text>
        </Pressable>
        <Pressable style={styles.iconBtn}>
          <Feather name="bookmark" size={17} color="#b98f35" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.bismillah} allowFontScaling={false}>
          ﷽
        </Text>
        <Text style={styles.title}>{lecture?.title ?? "Reading"}</Text>
        {lecture ? <Text style={styles.sub}>{lecture.sub}</Text> : null}

        <View style={styles.divider}>
          <View style={styles.rule} />
          <Text style={styles.star} allowFontScaling={false}>
            ✦
          </Text>
          <View style={styles.rule} />
        </View>

        <Text style={[bodyStyle, styles.para]}>
          <Text style={styles.dropCap} allowFontScaling={false}>
            {body.cap}
          </Text>
          {body.paragraphs[0]}
        </Text>
        <Text style={[bodyStyle, styles.para]}>{body.paragraphs[1]}</Text>
        <Text style={[bodyStyle, styles.para]}>{body.paragraphs[2]}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAPER },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(244,236,216,0.96)",
    borderBottomWidth: 1,
    borderBottomColor: "#e2d3ab",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2d3ab",
    alignItems: "center",
    justifyContent: "center",
  },
  reading: { flex: 1, textAlign: "center", fontFamily: font.sans.bold, fontSize: 11, letterSpacing: 1, color: "#8a6f3a" },
  aSmall: { fontFamily: font.serif.regular, fontSize: 13, color: "#3a2c10" },
  aLarge: { fontFamily: font.serif.regular, fontSize: 18, color: "#3a2c10" },

  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 60, maxWidth: 360, alignSelf: "center" },
  bismillah: { textAlign: "center", fontFamily: font.arabic.regular, fontSize: 22, color: "#b98f35" },
  title: { textAlign: "center", fontFamily: font.serif.semibold, fontSize: 24, color: "#2a2008", marginTop: 14, lineHeight: 30 },
  sub: { textAlign: "center", fontFamily: font.sans.regular, fontSize: 12, color: "#8a6f3a", marginTop: 8 },
  divider: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 18 },
  rule: { width: 40, height: 1, backgroundColor: "#c9ab5f" },
  star: { fontFamily: font.arabic.regular, color: "#b98f35" },
  para: { marginBottom: 16 },
  dropCap: { fontFamily: font.serif.semibold, fontSize: 40, color: "#b98f35" },
});
