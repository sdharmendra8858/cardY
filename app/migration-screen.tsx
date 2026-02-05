/**
 * Migration Screen
 * 
 * Full-screen migration experience with hero section
 * User can choose to migrate old cards or start fresh
 */

import AppButton from "@/components/AppButton";
import { ThemedText } from "@/components/themed-text";
import UnifiedModal from "@/components/UnifiedModal";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    BackHandler,
    StyleSheet,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
        <SafeAreaView style={[styles.container, { backgroundColor: palette.surface }]}>
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
                    <View style={[styles.iconContainer, { backgroundColor: `${palette.primary}15` }]}>
                        <MaterialIcons name="security" size={72} color={palette.primary} />
                    </View>
                    <ThemedText type="title" style={styles.heroTitle}>
                        {status === "ready" && "Upgrade Your Storage"}
                        {status === "migrating" && "Migrating Cards..."}
                        {status === "completed" && "Migration Complete"}
                        {status === "error" && "Migration Issue"}
                    </ThemedText>
                    <ThemedText style={[styles.heroSubtitle, { color: palette.icon }]}>
                        {status === "ready" &&
                            `We found ${cardCount} card${cardCount !== 1 ? "s" : ""} from your previous version. Enhance security with our new AES-256-GCM encryption.`}
                        {status === "migrating" &&
                            `Securing your cards with military-grade encryption...`}
                        {status === "completed" &&
                            `All ${cardCount} card${cardCount !== 1 ? "s" : ""} have been successfully migrated and secured.`}
                        {status === "error" &&
                            "We encountered an issue during migration. Your data is safe. Please try again."}
                    </ThemedText>
                </View>

                {/* Progress Section */}
                {status === "migrating" && (
                    <View style={styles.progressSection}>
                        <View style={styles.progressInfo}>
                            <ThemedText style={styles.progressLabel}>
                                Processing Card {currentCard} of {cardCount}
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
                            <StepItem
                                icon="check-circle"
                                text="Reading existing cards"
                                color={palette.primary}
                                active
                            />
                            <StepItem
                                icon="lock"
                                text="Encrypting with new keys"
                                color={palette.primary}
                                active
                                loading
                            />
                            <StepItem
                                icon="verified-user"
                                text="Verifying data integrity"
                                color={palette.icon}
                            />
                        </View>
                    </View>
                )}

                {/* Completion Section */}
                {status === "completed" && (
                    <View style={styles.completionSection}>
                        <View style={[styles.checkmarkContainer, { backgroundColor: `${palette.primary}15` }]}>
                            <MaterialIcons name="check-circle" size={80} color={palette.primary} />
                        </View>
                        <View style={styles.securityFeatures}>
                            <FeatureItem icon="lock" text="AES-256-GCM Encryption" color={palette.primary} />
                            <FeatureItem icon="vpn-key" text="Secure Key Storage" color={palette.primary} />
                            <FeatureItem icon="shield" text="Data Integrity Verified" color={palette.primary} />
                        </View>
                    </View>
                )}

                {/* Action Buttons */}
                <View style={[styles.actions, styles.bottomActions]}>
                    {status === "ready" && (
                        <>
                            <AppButton
                                title={`Migrate ${cardCount} Card${cardCount !== 1 ? "s" : ""}`}
                                onPress={handleMigrate}
                                icon="upgrade"
                                iconLibrary="material"
                                fullWidth
                            />
                            <AppButton
                                title="Start Fresh Setup"
                                onPress={handleFreshSetup}
                                variant="secondary"
                                icon="refresh"
                                iconLibrary="material"
                                fullWidth
                            />
                        </>
                    )}

                    {status === "completed" && (
                        <AppButton
                            title="Continue to App"
                            onPress={onComplete}
                            icon="arrow-forward"
                            iconLibrary="material"
                            fullWidth
                        />
                    )}

                    {status === "error" && (
                        <>
                            <AppButton
                                title="Try Again"
                                onPress={handleMigrate}
                                icon="refresh"
                                iconLibrary="material"
                                fullWidth
                            />
                            <AppButton
                                title="Start Fresh Instead"
                                onPress={handleFreshSetup}
                                variant="secondary"
                                fullWidth
                            />
                        </>
                    )}
                </View>
            </Animated.View>

            {/* Fresh Setup Confirmation Modal */}
            <UnifiedModal
                visible={showFreshSetupModal}
                title="Start Fresh Setup?"
                message="This will skip migration. You will need to add your cards manually. Old cards will no longer be accessible. This action cannot be undone."
                type="warning"
                buttons={[
                    {
                        text: "Cancel",
                        onPress: () => setShowFreshSetupModal(false),
                        style: "cancel",
                    },
                    {
                        text: "Start Fresh",
                        onPress: confirmFreshSetup,
                        style: "destructive",
                    },
                ]}
                onRequestClose={() => setShowFreshSetupModal(false)}
            />
        </SafeAreaView>
    );
}

function StepItem({
    icon,
    text,
    color,
    active = false,
    loading = false
}: {
    icon: any;
    text: string;
    color: string;
    active?: boolean;
    loading?: boolean
}) {
    return (
        <View style={styles.stepItem}>
            {loading ? (
                <ActivityIndicator size="small" color={color} />
            ) : (
                <MaterialIcons name={icon} size={20} color={color} />
            )}
            <ThemedText style={[styles.stepText, { color: active ? undefined : color }]}>
                {text}
            </ThemedText>
        </View>
    );
}

function FeatureItem({ icon, text, color }: { icon: any; text: string; color: string }) {
    return (
        <View style={styles.featureItem}>
            <MaterialIcons name={icon} size={24} color={color} />
            <ThemedText style={styles.featureText}>{text}</ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
    },
    hero: {
        alignItems: "center",
        marginTop: 40,
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
        textAlign: "center",
        marginBottom: 12,
        fontSize: 28,
    },
    heroSubtitle: {
        textAlign: "center",
        fontSize: 16,
        lineHeight: 24,
        paddingHorizontal: 16,
    },
    progressSection: {
        marginVertical: 24,
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
        fontSize: 20,
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
        paddingHorizontal: 8,
    },
    stepItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 24,
    },
    stepText: {
        fontSize: 15,
    },
    completionSection: {
        alignItems: "center",
        flex: 1,
        justifyContent: 'center',
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
        gap: 20,
        width: "100%",
        paddingHorizontal: 20,
    },
    featureItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    featureText: {
        fontSize: 18,
        fontWeight: '500',
    },
    actions: {
        gap: 16,
    },
    bottomActions: {
        marginTop: 'auto',
    },
});
