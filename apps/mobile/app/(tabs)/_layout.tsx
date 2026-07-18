import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors } from "@althaqalayn/theme";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";

/**
 * Persistent bottom navigation (Home · Library · Search · Downloads).
 * Active = deep green + bold label; inactive = muted green (spec §Bottom nav).
 * Hidden on the full Player, which lives outside this tab group.
 */
export default function TabsLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.greenDeep,
        tabBarInactiveTintColor: colors.navInactive,
        tabBarStyle: {
          backgroundColor: colors.cardWhite,
          borderTopColor: colors.hairline,
          borderTopWidth: 1,
          height: 66,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: { fontFamily: font.sans.semibold, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.nav.home,
          tabBarIcon: ({ color }) => <Feather name="home" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t.nav.library,
          tabBarIcon: ({ color }) => <Feather name="book-open" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t.nav.search,
          tabBarIcon: ({ color }) => <Feather name="search" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: t.nav.downloads,
          tabBarIcon: ({ color }) => <Feather name="download" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
