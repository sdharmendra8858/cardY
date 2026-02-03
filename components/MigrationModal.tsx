/**
 * Migration Modal Component
 * 
 * Shows a modal during card migration process
 * Only visible when migration is actually needed
 */

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    View
} from "react-native";
import { ThemedText } from "./themed-text";

interface MigrationModalProps {
    visible: boolean;
    status: "idle" | "checking" | "migrating" | "completed" | "error";
    migratedCount: number;
    error?: string | null;
    onDone?: () => void;
}

export default function MigrationModal({
    visible,
    status,
    migratedCount,
    error,
    onDone,
}: MigrationModalProps) {
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];

    const showDoneButton = status === "completed" && migratedCount > 0;

    const getStatusMessage = () => {
        switch (status) {
            case "checking":
                return "Checking for updates...";
            case "migrating":
                return `Migrating ${migratedCount} card${migratedCount !== 1 ? "s" : ""}...`;
            case "error":
                return "Migration encountered an issue";
            case "completed":
                return "Migration complete!";
            default:
                return "Initializing...";
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case "checking":
                return <ActivityIndicator size={48} color={palette.primary} />;
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
            case "completed":
                return <MaterialIcons name="check-circle" size={48} color={palette.primary} />;
            case "error":
                return <MaterialIcons name="error-outline" size={48} color={palette.danger} />;
            default:
                return <ActivityIndicator size={48} color={palette.primary} />;
        }
    };

    const getSubMessage = () => {
        switch (status) {
            case "checking":
                return "Please wait while we check your data...";
            case "migrating":
                return "Upgrading your card storage to the latest security standards";
            case "completed":
                return "Your cards are ready to use";
            case "error":
                return error || "Don't worry, your cards are safe. Continuing...";
            default:
                return "Setting up your secure card storage...";
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={() => { }}
        >
            <View style={[styles.backdrop, { backgroundColor: palette.background }]}>
                <View style={[styles.container, { backgroundColor: palette.card }]}>
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

                    {showDoneButton && (
                        <Pressable
                            style={[styles.doneButton, { backgroundColor: palette.primary }]}
                            onPress={onDone}
                        >
                            <ThemedText style={styles.doneButtonText}>Done</ThemedText>
                        </Pressable>
                    )}

                    <View style={[styles.securityBadge, { backgroundColor: `${palette.primary}10` }]}>
                        <MaterialIcons name="lock" size={16} color={palette.primary} />
                        <ThemedText style={[styles.securityText, { color: palette.secondary }]}>
                            Your cards are encrypted and secure
                        </ThemedText>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    container: {
        width: "100%",
        maxWidth: 360,
        borderRadius: 20,
        padding: 32,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 25,
        elevation: 10,
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
    doneButton: {
        width: "100%",
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 24,
    },
    doneButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    securityBadge: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 32,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    securityText: {
        fontSize: 12,
        marginLeft: 6,
    },
});
