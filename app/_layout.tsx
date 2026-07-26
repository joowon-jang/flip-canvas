import "react-native-gesture-handler";

import { Stack } from "expo-router";
import { StatusBar, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { initializeAds } from "../src/ads/rewarded";
import { ProjectStoreProvider } from "../src/state/project-store";
import { theme } from "../src/theme";

export default function RootLayout() {
  void initializeAds().catch(() => undefined);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ProjectStoreProvider>
          <StatusBar barStyle="dark-content" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.color.linen },
            }}
          />
        </ProjectStoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.linen,
  },
});
