import React, { useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import AppButton from "./AppButton";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

type AuthRequiredProps = {
    onRetry: () => Promise<void> | void;
};

export default function AuthRequired ({ onRetry } : AuthRequiredProps) {
    const [loading, setLoading] = useState(false);
    const scheme = useColorScheme() ?? "light";
    const badgeBg = useMemo(
        () => (scheme === "dark" ? "rgba(59, 130, 248,0.2" : "rgba(0,122,255,0.15"),
        [scheme]
    );

    const handleRetry = async () => {
        if (loading) return;
        try {
            setLoading(true);
            await onRetry()
        } finally {
            setLoading(false)
        }
    };

    return (
        <ThemedView
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: 24,
            }}
        >
            <View style={{width: "100%", maxWidth: 420, alignItems: "center"}}>
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
                    <ThemedText style={{fontSize: 28}}>🔒</ThemedText>
                </View>

                <ThemedText type="title" style={{ textAlign: "center" }}>
                    Unlock Cardy
                </ThemedText>
                <ThemedText
                    style={{
                        textAlign: "center",
                        marginTop: 8,
                        opacity: 0.8,
                        lineHeight: 22,
                    }}
                >
                    Authentication required to continue.
                </ThemedText>
                <View style={{height: 20}}/>

                {loading ? (
                    <ActivityIndicator size="small"/>
                ):(
                    <AppButton title="Unlock" onPress={handleRetry} fullWidth />
                )}

                <ThemedText style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
                    Use your device&#39;s screen lock
                </ThemedText>
            </View>
        </ThemedView>
    )
}