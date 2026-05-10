import { useMemo, useRef } from "react";
import { PanResponder, View } from "react-native";

import type { StylusInputViewProps } from "./index";

function eventPoint(event: any, phase: "begin" | "move" | "end" | "cancel") {
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

export default function StylusInputView({ enabled = true, onStylusBatch, style, ...props }: StylusInputViewProps) {
  const strokeIdRef = useRef(`web_${Date.now()}`);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => enabled,
        onMoveShouldSetPanResponder: () => enabled,
        onPanResponderGrant: (event) => {
          strokeIdRef.current = `web_${Date.now()}`;
          onStylusBatch?.({ nativeEvent: { strokeId: strokeIdRef.current, points: [eventPoint(event, "begin")] } });
        },
        onPanResponderMove: (event) => {
          onStylusBatch?.({ nativeEvent: { strokeId: strokeIdRef.current, points: [eventPoint(event, "move")] } });
        },
        onPanResponderRelease: (event) => {
          onStylusBatch?.({ nativeEvent: { strokeId: strokeIdRef.current, points: [eventPoint(event, "end")] } });
        },
        onPanResponderTerminate: (event) => {
          onStylusBatch?.({ nativeEvent: { strokeId: strokeIdRef.current, points: [eventPoint(event, "cancel")] } });
        },
      }),
    [enabled, onStylusBatch],
  );

  return <View {...props} {...responder.panHandlers} style={style} />;
}
