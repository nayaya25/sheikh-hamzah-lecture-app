import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NamePromptModal } from "@/components/NamePromptModal";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { Header } from "@/components/ui/Header";
import { Icon } from "@/components/ui/Icon";
import { Touchable } from "@/components/ui/Touchable";
import { MINI_PLAYER_GAP, MINI_PLAYER_HEIGHT, TAB_BAR_HEIGHT } from "@/lib/layout";
import { useI18n } from "@/lib/i18n";
import { usePlaylists } from "@/lib/playlists";
import { useTheme } from "@/lib/theme";

export default function PlaylistsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useTheme();
  const { t: msgs } = useI18n();
  const { playlists, createPlaylist } = usePlaylists();
  const [prompt, setPrompt] = useState(false);

  const onCreate = (name: string) => {
    setPrompt(false);
    const id = createPlaylist(name);
    router.push(`/playlists/${id}`);
  };

  const bottomPadding = TAB_BAR_HEIGHT + insets.bottom + MINI_PLAYER_GAP + MINI_PLAYER_HEIGHT + t.space.lg;

  return (
    <View style={[styles.root, { backgroundColor: t.c.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPadding }}>
        <Header
          title={msgs.playlists.title}
          arabic="قوائم"
          onBack={() => router.back()}
          right={
            <Touchable
              haptic="light"
              onPress={() => setPrompt(true)}
              accessibilityLabel={msgs.playlists.new}
              style={styles.headerAction}
            >
              <Icon name="plus" size={22} color="#FFFFFF" />
            </Touchable>
          }
        />

        {playlists.length === 0 ? (
          <EmptyState
            icon="list"
            title={msgs.playlists.empty}
            body={msgs.playlists.emptyDetail}
            action={{ label: msgs.playlists.new, onPress: () => setPrompt(true) }}
          />
        ) : (
          <View style={styles.list}>
            {playlists.map((p) => (
              <Touchable
                key={p.id}
                haptic="light"
                onPress={() => router.push(`/playlists/${p.id}`)}
                style={[styles.row, { borderBottomColor: t.c.borderSubtle }]}
              >
                <View style={[styles.cover, { backgroundColor: t.c.surfaceAlt, borderRadius: t.radii.md }]}>
                  <Icon name="list" size={22} color="accent" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="cardTitle" numberOfLines={1}>
                    {p.name}
                  </AppText>
                  <AppText variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                    {p.lectureIds.length} {msgs.playlists.lecturesCount}
                  </AppText>
                </View>
                <Icon name="chevron-right" size={18} color="textFaint" />
              </Touchable>
            ))}
          </View>
        )}
      </ScrollView>

      <NamePromptModal
        visible={prompt}
        title={msgs.playlists.new}
        placeholder={msgs.playlists.namePlaceholder}
        confirmLabel={msgs.playlists.create}
        cancelLabel={msgs.common.cancel}
        onSubmit={onCreate}
        onCancel={() => setPrompt(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerAction: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  list: { paddingTop: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  cover: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
});
