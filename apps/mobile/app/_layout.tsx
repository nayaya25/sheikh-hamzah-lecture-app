import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { colors } from "@althaqalayn/theme";
import { MiniPlayer } from "@/components/MiniPlayer";
import { SplashOverlay } from "@/components/SplashOverlay";
import { CatalogProvider } from "@/lib/catalogProvider";
import { useAppFonts } from "@/lib/fonts";
import { I18nProvider } from "@/lib/i18n";
import { PlayerProvider } from "@/lib/player";

// Keep the native splash up until fonts resolve, so text never flashes unstyled.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useAppFonts();

  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nProvider>
          <PlayerProvider>
            <CatalogProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.cream },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="series/[id]" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="player" options={{ animation: "slide_from_bottom" }} />
              <Stack.Screen
                name="language"
                options={{ presentation: "transparentModal", animation: "fade" }}
              />
            </Stack>
            {/* Global mini-player; hides itself on the full player + when idle. */}
            <MiniPlayer />
            {/* Launch splash over everything; self-dismisses after a hold. */}
            <SplashOverlay />
            </CatalogProvider>
          </PlayerProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
