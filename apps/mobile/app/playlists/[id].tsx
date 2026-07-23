import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import { MediaBadge } from "@/components/MediaBadge";
import { NamePromptModal } from "@/components/NamePromptModal";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { Header } from "@/components/ui/Header";
import { Icon } from "@/components/ui/Icon";
import { Touchable } from "@/components/ui/Touchable";
import { durationLabel, type Playable } from "@/lib/catalog";
import { useCatalog } from "@/lib/catalogProvider";
import { useI18n } from "@/lib/i18n";
import { MINI_PLAYER_GAP, MINI_PLAYER_HEIGHT, TAB_BAR_HEIGHT } from "@/lib/layout";
import { usePlayer } from "@/lib/player";
import { usePlaylists } from "@/lib/playlists";
import { useTheme } from "@/lib/theme";

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useTheme();
  const { t: msgs } = useI18n();
  const { current, playCollection } = usePlayer();
  const { lectureById } = useCatalog();
  const { playlists, renamePlaylist, deletePlaylist, removeFromPlaylist, reorderPlaylist } = usePlaylists();
  const [renaming, setRenaming] = useState(false);

  const playlist = playlists.find((p) => p.id === id);

  // Resolve the playlist's ids to lectures, dropping any that no longer exist
  // in the catalog. `rawIndexOf` maps a visible position back to its index in
  // the stored `lectureIds` array so reorder stays correct across gaps.
  const items = useMemo<Playable[]>(
    () =>
      (playlist?.lectureIds ?? [])
        .map((lid) => lectureById(lid))
        .filter((l): l is Playable => Boolean(l)),
    [playlist?.lectureIds, lectureById],
  );

  if (!playlist) {
    return (
      <View style={[styles.root, { backgroundColor: t.c.bg }]}>
        <StatusBar style={t.scheme === "dark" ? "light" : "dark"} />
        <Header title={msgs.playlists.title} onBack={() => router.back()} />
        <EmptyState icon="alert-triangle" title={msgs.playlists.notFound} />
      </View>
    );
  }

  const rawIndexOf = (visibleIndex: number) => playlist.lectureIds.indexOf(items[visibleIndex].id);

  const openAt = (index: number) => {
    const l = items[index];
    if (!l) return;
    if (l.type === "text") {
      router.push(`/reader/${l.id}`);
      return;
    }
    playCollection(items, index);
    router.push("/player");
  };

  const onPlayAll = () => {
    if (items.length === 0) return;
    playCollection(items, 0);
    router.push("/player");
  };

  const onDelete = () => {
    Alert.alert(msgs.playlists.delete, msgs.playlists.deleteConfirm, [
      { text: msgs.common.cancel, style: "cancel" },
      {
        text: msgs.playlists.delete,
        style: "destructive",
        onPress: () => {
          deletePlaylist(playlist.id);
          router.back();
        },
      },
    ]);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    reorderPlaylist(playlist.id, rawIndexOf(from), playlist.lectureIds.indexOf(items[to].id));
  };

  const bottomPadding = TAB_BAR_HEIGHT + insets.bottom + MINI_PLAYER_GAP + MINI_PLAYER_HEIGHT + t.space.lg;

  return (
    <View style={[styles.root, { backgroundColor: t.c.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPadding }}>
        <Header
          title={playlist.name}
          arabic="قائمة"
          onBack={() => router.back()}
          right={
            <View style={styles.headerActions}>
              <Touchable haptic="light" onPress={() => setRenaming(true)} accessibilityLabel={msgs.playlists.rename} style={styles.headerAction}>
                <Icon name="edit-2" size={18} color="#FFFFFF" />
              </Touchable>
              <Touchable haptic="light" onPress={onDelete} accessibilityLabel={msgs.playlists.delete} style={styles.headerAction}>
                <Icon name="trash-2" size={18} color="#FFFFFF" />
              </Touchable>
            </View>
          }
        />

        <View style={[styles.meta, { paddingHorizontal: t.space.screen }]}>
          <AppText variant="caption" color="textMuted">
            {items.length} {msgs.playlists.lecturesCount}
          </AppText>
          {items.length > 0 ? (
            <Touchable haptic="light" onPress={onPlayAll} accessibilityLabel={msgs.playlists.playAll} style={[styles.playAll, { borderRadius: t.radii.pill }]}>
              <Icon name="play" size={15} color={colors.greenDeep} />
              <AppText variant="meta" color={colors.greenDeep} style={{ fontWeight: "800" }}>
                {msgs.playlists.playAll}
              </AppText>
            </Touchable>
          ) : null}
        </View>

        {items.length === 0 ? (
          <EmptyState icon="list" title={msgs.playlists.empty} body={msgs.playlists.emptyDetail} />
        ) : (
          <View style={styles.list}>
            {items.map((l, i) => {
              const isCurrent = current?.id === l.id;
              return (
                <View key={l.id} style={[styles.row, { borderBottomColor: t.c.borderSubtle }]}>
                  <Touchable onPress={() => openAt(i)} style={styles.rowMain}>
                    <AppText variant="caption" color="textFaint" style={styles.rowNum}>
                      {i + 1}
                    </AppText>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText variant="body" color={isCurrent ? "accent" : "textPrimary"} numberOfLines={2} style={{ fontWeight: "600" }}>
                        {l.title}
                      </AppText>
                      <View style={styles.rowMeta}>
                        <MediaBadge type={l.type} />
                        <AppText variant="caption" color="textMuted">
                          {durationLabel(l)}
                        </AppText>
                      </View>
                    </View>
                  </Touchable>
                  <View style={styles.rowActions}>
                    <Touchable onPress={() => move(i, i - 1)} disabled={i === 0} hitSlop={6} accessibilityLabel={msgs.player.moveUpA11y} style={styles.actionBtn}>
                      <Icon name="chevron-up" size={20} color={i === 0 ? "textFaint" : "textMuted"} />
                    </Touchable>
                    <Touchable onPress={() => move(i, i + 1)} disabled={i === items.length - 1} hitSlop={6} accessibilityLabel={msgs.player.moveDownA11y} style={styles.actionBtn}>
                      <Icon name="chevron-down" size={20} color={i === items.length - 1 ? "textFaint" : "textMuted"} />
                    </Touchable>
                    <Touchable onPress={() => removeFromPlaylist(playlist.id, l.id)} hitSlop={6} accessibilityLabel={msgs.playlists.removeItem} style={styles.actionBtn}>
                      <Icon name="x" size={19} color="textFaint" />
                    </Touchable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <NamePromptModal
        visible={renaming}
        title={msgs.playlists.rename}
        placeholder={msgs.playlists.namePlaceholder}
        initialValue={playlist.name}
        confirmLabel={msgs.playlists.rename}
        cancelLabel={msgs.common.cancel}
        onSubmit={(name) => {
          renamePlaylist(playlist.id, name);
          setRenaming(false);
        }}
        onCancel={() => setRenaming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerActions: { flexDirection: "row", gap: 8 },
  headerAction: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  meta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 16, paddingBottom: 4 },
  playAll: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: colors.goldLight, paddingHorizontal: 16, paddingVertical: 9 },
  list: { paddingTop: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0 },
  rowNum: { width: 20, textAlign: "center", fontVariant: ["tabular-nums"] },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  rowActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  actionBtn: { padding: 5 },
});
