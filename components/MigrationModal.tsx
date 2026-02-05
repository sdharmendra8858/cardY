/**
 * Migration Modal Component
 * 
 * Shows a non-dismissible modal during card migration process
 * Only visible when migration is actually needed
 */

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
    ActivityIndicator,
    Animated,
    Modal,
    Pressable,
    StyleSheet,
    View
} from "react-native";
import { ThemedText } from "./themed-text";

interface MigrationModalProps {
    visible: boolean;
    status: "idle" | "checking" | "ready" | "migrating" | "completed" | "error";
    cardCount: number;
    migratedCount: number;
    error?: string | null;
    onStartMigration?: () => void;
    onDone?: () => void;
}

export default function MigrationModal({
    visible,
    status,
    cardCount,
    migratedCount,
    error,
    onStartMigration,
    onDone,
}: MigrationModalProps) {
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];
    const progressAnim = useRef(new Animated.Value(0)).current;

    // Animate progress bar during migration
    useEffect(() => {
        if (status === "migrating") {
            // Animate from 0% to 90% over 2 seconds
            Animated.timing(progressAnim, {
                toValue: 90,
                duration: 2000,
                useNativeDriver: false,
            }).start();
        } else if (status === "completed") {
            // Jump to 100% when complete
            Animated.timing(progressAnim, {
                toValue: 100,
                duration: 300,
                useNativeDriver: false,
            }).start();
        }
    }, [status, progressAnim]);

    const showStartButton = status === "ready" && cardCount > 0;
    const showDoneButton = status === "completed" && migratedCount > 0;

    const getStatusMessage = () => {
        switch (status) {
            case "checking":
                return "Checking for cards...";
            case "ready":
                return `Found ${cardCount} card${cardCount !== 1 ? 's' : ''} to migrate`;
            case "migrating":
                return `Migrating ${cardCount} card${cardCount !== 1 ? 's' : ''}...`;
            case "error":
                return "Migration encountered an issue";
            case "completed":
                return migratedCount > 0
                    ? `Successfully migrated ${migratedCount} card${migratedCount !== 1 ? 's' : ''}!`
                    : "Migration complete!";
            default:
                return "Preparing migration...";
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
                return "Checking your card storage...";
            case "ready":
                return "Ready to upgrade your card storage to the latest security standards. Click 'Start Migration' to begin.";
            case "migrating":
                return "Encrypting and securing your cards with AES-256-GCM encryption";
            case "completed":
                return "Your cards are ready to use with enhanced security";
            case "error":
                return error || "Don't worry, your cards are safe. Continuing...";
            default:
                return "Setting up your secure card storage...";
        }
    };

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={() => {
                // Non-dismissible - only allow closing via Done button
                if (showDoneButton && onDone) {
                    onDone();
                }
            }}
        >
            <Pressable
                style={[styles.backdrop, { backgroundColor: palette.background }]}
                onPress={() => {
                    // Non-dismissible - prevent backdrop dismiss
                }}
            >
                <Pressable
                    style={[styles.container, { backgroundColor: palette.card }]}
                    onPress={(e) => e.stopPropagation()}
                >
                    {getStatusIcon()}

                    <ThemedText style={styles.title}>{getStatusMessage()}</ThemedText>

                    <ThemedText style={[styles.subtitle, { color: palette.secondary }]}>
                        {getSubMessage()}
                    </ThemedText>

                    {status === "migrating" && (
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
                                <Animated.View
                                    style={[
                                        styles.progressFill,
                                        { backgroundColor: palette.primary, width: progressWidth },
                                    ]}
                                />
                            </View>
                            <ThemedText style={[styles.progressText, { color: palette.secondary }]}>
                                Securing your cards...
                            </ThemedText>
                        </View>
                    )}

                    {status === "error" && (
                        <ThemedText style={[styles.errorNote, { color: palette.secondary }]}>
                            The app will continue in a moment...
                        </ThemedText>
                    )}

                    {showStartButton && (
                        <Pressable
                            style={[styles.startButton, { backgroundColor: palette.primary }]}
                            onPress={onStartMigration}
                        >
                            <ThemedText style={styles.buttonText}>Start Migration</ThemedText>
                        </Pressable>
                    )}

                    {showDoneButton && (
                        <Pressable
                            style={[styles.doneButton, { backgroundColor: palette.primary }]}
                            onPress={onDone}
                        >
                            <ThemedText style={styles.buttonText}>Done</ThemedText>
                        </Pressable>
                    )}

                    <View style={[styles.securityBadge, { backgroundColor: `${palette.primary}10` }]}>
                        <MaterialIcons name="lock" size={16} color={palette.primary} />
                        <ThemedText style={[styles.securityText, { color: palette.secondary }]}>
                            Your cards are encrypted and secure
                        </ThemedText>
                    </View>
                </Pressable>
            </Pressable>
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
        height: 6,
        borderRadius: 3,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        textAlign: "center",
        marginTop: 8,
    },
    errorNote: {
        fontSize: 12,
        textAlign: "center",
        marginTop: 12,
        fontStyle: "italic",
    },
    startButton: {
        width: "100%",
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 24,
    },
    doneButton: {
        width: "100%",
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 24,
    },
    buttonText: {
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
