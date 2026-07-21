import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors } from "@althaqalayn/theme";
import { font } from "@/lib/fonts";
import { TAB_BAR_HEIGHT } from "@/lib/layout";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

/**
 * Persistent bottom navigation (Home · Library · Search · Downloads).
 * Floating translucent bar (blurred, absolute) so content scrolls beneath it;
 * icons swap outline→filled on focus. Hidden on the full Player, which lives
 * outside this tab group.
 */
export default function TabsLayout() {
  const { t } = useI18n();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme.scheme === "dark";
  const activeTint = isDark ? colors.goldLight : colors.greenDeep;

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          void Haptics.selectionAsync();
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: theme.c.textFaint,
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.c.border,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: { fontFamily: font.sans.semibold, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.nav.home,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t.nav.library,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "library" : "library-outline"} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t.nav.search,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: t.nav.downloads,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "download" : "download-outline"} size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
