import { View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../theme";

type AppSurfaceProps = ViewProps & {
  noScroll?: boolean;
};

export function AppSurface({ children, style, noScroll = false, ...props }: AppSurfaceProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      {...props}
      style={[
        {
          flex: 1,
          backgroundColor: theme.color.linen,
          paddingTop: noScroll ? Math.max(insets.top, 18) : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
