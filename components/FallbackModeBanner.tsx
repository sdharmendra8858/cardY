/**
 * Fallback Mode Banner
 * 
 * Shows a banner when app is running in fallback mode (reading from old storage)
 * Provides option to retry migration
 */

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { isInFallbackMode, migrateCards, resetMigrationStatus } from "@/utils/migration";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Toast from "react-native-toast-message";
import { ThemedText } from "./themed-text";

export default function FallbackModeBanner() {
    const [inFallbackMode, setInFallbackMode] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];

    useEffect(() => {
        checkFallbackMode();
    }, []);

    const checkFallbackMode = async () => {
        try {
            const fallback = await isInFallbackMode();
            setInFallbackMode(fallback);
        } catch (error) {
            console.error("Failed to check fallback mode:", error);
        }
    };

    const handleRetryMigration = async () => {
        try {
            setIsRetrying(true);

            // Reset migration status
            await resetMigrationStatus();

            // Retry migration
            const result = await migrateCards();

            if (result.success && result.migratedCount > 0) {
                Toast.show({
                    type: "success",
                    text1: "Migration Successful",
                    text2: `${result.migratedCount} cards migrated to secure storage`,
                });
                setInFallbackMode(false);
            } else if (result.errors.length > 0) {
                Toast.show({
                    type: "error",
                    text1: "Migration Failed",
                    text2: "Your cards are still accessible",
                });
            }
        } catch (error) {
            Toast.show({
                type: "error",
                text1: "Migration Error",
                text2: "Your cards are still accessible",
            });
        } finally {
            setIsRetrying(false);
        }
    };

    if (!inFallbackMode) {
        return null;
    }

    return (
        <View style={[styles.banner, { backgroundColor: "#FFA500" }]}>
            <View style={styles.content}>
                <MaterialIcons name="info-outline" size={20} color="#fff" />
                <View style={styles.textContainer}>
                    <ThemedText style={styles.title}>
                        Running in Compatibility Mode
                    </ThemedText>
                    <ThemedText style={styles.subtitle}>
                        Your cards are safe but using older storage
                    </ThemedText>
                </View>
            </View>

            <Pressable
                style={styles.retryButton}
                onPress={handleRetryMigration}
                disabled={isRetrying}
            >
                {isRetrying ? (
                    <ThemedText style={styles.retryText}>Retrying...</ThemedText>
                ) : (
                    <ThemedText style={styles.retryText}>Upgrade Storage</ThemedText>
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        padding: 12,
        flexDirection: "column",
        gap: 8,
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: "600",
        color: "#fff",
    },
    subtitle: {
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.9)",
        marginTop: 2,
    },
    retryButton: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        alignSelf: "flex-start",
        marginLeft: 32,
    },
    retryText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#fff",
    },
});
