// Paper Craft depth is a solid "stacked paper" offset, never a soft blur.
//
// This lives outside `theme.ts` on purpose: it needs `Platform` from
// react-native, while `theme.ts` is imported by model/share modules that the
// plain-Node test runner loads directly (Node cannot parse react-native's
// Flow source). Keeping the tokens pure and the platform-dependent shadows
// here lets both work.
//
// `boxShadow` is honoured on web and the New Architecture; the iOS `shadow*`
// props (radius 0) cover old-architecture iOS. They are emitted per platform
// rather than together, because react-native-web also translates `shadow*`
// into a boxShadow — emitting both there would stack two identical shadows and
// render them roughly twice as dark as designed. `elevation` is never set:
// on Android it can only produce a blur, which breaks the hard offset look.
import { Platform } from "react-native";

function paperShadow(dy: number, opacity: number) {
  return Platform.select({
    ios: {
      shadowColor: "#4A3B2A",
      shadowOpacity: opacity,
      shadowOffset: { width: 0, height: dy },
      shadowRadius: 0,
    },
    default: {
      boxShadow: `0 ${dy}px 0 rgba(74, 59, 42, ${opacity})`,
    },
  });
}

/** Cards, panels, paper sheets. */
export const shadow = paperShadow(3, 0.22);
/** Thumbnails, inputs, compact controls. */
export const shadowSoft = paperShadow(2, 0.2);
/** Primary buttons, floating tool panels. */
export const shadowStrong = paperShadow(3, 0.35);
