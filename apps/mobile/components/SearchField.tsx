import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { font } from "@/lib/fonts";
import { useTheme } from "@/lib/theme";

/** Themed search/filter input with a leading magnifier and optional clear (×). */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={[styles.field, { backgroundColor: t.c.surface, borderColor: t.c.border }]}>
      <Feather name="search" size={16} color={t.c.textFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.c.textFaint}
        style={[styles.input, { color: t.c.textPrimary }]}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <Pressable hitSlop={8} onPress={() => onChangeText("")}>
          <Feather name="x-circle" size={16} color={t.c.textFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { flex: 1, fontFamily: font.sans.regular, fontSize: 13.5, padding: 0 },
});
