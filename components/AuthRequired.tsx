import { Colors } from "@/constants/theme";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Text, View, useColorScheme as useRNColorScheme } from "react-native";
import AppButton from "./AppButton";

type AuthRequiredProps = {
    onRetry: () => Promise<void> | void;
};

export default function AuthRequired({ onRetry }: AuthRequiredProps) {
    const [loading, setLoading] = useState(false);
    const scheme = useRNColorScheme() ?? "light";
    const badgeBg = useMemo(
        () => (scheme === "dark" ? "rgba(59,130,246,0.2)" : "rgba(0,122,255,0.15)"),
        [scheme]
    );

    const handleRetry = async () => {
        if (loading) return;
        try {
            setLoading(true);
            await onRetry();
        } finally {
            setLoading(false);
        }
    };

    const palette = Colors[scheme];

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: 24,
                backgroundColor: palette.background,
            }}
        >
            <View style={{ width: "100%", maxWidth: 420, alignItems: "center" }}>
                <View 
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: badgeBg,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 16,
                    }}
                >
                    <Text style={{fontSize: 28, color: palette.text}}>🔒</Text>
                </View>

                <Text 
                    style={{ 
                        textAlign: "center",
                        fontSize: 32,
                        fontWeight: "bold",
                        color: palette.text
                    }}
                >
                    Unlock Cardy
                </Text>
                <Text
                    style={{
                        textAlign: "center",
                        marginTop: 8,
                        opacity: 0.8,
                        lineHeight: 22,
                        color: palette.text,
                    }}
                >
                    Authentication required to continue.
                </Text>
                <View style={{height: 20}}/>

                {loading ? (
                    <ActivityIndicator size="small"/>
                ):(
                    <AppButton 
                        title="Unlock" 
                        onPress={handleRetry} 
                        fullWidth 
                        style={{ backgroundColor: palette.primary }}
                        textStyle={{ color: palette.onPrimary }}
                    />
                )}

                <Text 
                    style={{ 
                        marginTop: 12, 
                        fontSize: 12, 
                        opacity: 0.7,
                        color: palette.text
                    }}
                >
                    Use your device&#39;s screen lock
                </Text>
            </View>
        </View>
    )
}