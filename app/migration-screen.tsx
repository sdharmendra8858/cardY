/**
 * Migration Screen
 * 
 * Full-screen migration experience with hero section
 * User can choose to migrate old cards or start fresh
 */

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    BackHandler,
    Modal,
    Pressable,
    StyleSheet,
    View
} from "react-native";

type MigrationStatus = "ready" | "migrating" | "completed" | "error";

interface MigrationScreenProps {
    cardCount: number;
    onMigrate: () => Promise<{ success: boolean; migratedCount: number; errors: string[] }>;
    onFreshSetup: () => void;
    onComplete: () => void;
}

export default function MigrationScreen({
    cardCount,
    onMigrate,
    onFreshSetup,
    onComplete,
}: MigrationScreenProps) {
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];
    const [status, setStatus] = useState<MigrationStatus>("ready");
    const [progress, setProgress] = useState(0);
    const [currentCard, setCurrentCard] = useState(0);
    const [showFreshSetupModal, setShowFreshSetupModal] = useState(false);
    const progressAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    // Prevent back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
            return true; // Prevent back
        });

        return () => backHandler.remove();
    }, []);

    // Fade in animation on mount
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleMigrate = async () => {
        setStatus("migrating");
        setProgress(0);
        setCurrentCard(0);

        // Simulate per-card migration with delays for visual feedback
        const cardsPerStep = Math.max(1, Math.floor(cardCount / 10));
        const delayPerStep = 300; // ms

        for (let i = 0; i <= cardCount; i += cardsPerStep) {
            const currentProgress = Math.min(100, Math.floor((i / cardCount) * 100));
            setProgress(currentProgress);
            setCurrentCard(Math.min(i, cardCount));

            Animated.timing(progressAnim, {
                toValue: currentProgress,
                duration: 200,
                useNativeDriver: false,
            }).start();

            if (i < cardCount) {
                await new Promise(resolve => setTimeout(resolve, delayPerStep));
            }
        }

        // Actually run migration
        try {
            const result = await onMigrate();

            if (result.success) {
                setProgress(100);
                setCurrentCard(cardCount);
                Animated.timing(progressAnim, {
                    toValue: 100,
                    duration: 300,
                    useNativeDriver: false,
                }).start();

                // Small delay before showing completion
                await new Promise(resolve => setTimeout(resolve, 500));
                setStatus("completed");
            } else {
                setStatus("error");
            }
        } catch (error) {
            console.error("Migration error:", error);
            setStatus("error");
        }
    };

    const handleFreshSetup = () => {
        setShowFreshSetupModal(true);
    };

    const confirmFreshSetup = () => {
        setShowFreshSetupModal(false);
        onFreshSetup();
    };

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ["0%", "100%"],
    });

    return (
        <ThemedView style={styles.container}>
            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                {/* Hero Section */}
                <View style={styles.hero}>
                    <View style={[styles.iconContainer, { backgroundColor: `${palette.primary}20` }]}>
                        <MaterialIcons name="security" size={64} color={palette.primary} />
                    </View>
                    <ThemedText style={styles.heroTitle}>
                        {status === "ready" && "Upgrade Your Card Storage"}
                        {status === "migrating" && "Migrating Your Cards"}
                        {status === "completed" && "Migration Complete!"}
                        {status === "error" && "Migration Issue"}
                    </ThemedText>
                    <ThemedText style={[styles.heroSubtitle, { color: palette.secondary }]}>
                        {status === "ready" &&
                            `We found ${cardCount} card${cardCount !== 1 ? "s" : ""} in your old storage. Upgrade to the latest security standards with AES-256-GCM encryption.`}
                        {status === "migrating" &&
                            `Securing your cards with military-grade encryption...`}
                        {status === "completed" &&
                            `All ${cardCount} card${cardCount !== 1 ? "s" : ""} have been successfully migrated to the new secure storage.`}
                        {status === "error" &&
                            "Don't worry, your cards are safe. You can try again or start fresh."}
                    </ThemedText>
                </View>

                {/* Progress Section */}
                {status === "migrating" && (
                    <View style={styles.progressSection}>
                        <View style={styles.progressInfo}>
                            <ThemedText style={styles.progressLabel}>
                                Card {currentCard} of {cardCount}
                            </ThemedText>
                            <ThemedText style={[styles.progressPercent, { color: palette.primary }]}>
                                {progress}%
                            </ThemedText>
                        </View>
                        <View style={[styles.progressBarContainer, { backgroundColor: palette.border }]}>
                            <Animated.View
                                style={[
                                    styles.progressBarFill,
                                    { backgroundColor: palette.primary, width: progressWidth },
                                ]}
                            />
                        </View>
                        <View style={styles.migrationSteps}>
                            <View style={styles.stepItem}>
                                <MaterialIcons name="check-circle" size={20} color={palette.primary} />
                                <ThemedText style={styles.stepText}>Reading cards</ThemedText>
                            </View>
                            <View style={styles.stepItem}>
                                <ActivityIndicator size="small" color={palette.primary} />
                                <ThemedText style={styles.stepText}>Encrypting data</ThemedText>
                            </View>
                            <View style={styles.stepItem}>
                                <MaterialIcons name="radio-button-unchecked" size={20} color={palette.secondary} />
                                <ThemedText style={[styles.stepText, { color: palette.secondary }]}>
                                    Verifying security
                                </ThemedText>
                            </View>
                        </View>
                    </View>
                )}

                {/* Completion Section */}
                {status === "completed" && (
                    <View style={styles.completionSection}>
                        <View style={[styles.checkmarkContainer, { backgroundColor: `${palette.primary}20` }]}>
                            <MaterialIcons name="check-circle" size={80} color={palette.primary} />
                        </View>
                        <View style={styles.securityFeatures}>
                            <View style={styles.featureItem}>
                                <MaterialIcons name="lock" size={24} color={palette.primary} />
                                <ThemedText style={styles.featureText}>AES-256-GCM Encryption</ThemedText>
                            </View>
                            <View style={styles.featureItem}>
                                <MaterialIcons name="verified-user" size={24} color={palette.primary} />
                                <ThemedText style={styles.featureText}>Secure Key Storage</ThemedText>
                            </View>
                            <View style={styles.featureItem}>
                                <MaterialIcons name="shield" size={24} color={palette.primary} />
                                <ThemedText style={styles.featureText}>Data Integrity Verified</ThemedText>
                            </View>
                        </View>
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actions}>
                    {status === "ready" && (
                        <>
                            <Pressable
                                style={[styles.primaryButton, { backgroundColor: palette.primary }]}
                                onPress={handleMigrate}
                            >
                                <MaterialIcons name="upgrade" size={24} color="#FFFFFF" />
                                <ThemedText style={styles.primaryButtonText}>
                                    Migrate {cardCount} Card{cardCount !== 1 ? "s" : ""}
                                </ThemedText>
                            </Pressable>

                            <Pressable
                                style={[styles.secondaryButton, { borderColor: palette.border }]}
                                onPress={handleFreshSetup}
                            >
                                <MaterialIcons name="refresh" size={24} color={palette.primary} />
                                <ThemedText style={[styles.secondaryButtonText, { color: palette.primary }]}>
                                    Start Fresh Setup
                                </ThemedText>
                            </Pressable>
                        </>
                    )}

                    {status === "completed" && (
                        <Pressable
                            style={[styles.primaryButton, { backgroundColor: palette.primary }]}
                            onPress={onComplete}
                        >
                            <ThemedText style={styles.primaryButtonText}>Continue to App</ThemedText>
                            <MaterialIcons name="arrow-forward" size={24} color="#FFFFFF" />
                        </Pressable>
                    )}

                    {status === "error" && (
                        <>
                            <Pressable
                                style={[styles.primaryButton, { backgroundColor: palette.primary }]}
                                onPress={handleMigrate}
                            >
                                <MaterialIcons name="refresh" size={24} color="#FFFFFF" />
                                <ThemedText style={styles.primaryButtonText}>Try Again</ThemedText>
                            </Pressable>

                            <Pressable
                                style={[styles.secondaryButton, { borderColor: palette.border }]}
                                onPress={handleFreshSetup}
                            >
                                <ThemedText style={[styles.secondaryButtonText, { color: palette.primary }]}>
                                    Start Fresh Instead
                                </ThemedText>
                            </Pressable>
                        </>
                    )}
                </View>

                {/* Security Badge */}
                <View style={[styles.securityBadge, { backgroundColor: `${palette.primary}10` }]}>
                    <MaterialIcons name="lock" size={16} color={palette.primary} />
                    <ThemedText style={[styles.securityText, { color: palette.secondary }]}>
                        Your cards are always encrypted and secure
                    </ThemedText>
                </View>
            </Animated.View>

            {/* Fresh Setup Confirmation Modal */}
            <Modal
                visible={showFreshSetupModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowFreshSetupModal(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalContainer, { backgroundColor: palette.card }]}>
                        <MaterialIcons name="warning" size={48} color="#FFA500" />
                        <ThemedText style={styles.modalTitle}>Start Fresh Setup?</ThemedText>
                        <ThemedText style={[styles.modalMessage, { color: palette.secondary }]}>
                            If you choose fresh setup:
                        </ThemedText>
                        <View style={styles.modalList}>
                            <ThemedText style={[styles.modalListItem, { color: palette.secondary }]}>
                                • You'll need to add all cards manually
                            </ThemedText>
                            <ThemedText style={[styles.modalListItem, { color: palette.secondary }]}>
                                • Old cards will no longer be available
                            </ThemedText>
                            <ThemedText style={[styles.modalListItem, { color: palette.secondary }]}>
                                • This action cannot be undone
                            </ThemedText>
                        </View>
                        <View style={styles.modalActions}>
                            <Pressable
                                style={[styles.modalButton, { backgroundColor: palette.border }]}
                                onPress={() => setShowFreshSetupModal(false)}
                            >
                                <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                            </Pressable>
                            <Pressable
                                style={[styles.modalButton, { backgroundColor: "#FFA500" }]}
                                onPress={confirmFreshSetup}
                            >
                                <ThemedText style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
                                    Start Fresh
                                </ThemedText>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: "space-between",
        paddingTop: 80,
        paddingBottom: 40,
    },
    hero: {
        alignItems: "center",
        marginBottom: 40,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 16,
    },
    heroSubtitle: {
        fontSize: 16,
        textAlign: "center",
        lineHeight: 24,
        paddingHorizontal: 16,
    },
    progressSection: {
        marginVertical: 32,
    },
    progressInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    progressLabel: {
        fontSize: 14,
        fontWeight: "600",
    },
    progressPercent: {
        fontSize: 24,
        fontWeight: "bold",
    },
    progressBarContainer: {
        height: 8,
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 24,
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 4,
    },
    migrationSteps: {
        gap: 16,
    },
    stepItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    stepText: {
        fontSize: 14,
    },
    completionSection: {
        alignItems: "center",
        marginVertical: 32,
    },
    checkmarkContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 32,
    },
    securityFeatures: {
        gap: 16,
        width: "100%",
    },
    featureItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    featureText: {
        fontSize: 16,
    },
    actions: {
        gap: 12,
        marginTop: 32,
    },
    primaryButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingVertical: 18,
        paddingHorizontal: 32,
        borderRadius: 16,
    },
    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "600",
    },
    secondaryButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingVertical: 18,
        paddingHorizontal: 32,
        borderRadius: 16,
        borderWidth: 2,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: "600",
    },
    securityBadge: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 24,
        marginTop: 24,
    },
    securityText: {
        fontSize: 12,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalContainer: {
        width: "100%",
        maxWidth: 400,
        borderRadius: 20,
        padding: 32,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "bold",
        marginTop: 16,
        marginBottom: 12,
        textAlign: "center",
    },
    modalMessage: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: 16,
    },
    modalList: {
        width: "100%",
        marginBottom: 24,
    },
    modalListItem: {
        fontSize: 14,
        lineHeight: 24,
    },
    modalActions: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: "center",
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: "600",
    },
});
