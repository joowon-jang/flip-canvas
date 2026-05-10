import { useMemo, useRef } from "react";
import { requireNativeView } from "expo";
import Constants from "expo-constants";
import { PanResponder, View } from "react-native";

import type { StylusInputViewProps } from "./index";

function fallbackPoint(event: any, phase: "begin" | "move" | "end" | "cancel") {
  const nativeEvent = event.nativeEvent;
  return {
    x: nativeEvent.locationX ?? 0,
    y: nativeEvent.locationY ?? 0,
    timestamp: Date.now(),
    pressure: nativeEvent.force ?? 0.5,
    rawPressure: nativeEvent.force ?? 0.5,
    pointerType: "touch" as const,
    phase,
  };
}

function FallbackStylusInputView({ enabled = true, onStylusBatch, style, ...props }: StylusInputViewProps) {
  const strokeIdRef = useRef(`fallback_${Date.now()}`);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => enabled,
        onMoveShouldSetPanResponder: () => enabled,
        onPanResponderGrant: (event) => {
          strokeIdRef.current = `fallback_${Date.now()}`;
          onStylusBatch?.({ nativeEvent: { strokeId: strokeIdRef.current, points: [fallbackPoint(event, "begin")] } });
        },
        onPanResponderMove: (event) => {
          onStylusBatch?.({ nativeEvent: { strokeId: strokeIdRef.current, points: [fallbackPoint(event, "move")] } });
        },
        onPanResponderRelease: (event) => {
          onStylusBatch?.({ nativeEvent: { strokeId: strokeIdRef.current, points: [fallbackPoint(event, "end")] } });
        },
        onPanResponderTerminate: (event) => {
          onStylusBatch?.({ nativeEvent: { strokeId: strokeIdRef.current, points: [fallbackPoint(event, "cancel")] } });
        },
      }),
    [enabled, onStylusBatch],
  );

  return <View {...props} {...responder.panHandlers} collapsable={false} style={style} />;
}

let NativeStylusInputView: React.ComponentType<StylusInputViewProps> | null = null;

if (Constants.appOwnership !== "expo") {
  try {
    NativeStylusInputView = requireNativeView<StylusInputViewProps>("StylusInput");
  } catch {
    NativeStylusInputView = null;
  }
}

export default function StylusInputView(props: StylusInputViewProps) {
  if (NativeStylusInputView) {
    return <NativeStylusInputView {...props} collapsable={false} />;
  }

  return <FallbackStylusInputView {...props} />;
}
