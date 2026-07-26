import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

type ValueSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  formatValue?: (value: number) => string;
  fillColor?: string;
  accessibilityLabel?: string;
};

const THUMB_SIZE = 22;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function snapValue(value: number, min: number, max: number, step: number): number {
  const snapped = min + Math.round((value - min) / step) * step;
  return clamp(snapped, min, max);
}

export function ValueSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onValueChange,
  formatValue = (nextValue) => String(nextValue),
  fillColor = theme.color.deepBlue,
  accessibilityLabel,
}: ValueSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackRef = useRef<View>(null);
  const trackPageXRef = useRef(0);
  const trackWidthRef = useRef(0);
  const lastEmittedValueRef = useRef(value);
  const safeStep = step > 0 ? step : 1;
  const range = Math.max(1, max - min);
  const percent = clamp(((value - min) / range) * 100, 0, 100);
  const fillWidth = trackWidth * (percent / 100);
  const thumbLeft = Math.max(0, Math.min(trackWidth - THUMB_SIZE, fillWidth - THUMB_SIZE / 2));

  useEffect(() => {
    lastEmittedValueRef.current = value;
  }, [value]);

  const handleTrackLayout = useCallback((event: { nativeEvent: { layout: { width: number } } }) => {
    const nextWidth = event.nativeEvent.layout.width;
    trackWidthRef.current = nextWidth;
    setTrackWidth((current) => (current === nextWidth ? current : nextWidth));
    trackRef.current?.measureInWindow((x, _y, measuredWidth) => {
      trackPageXRef.current = x;
      if (measuredWidth > 0) {
        trackWidthRef.current = measuredWidth;
        setTrackWidth((current) => (current === measuredWidth ? current : measuredWidth));
      }
    });
  }, []);

  const emitPageX = useCallback(
    (pageX: number) => {
      const measuredWidth = trackWidthRef.current || trackWidth;
      const localX = pageX - trackPageXRef.current;
      const ratio = measuredWidth > 0 ? localX / measuredWidth : 0;
      const nextValue = snapValue(min + ratio * range, min, max, safeStep);
      if (nextValue === lastEmittedValueRef.current) {
        return;
      }
      lastEmittedValueRef.current = nextValue;
      onValueChange(nextValue);
    },
    [max, min, onValueChange, range, safeStep, trackWidth],
  );

  const measureTrackAndEmit = useCallback(
    (pageX: number) => {
      trackRef.current?.measureInWindow((x, _y, measuredWidth) => {
        trackPageXRef.current = x;
        if (measuredWidth > 0) {
          trackWidthRef.current = measuredWidth;
          setTrackWidth((current) => (current === measuredWidth ? current : measuredWidth));
        }
        emitPageX(pageX);
      });
    },
    [emitPageX],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          measureTrackAndEmit(event.nativeEvent.pageX);
        },
        onPanResponderMove: (event) => {
          emitPageX(event.nativeEvent.pageX);
        },
      }),
    [emitPageX, measureTrackAndEmit],
  );

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text selectable={false} style={styles.label}>
          {label}
        </Text>
        <Text selectable={false} style={styles.value}>
          {formatValue(value)}
        </Text>
      </View>
      <View
        ref={trackRef}
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityValue={{ min, max, now: value, text: formatValue(value) }}
        onLayout={handleTrackLayout}
        style={styles.trackTouchTarget}
        {...panResponder.panHandlers}
      >
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: fillWidth, backgroundColor: fillColor }]} />
          <View style={[styles.thumb, { left: thumbLeft, borderColor: fillColor }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    color: theme.color.graphite,
    fontFamily: theme.font.displayBold,
    fontSize: 13,
  },
  value: {
    color: theme.color.muted,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  trackTouchTarget: {
    height: 34,
    justifyContent: "center",
  },
  track: {
    height: 8,
    justifyContent: "center",
    borderRadius: 4,
    backgroundColor: theme.color.progressTrack,
  },
  trackFill: {
    height: 8,
    borderRadius: 4,
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2,
    backgroundColor: theme.color.paper,
  },
});
