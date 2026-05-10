import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";
import { Button } from "./button";

type ProjectLoadStateProps = {
  ready: boolean;
  width: number;
  onBack: () => void;
};

export function ProjectLoadState({ ready, width, onBack }: ProjectLoadStateProps) {
  return (
    <View style={styles.surface}>
      <View style={[styles.container, { width }]}>
        {!ready ? (
          <ActivityIndicator color={theme.color.deepBlue} />
        ) : (
          <>
            <Text selectable style={styles.message}>
              프로젝트를 찾을 수 없습니다.
            </Text>
            <Button title="라이브러리" onPress={onBack} style={styles.button} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    backgroundColor: theme.color.linen,
  },
  container: {
    flex: 1,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  message: {
    color: theme.color.muted,
    textAlign: "center",
  },
  button: {
    marginTop: 16,
  },
});
