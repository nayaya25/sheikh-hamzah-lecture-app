import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { colors } from "@althaqalayn/theme";
import { font } from "@/lib/fonts";
import { TAB_BAR_HEIGHT } from "@/lib/layout";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

/**
 * Persistent bottom navigation (Home · Library · Search · Downloads).
 *
 * Custom, modern tab bar (see docs/superpowers/prototypes/mobile-modern.html):
 * an elevated card with rounded top corners floating over the content, a slim
 * gold tick above the active tab, and a gold icon/label on that tab while the
 * rest stay muted. Theme-aware for light + dark; docks above the mini-player,
 * which owns its own offset from the shared TAB_BAR_HEIGHT constant. The full
 * Player lives outside this tab group and so never shows the bar.
 */
export default function TabsLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      tabBar={(props) => <ModernTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.nav.home,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t.nav.library,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "library" : "library-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t.nav.search,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: t.nav.downloads,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "download" : "download-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

/** Curved, elevated bar with a gold active tick + gold tint (muted otherwise). */
function ModernTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme.scheme === "dark";

  const activeTint = isDark ? colors.goldLight : colors.gold;
  const inactiveTint = theme.c.textFaint;

  return (
    <View
      style={[
        styles.bar,
        {
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: theme.c.surface,
          borderTopColor: theme.c.border,
          shadowColor: isDark ? "#000000" : colors.greenDeepest,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const tint = focused ? activeTint : inactiveTint;
        const label =
          typeof options.title === "string" ? options.title : route.name;

        const onPress = () => {
          void Haptics.selectionAsync();
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: "tabLongPress", target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={label}
            android_ripple={{ color: theme.c.borderSubtle, borderless: true }}
            style={styles.tab}
          >
            <View style={styles.tick}>
              {focused ? (
                <View style={[styles.tickBar, { backgroundColor: colors.gold }]} />
              ) : null}
            </View>
            {options.tabBarIcon?.({ focused, color: tint, size: 22 })}
            <Text
              numberOfLines={1}
              style={[styles.label, { color: tint }]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: 8,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    // Upward shadow so the bar reads as elevated over the content.
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingTop: 6,
  },
  tick: {
    position: "absolute",
    top: 0,
    height: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  tickBar: {
    width: 26,
    height: 3,
    borderRadius: 3,
  },
  label: {
    fontFamily: font.sans.semibold,
    fontSize: 11,
  },
});
