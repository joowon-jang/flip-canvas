import "react-native-gesture-handler";

import { Gaegu_400Regular, Gaegu_700Bold, useFonts } from "@expo-google-fonts/gaegu";
import { Stack } from "expo-router";
import { StatusBar, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { initializeAds } from "../src/ads/rewarded";
import { ProjectStoreProvider } from "../src/state/project-store";
import { theme } from "../src/theme";

export default function RootLayout() {
  void initializeAds().catch(() => undefined);

  // Register BOTH handwritten faces under explicit family names.
  // React Native does not synthesize bold for a custom family on Android —
  // `fontFamily: "Gaegu"` + `fontWeight: "700"` silently falls back to the
  // system face, which is why the headings did not look like the design.
  // Every display style in the design is Gaegu 700, so it maps to "Gaegu-Bold".
  const [fontsLoaded] = useFonts({
    Gaegu: Gaegu_400Regular,
    "Gaegu-Bold": Gaegu_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

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
