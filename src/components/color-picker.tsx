import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import {
  alphaByteToPercent,
  alphaPercentToByte,
  hexToRgba,
  hsvToRgb,
  rgbaToHex6,
  rgbaToHex8,
  rgbToHsv,
  type HsvColor,
  type RgbaColor,
} from "../drawing/color";
import { theme } from "../theme";

type ColorPickerProps = {
  color: string;
  onColorChange: (color: string) => void;
};

type GradientBarProps = {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
  stops: { offset: string; color: string; opacity?: number }[];
  formatValue: (value: number) => string;
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function parseNumericInput(value: string): number {
  const parsed = Number.parseInt(value.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, "_");
}

function GradientBar({ label, value, max, onChange, stops, formatValue }: GradientBarProps) {
  const [width, setWidth] = useState(0);
  const barRef = useRef<View>(null);
  const barPageXRef = useRef(0);
  const barWidthRef = useRef(0);
  const lastEmittedValueRef = useRef(value);
  const gradientId = `${safeId(useId())}_${label}`;
  const percent = max > 0 ? clamp(value / max, 0, 1) : 0;
  const thumbLeft = Math.max(0, Math.min(width - 18, width * percent - 9));

  useEffect(() => {
    lastEmittedValueRef.current = value;
  }, [value]);

  const handleBarLayout = useCallback((event: { nativeEvent: { layout: { width: number } } }) => {
    const nextWidth = event.nativeEvent.layout.width;
    barWidthRef.current = nextWidth;
    setWidth((current) => (current === nextWidth ? current : nextWidth));
    barRef.current?.measureInWindow((x, _y, measuredWidth) => {
      barPageXRef.current = x;
      if (measuredWidth > 0) {
        barWidthRef.current = measuredWidth;
        setWidth((current) => (current === measuredWidth ? current : measuredWidth));
      }
    });
  }, []);

  const emitPageX = useCallback(
    (pageX: number) => {
      const measuredWidth = barWidthRef.current || width;
      const localX = pageX - barPageXRef.current;
      const ratio = measuredWidth > 0 ? localX / measuredWidth : 0;
      const nextValue = Math.round(clamp(ratio, 0, 1) * max);
      if (nextValue === lastEmittedValueRef.current) {
        return;
      }
      lastEmittedValueRef.current = nextValue;
      onChange(nextValue);
    },
    [max, onChange, width],
  );

  const measureBarAndEmit = useCallback(
    (pageX: number) => {
      barRef.current?.measureInWindow((x, _y, measuredWidth) => {
        barPageXRef.current = x;
        if (measuredWidth > 0) {
          barWidthRef.current = measuredWidth;
          setWidth((current) => (current === measuredWidth ? current : measuredWidth));
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
          measureBarAndEmit(event.nativeEvent.pageX);
        },
        onPanResponderMove: (event) => {
          emitPageX(event.nativeEvent.pageX);
        },
      }),
    [emitPageX, measureBarAndEmit],
  );

  return (
    <View style={styles.barGroup}>
      <View style={styles.labelRow}>
        <Text selectable={false} style={styles.label}>
          {label}
        </Text>
        <Text selectable={false} style={styles.valueLabel}>
          {formatValue(value)}
        </Text>
      </View>
      <View ref={barRef} onLayout={handleBarLayout} style={styles.barTouchTarget} {...panResponder.panHandlers}>
        <Svg width="100%" height="100%" style={styles.barSvg}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              {stops.map((stop) => (
                <Stop key={`${stop.offset}-${stop.color}`} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x={0} y={7} width="100%" height={10} rx={5} fill={`url(#${gradientId})`} />
        </Svg>
        <View style={[styles.barThumb, { left: thumbLeft }]} />
      </View>
    </View>
  );
}

export function ColorPicker({ color, onColorChange }: ColorPickerProps) {
  const rgba = hexToRgba(color);
  const hsv = rgbToHsv(rgba);
  const [squareWidth, setSquareWidth] = useState(0);
  const [squareHeight, setSquareHeight] = useState(0);
  const pickerId = safeId(useId());
  const hueColor = rgbaToHex6({ ...hsvToRgb({ h: hsv.h, s: 100, v: 100 }), a: 255 });
  const solidColor = rgbaToHex6({ ...rgba, a: 255 });
  const alphaPercent = alphaByteToPercent(rgba.a);
  const selectorLeft = squareWidth * (hsv.s / 100);
  const selectorTop = squareHeight * ((100 - hsv.v) / 100);

  function emit(nextRgb: Pick<RgbaColor, "r" | "g" | "b">, alpha = rgba.a) {
    onColorChange(rgbaToHex8({ ...nextRgb, a: alpha }));
  }

  function emitHsv(nextHsv: HsvColor, alpha = rgba.a) {
    emit(hsvToRgb(nextHsv), alpha);
  }

  function pickSaturationValue(x: number, y: number) {
    const width = Math.max(1, squareWidth);
    const height = Math.max(1, squareHeight);
    emitHsv({
      h: hsv.h,
      s: Math.round(clamp(x / width, 0, 1) * 100),
      v: Math.round((1 - clamp(y / height, 0, 1)) * 100),
    });
  }

  const squareResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => pickSaturationValue(event.nativeEvent.locationX, event.nativeEvent.locationY),
        onPanResponderMove: (event) => pickSaturationValue(event.nativeEvent.locationX, event.nativeEvent.locationY),
      }),
    [hsv.h, rgba.a, squareHeight, squareWidth],
  );

  function handleChannelChange(channel: keyof RgbaColor, value: string) {
    const parsed = parseNumericInput(value);
    if (channel === "a") {
      emit(rgba, alphaPercentToByte(parsed));
      return;
    }
    emit({ ...rgba, [channel]: clamp(parsed, 0, 255) }, rgba.a);
  }

  return (
    <View style={styles.container}>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel="색상 선택 영역"
        onLayout={(event) => {
          setSquareWidth(event.nativeEvent.layout.width);
          setSquareHeight(event.nativeEvent.layout.height);
        }}
        style={styles.saturationValueSquare}
        {...squareResponder.panHandlers}
      >
        <Svg width="100%" height="100%" style={styles.squareSvg}>
          <Defs>
            <LinearGradient id={`${pickerId}_white`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id={`${pickerId}_black`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000000" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height="100%" rx={10} fill={hueColor} />
          <Rect x={0} y={0} width="100%" height="100%" rx={10} fill={`url(#${pickerId}_white)`} />
          <Rect x={0} y={0} width="100%" height="100%" rx={10} fill={`url(#${pickerId}_black)`} />
        </Svg>
        <View style={[styles.squareSelector, { left: selectorLeft - 8, top: selectorTop - 8 }]} />
      </View>
      <GradientBar
        label="Hue"
        value={hsv.h}
        max={359}
        onChange={(nextHue) => emitHsv({ ...hsv, h: nextHue })}
        formatValue={(value) => `${value}°`}
        stops={[
          { offset: "0%", color: "#FF0000" },
          { offset: "17%", color: "#FFFF00" },
          { offset: "34%", color: "#00FF00" },
          { offset: "51%", color: "#00FFFF" },
          { offset: "68%", color: "#0000FF" },
          { offset: "85%", color: "#FF00FF" },
          { offset: "100%", color: "#FF0000" },
        ]}
      />
      <GradientBar
        label="Alpha"
        value={alphaPercent}
        max={100}
        onChange={(nextAlpha) => emit(rgba, alphaPercentToByte(nextAlpha))}
        formatValue={(value) => `${value}%`}
        stops={[
          { offset: "0%", color: solidColor, opacity: 0 },
          { offset: "100%", color: solidColor, opacity: 1 },
        ]}
      />
      <View style={styles.inputGrid}>
        {(["r", "g", "b", "a"] as const).map((channel) => (
          <View key={channel} style={styles.inputCell}>
            <Text selectable={false} style={styles.inputLabel}>
              {channel.toUpperCase()}
            </Text>
            <TextInput
              accessibilityLabel={`${channel.toUpperCase()} 값`}
              keyboardType="number-pad"
              maxLength={channel === "a" ? 3 : 3}
              onChangeText={(text) => handleChannelChange(channel, text)}
              selectTextOnFocus
              style={styles.input}
              value={String(channel === "a" ? alphaPercent : rgba[channel])}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  saturationValueSquare: {
    height: 148,
    overflow: "hidden",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paperSoft,
  },
  squareSvg: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  squareSelector: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.color.paper,
    backgroundColor: "transparent",
  },
  barGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    color: theme.color.graphite,
    fontSize: 12,
    fontWeight: "700",
  },
  valueLabel: {
    color: theme.color.muted,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  barTouchTarget: {
    height: 24,
    justifyContent: "center",
  },
  barSvg: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  barThumb: {
    position: "absolute",
    top: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.color.paper,
    backgroundColor: "transparent",
  },
  inputGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inputCell: {
    flexGrow: 1,
    flexBasis: "47%",
    minWidth: 92,
    gap: 4,
  },
  inputLabel: {
    color: theme.color.muted,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  input: {
    height: 42,
    borderRadius: theme.radius.xs,
    borderWidth: 1,
    borderColor: theme.color.hairline,
    backgroundColor: theme.color.paper,
    color: theme.color.graphite,
    fontSize: 13,
    lineHeight: 18,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 0,
    textAlign: "center",
  },
});
