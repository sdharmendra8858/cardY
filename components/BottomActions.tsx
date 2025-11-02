import React from "react";
import { View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BottomActionsProps = ViewProps & {
    children: React.ReactNode;
}

export default function BottomActions({
    style,
    children,
    ...rest
}: BottomActionsProps) {
    const insets = useSafeAreaInsets();
    return (
        <View
            pointerEvents="box-none"
            style={[
                {
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: "center"
                },
                style
            ]}
            {...rest}
        >
            <View
                style={{
                    width: "100%",
                    paddingHorizontal: 16,
                    paddingTop: 8,
                    paddingBottom: Math.max(16, insets.bottom + 8),
                }}
            >
                {children}
            </View>
        </View>
    )
}