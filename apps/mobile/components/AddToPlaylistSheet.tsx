import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { Touchable } from "@/components/ui/Touchable";
import { useI18n } from "@/lib/i18n";
import { usePlaylists } from "@/lib/playlists";
import { useTheme } from "@/lib/theme";

interface AddToPlaylistValue {
  /** Open the "Add to playlist" sheet for a given lecture id. */
  open: (lectureId: string) => void;
}

export const AddToPlaylistContext = createContext<AddToPlaylistValue | null>(null);

/**
 * Mounts a single global "Add to playlist" bottom sheet and exposes an
 * imperative `open(lectureId)` via `useAddToPlaylist()`, so the widely-reused
 * lecture rows and the player can open it without each owning a sheet. Follows
 * the `ValueSheet`/`QueueSheet` bottom-sheet pattern.
 */
export function AddToPlaylistProvider({ children }: { children: ReactNode }) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [lectureId, setLectureId] = useState<string | null>(null);

  const open = useCallback((id: string) => {
    setLectureId(id);
    sheetRef.current?.present();
  }, []);

  const value = useMemo<AddToPlaylistValue>(() => ({ open }), [open]);

  return (
    <AddToPlaylistContext.Provider value={value}>
      {children}
      <AddToPlaylistSheet ref={sheetRef} lectureId={lectureId} />
    </AddToPlaylistContext.Provider>
  );
}

export function useAddToPlaylist(): AddToPlaylistValue {
  const ctx = useContext(AddToPlaylistContext);
  if (!ctx) throw new Error("useAddToPlaylist must be used within an AddToPlaylistProvider");
  return ctx;
}

const AddToPlaylistSheet = forwardRef<BottomSheetModal, { lectureId: string | null }>(
  function AddToPlaylistSheet({ lectureId }, ref) {
  const t = useTheme();
  const { t: msgs } = useI18n();
  const { playlists, isInPlaylist, addToPlaylist, removeFromPlaylist, createPlaylist } = usePlaylists();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  const toggle = (playlistId: string) => {
    if (!lectureId) return;
    if (isInPlaylist(playlistId, lectureId)) removeFromPlaylist(playlistId, lectureId);
    else addToPlaylist(playlistId, lectureId);
  };

  const submitNew = () => {
    const trimmed = name.trim();
    if (!trimmed || !lectureId) return;
    const id = createPlaylist(trimmed);
    addToPlaylist(id, lectureId);
    setName("");
    setCreating(false);
  };

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      maxDynamicContentSize={520}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: t.c.surface }}
      handleIndicatorStyle={{ backgroundColor: t.c.border }}
      onDismiss={() => {
        setCreating(false);
        setName("");
      }}
    >
      <BottomSheetView style={[styles.content, { paddingBottom: t.space.xl }]}>
        <AppText variant="section" style={styles.title}>
          {msgs.playlists.addToPlaylist}
        </AppText>

        {playlists.length === 0 && !creating ? (
          <AppText variant="body" color="textMuted" style={{ paddingVertical: 12 }}>
            {msgs.playlists.empty}
          </AppText>
        ) : null}

        {playlists.map((p) => {
          const checked = lectureId ? isInPlaylist(p.id, lectureId) : false;
          return (
            <Touchable
              key={p.id}
              onPress={() => toggle(p.id)}
              style={[styles.row, { borderBottomColor: t.c.borderSubtle }]}
              accessibilityState={{ checked }}
            >
              <View style={[styles.rowIcon, { backgroundColor: t.c.surfaceAlt, borderRadius: t.radii.md }]}>
                <Icon name="list" size={18} color="accent" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="bodyLg" numberOfLines={1}>
                  {p.name}
                </AppText>
                <AppText variant="caption" color="textFaint" style={{ marginTop: 1 }}>
                  {p.lectureIds.length} {msgs.playlists.lecturesCount}
                </AppText>
              </View>
              {checked ? (
                <Icon name="check-circle" size={22} color="accent" />
              ) : (
                <Icon name="circle" size={22} color="textFaint" />
              )}
            </Touchable>
          );
        })}

        {creating ? (
          <View style={styles.createRow}>
            <BottomSheetTextInput
              value={name}
              onChangeText={setName}
              placeholder={msgs.playlists.namePlaceholder}
              placeholderTextColor={t.c.textFaint}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={submitNew}
              style={[
                styles.input,
                { color: t.c.textPrimary, backgroundColor: t.c.surfaceAlt, borderColor: t.c.border, borderRadius: t.radii.md },
              ]}
            />
            <Touchable
              haptic="light"
              onPress={submitNew}
              disabled={!name.trim()}
              style={styles.createBtn}
              accessibilityLabel={msgs.playlists.create}
            >
              <AppText variant="body" color={name.trim() ? "accent" : "textFaint"} style={{ fontWeight: "700" }}>
                {msgs.playlists.create}
              </AppText>
            </Touchable>
          </View>
        ) : (
          <Touchable
            haptic="light"
            onPress={() => setCreating(true)}
            style={[styles.newRow, { borderColor: t.c.border, borderRadius: t.radii.md }]}
            accessibilityLabel={msgs.playlists.new}
          >
            <Icon name="plus" size={18} color="accent" />
            <AppText variant="bodyLg" color="accent" style={{ fontWeight: "700" }}>
              {msgs.playlists.new}
            </AppText>
          </Touchable>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingTop: 6 },
  title: { marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 12, borderBottomWidth: 1 },
  rowIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  newRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderStyle: "dashed", paddingVertical: 14, marginTop: 16 },
  createRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  input: { flex: 1, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  createBtn: { paddingVertical: 10, paddingHorizontal: 12 },
});
