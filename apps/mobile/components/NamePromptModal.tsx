import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, TextInput, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Touchable } from "@/components/ui/Touchable";
import { useTheme } from "@/lib/theme";

/**
 * A small cross-platform name prompt (RN `Modal` + `TextInput`) — used to
 * create and rename playlists. Deliberately not `Alert.prompt`, which is
 * iOS-only. Controlled via `visible`; `onSubmit` fires with the trimmed name
 * (empty submissions are ignored).
 */
export function NamePromptModal({
  visible,
  title,
  placeholder,
  initialValue = "",
  confirmLabel,
  cancelLabel,
  onSubmit,
  onCancel,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  initialValue?: string;
  confirmLabel: string;
  cancelLabel: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const t = useTheme();
  const [value, setValue] = useState(initialValue);

  // Reset the field to the incoming initial value each time the modal opens.
  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const trimmed = value.trim();
  const submit = () => {
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <Touchable haptic="none" style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel={cancelLabel} />
        <View style={[styles.card, { backgroundColor: t.c.surface, borderColor: t.c.borderSubtle, borderRadius: t.radii.lg }]}>
          <AppText variant="section" style={{ marginBottom: t.space.md }}>
            {title}
          </AppText>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={t.c.textFaint}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
            style={[
              styles.input,
              { color: t.c.textPrimary, backgroundColor: t.c.surfaceAlt, borderColor: t.c.border, borderRadius: t.radii.md },
            ]}
          />
          <View style={styles.actions}>
            <Touchable haptic="light" onPress={onCancel} style={styles.action} accessibilityLabel={cancelLabel}>
              <AppText variant="body" color="textMuted" style={{ fontWeight: "700" }}>
                {cancelLabel}
              </AppText>
            </Touchable>
            <Touchable
              haptic="light"
              onPress={submit}
              disabled={!trimmed}
              style={styles.action}
              accessibilityLabel={confirmLabel}
            >
              <AppText variant="body" color={trimmed ? "accent" : "textFaint"} style={{ fontWeight: "700" }}>
                {confirmLabel}
              </AppText>
            </Touchable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 32 },
  card: { width: "100%", maxWidth: 400, borderWidth: 1, padding: 20 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 16 },
  action: { paddingVertical: 8, paddingHorizontal: 14 },
});
