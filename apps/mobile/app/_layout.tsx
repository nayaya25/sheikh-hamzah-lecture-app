import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { MiniPlayer } from "@/components/MiniPlayer";
import { SplashOverlay } from "@/components/SplashOverlay";
import { BookmarksProvider } from "@/lib/bookmarks";
import { CatalogProvider } from "@/lib/catalogProvider";
import { DownloadsProvider } from "@/lib/downloads";
import { useAppFonts } from "@/lib/fonts";
import { I18nProvider } from "@/lib/i18n";
import { PlayerProvider } from "@/lib/player";
import { ThemeProvider, useTheme } from "@/lib/theme";

// Keep the native splash up until fonts resolve, so text never flashes unstyled.
SplashScreen.preventAutoHideAsync();

function RootStack() {
  const t = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.c.bg },
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
  );
}

export default function RootLayout() {
  const [loaded, error] = useAppFonts();

  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <ThemeProvider>
            <I18nProvider>
              <DownloadsProvider>
                <BookmarksProvider>
                  <PlayerProvider>
                    <CatalogProvider>
                      <RootStack />
                      {/* Global mini-player; hides itself on the full player + when idle. */}
                      <MiniPlayer />
                      {/* Launch splash over everything; self-dismisses once the catalog loads. */}
                      <SplashOverlay />
                    </CatalogProvider>
                  </PlayerProvider>
                </BookmarksProvider>
              </DownloadsProvider>
            </I18nProvider>
          </ThemeProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
