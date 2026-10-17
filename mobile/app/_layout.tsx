/**
 * CPA Platform — Mobile Root Layout
 * React Query Client + Offline Cache Persistence + Auth & Theme Providers
 */
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "../stores/useAuthStore";
import { useThemeStore } from "../stores/useThemeStore";
import { useOfflineStore } from "../stores/useOfflineStore";
import { offlineSyncService } from "../services/offlineSyncService";
import { notificationService } from "../services/notificationService";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 jam cache
      staleTime: 1000 * 60 * 5, // 5 menit fresh
      retry: 2,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "CPA_REACT_QUERY_OFFLINE_CACHE",
});

function RootNavigation() {
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();
  const { loadStoredTheme, isDark } = useThemeStore();
  const { loadQueue } = useOfflineStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    async function init() {
      await Promise.all([loadStoredAuth(), loadStoredTheme(), loadQueue()]);
      await notificationService.registerForPushNotifications();
      await offlineSyncService.syncQueue();
      await SplashScreen.hideAsync().catch(() => {});
    }
    init();
  }, []);

  // Auth Guard
  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments]);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="warehouse/index" options={{ headerShown: false }} />
        <Stack.Screen name="aging/index" options={{ headerShown: false }} />
        <Stack.Screen name="distributions/index" options={{ headerShown: false }} />
        <Stack.Screen name="forecast/index" options={{ headerShown: false }} />
        <Stack.Screen name="reports/index" options={{ headerShown: false }} />
        <Stack.Screen name="database-graph/index" options={{ headerShown: false }} />
        <Stack.Screen name="docs/index" options={{ headerShown: false }} />
        <Stack.Screen name="settings/index" options={{ headerShown: false }} />
        <Stack.Screen name="scanner/index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <RootNavigation />
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
