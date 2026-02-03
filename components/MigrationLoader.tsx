/**
 * Migration Loader Component
 * 
 * Shows a loading screen during card migration process
 * Displays migration status and progress to the user
 */

import { Colors } from "@/constants/theme";
import { useMigration } from "@/context/MigrationContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ThemedText } from "./themed-text";

export default function MigrationLoader() {
    const { status, migratedCount, error } = useMigration();
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];

    // Don't show loader if migration is completed
    if (status === "completed") {
        return null;
    }

    const getStatusMessage = () => {
        switch (status) {
            case "checking":
                return "Checking for updates...";
            case "migrating":
                return `Migrating ${migratedCount} card${migratedCount !== 1 ? "s" : ""}...`;
            case "error":
                return "Migration encountered an issue";
            default:
                return "Initializing...";
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case "checking":
                return <ActivityIndicator size="large" color={palette.primary} />;
            case "migrating":
                return (
                    <View style={styles.iconContainer}>
                        <MaterialIcons name="sync" size={48} color={palette.primary} />
                        <ActivityIndicator
                            size="small"
                            color={palette.primary}
                            style={styles.spinnerOverlay}
                        />
                    </View>
                );
            case "error":
                return <MaterialIcons name="error-outline" size={48} color={palette.danger} />;
            default:
                return <ActivityIndicator size="large" color={palette.primary} />;
        }
    };

    const getSubMessage = () => {
        switch (status) {
            case "checking":
                return "Please wait while we check your data...";
            case "migrating":
                return "Upgrading your card storage to the latest security standards";
            case "error":
                return error || "Don't worry, your cards are safe. Continuing...";
            default:
                return "Setting up your secure card storage...";
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: palette.background }]}>
            <View style={styles.content}>
                {getStatusIcon()}

                <ThemedText style={styles.title}>{getStatusMessage()}</ThemedText>

                <ThemedText style={[styles.subtitle, { color: palette.secondary }]}>
                    {getSubMessage()}
                </ThemedText>

                {status === "migrating" && (
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { backgroundColor: palette.primary, width: "80%" },
                                ]}
                            />
                        </View>
                    </View>
                )}

                {status === "error" && (
                    <ThemedText style={[styles.errorNote, { color: palette.secondary }]}>
                        The app will continue in a moment...
                    </ThemedText>
                )}

                <View style={styles.securityBadge}>
                    <MaterialIcons name="lock" size={16} color={palette.primary} />
                    <ThemedText style={[styles.securityText, { color: palette.secondary }]}>
                        Your cards are encrypted and secure
                    </ThemedText>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    content: {
        alignItems: "center",
        maxWidth: 320,
    },
    iconContainer: {
        position: "relative",
        marginBottom: 24,
    },
    spinnerOverlay: {
        position: "absolute",
        top: "50%",
        left: "50%",
        marginTop: -10,
        marginLeft: -10,
    },
    title: {
        fontSize: 20,
        fontWeight: "600",
        textAlign: "center",
        marginTop: 24,
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 14,
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 24,
    },
    progressContainer: {
        width: "100%",
        marginTop: 16,
        marginBottom: 24,
    },
    progressBar: {
        height: 4,
        borderRadius: 2,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: 2,
    },
    errorNote: {
        fontSize: 12,
        textAlign: "center",
        marginTop: 12,
        fontStyle: "italic",
    },
    securityBadge: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 32,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "rgba(0, 0, 0, 0.05)",
    },
    securityText: {
        fontSize: 12,
        marginLeft: 6,
    },
});
