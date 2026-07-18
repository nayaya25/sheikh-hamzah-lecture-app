import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "@althaqalayn/theme";
import { font } from "@/lib/fonts";

/** White search/filter input with a leading magnifier and optional clear (×). */
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
  return (
    <View style={styles.field}>
      <Feather name="search" size={16} color={colors.faint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        style={styles.input}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <Pressable hitSlop={8} onPress={() => onChangeText("")}>
          <Feather name="x-circle" size={16} color={colors.faintAlt} />
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
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E4DCC9",
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { flex: 1, fontFamily: font.sans.regular, fontSize: 13.5, color: colors.ink, padding: 0 },
});
