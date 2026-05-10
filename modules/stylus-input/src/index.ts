import type { ViewProps } from "react-native";

import StylusInputView from "./stylus-input-view";

export type PointerType = "stylus" | "pencil" | "touch" | "mouse";

export type StylusPoint = {
  x: number;
  y: number;
  timestamp: number;
  pressure: number;
  rawPressure?: number;
  pointerType: PointerType;
  phase: "begin" | "move" | "end" | "cancel";
  tiltX?: number;
  tiltY?: number;
  altitude?: number;
  azimuth?: number;
  orientation?: number;
};

export type StylusBatchEvent = {
  strokeId: string;
  points: StylusPoint[];
};

export type NativeStylusBatchEvent = {
  nativeEvent: StylusBatchEvent;
};

export type StylusInputViewProps = ViewProps & {
  enabled?: boolean;
  onStylusBatch?: (event: NativeStylusBatchEvent) => void;
};

export { StylusInputView };
