/**
 * Migration Screen
 * 
 * Full-screen migration experience with hero section
 * User can choose to migrate old cards or start fresh
 */

import AppButton from "@/components/AppButton";
import Hero from "@/components/Hero";
import { ThemedText } from "@/components/themed-text";
import UnifiedModal from "@/components/UnifiedModal";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    BackHandler,
    Dimensions,
    ScrollView,
    StyleSheet,
    View
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type MigrationStatus = "ready" | "migrating" | "completed" | "error";

interface MigrationScreenProps {
    cardCount: number;
    onMigrate: () => Promise<{ success: boolean; migratedCount: number; errors: string[] }>;
    onFreshSetup: () => void;
    onComplete: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function MigrationScreen({
    cardCount,
    onMigrate,
    onFreshSetup,
    onComplete,
}: MigrationScreenProps) {
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];
    const insets = useSafeAreaInsets();
    const [status, setStatus] = useState<MigrationStatus>("ready");
    const [progress, setProgress] = useState(0);
    const [currentCard, setCurrentCard] = useState(0);
    const [showFreshSetupModal, setShowFreshSetupModal] = useState(false);

    // Reanimated Shared Values
    const progressWidth = useSharedValue(0);
    const iconScale = useSharedValue(0.8);
    const iconRotate = useSharedValue(0);

    // Prevent back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
            return true; // Prevent back
        });

        return () => backHandler.remove();
    }, []);

    // Entrance animation
    useEffect(() => {
        iconScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    }, []);

    // Rotate icon during migration
    useEffect(() => {
        if (status === "migrating") {
            iconRotate.value = withTiming(360, { duration: 2000 });
        } else {
            iconRotate.value = 0;
        }
    }, [status]);

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

            progressWidth.value = withTiming(currentProgress, { duration: 200 });

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
                progressWidth.value = withTiming(100, { duration: 300 });

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

    // Static Styles (Removed Animations)
    const cardStyle = {
        transform: [{ translateY: 0 }],
        opacity: 1,
    };

    const iconAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: iconScale.value },
            { rotate: `${iconRotate.value}deg` }
        ],
    }));

    const barFillStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    return (
        <SafeAreaView
            style={[styles.safeArea, { backgroundColor: palette.surface }]}
            edges={['top', 'left', 'right']}
        >
            <Hero
                title={
                    status === "ready" ? "Storage Upgrade" :
                        status === "migrating" ? "Upgrading..." :
                            status === "completed" ? "All Done!" :
                                "Upgrade Issue"
                }
                subtitle={
                    status === "ready" ? "Enhance your card security" :
                        status === "migrating" ? "Please wait" :
                            status === "completed" ? "Your cards are ready" :
                                "Let's try again"
                }
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: 140 + Math.max(insets.bottom, 16) }
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Icon Section */}
                <Animated.View style={[styles.iconSection, iconAnimatedStyle]}>
                    <View style={[styles.iconCircle, { backgroundColor: status === "error" ? `${palette.danger}15` : `${palette.primary}15` }]}>
                        <MaterialIcons
                            name={
                                status === "completed" ? "check-circle" :
                                    status === "error" ? "error-outline" :
                                        status === "migrating" ? "sync" : "security"
                            }
                            size={64}
                            color={status === "error" ? palette.danger : palette.primary}
                        />
                    </View>
                </Animated.View>

                {/* Info Card */}
                <View style={[styles.infoCard, { backgroundColor: palette.card }]}>
                    <ThemedText type="defaultSemiBold" style={styles.infoTitle}>
                        {status === "ready" && `${cardCount} Card${cardCount !== 1 ? 's' : ''} Found`}
                        {status === "migrating" && "Upgrading Security"}
                        {status === "completed" && "Upgrade Complete"}
                        {status === "error" && "Upgrade Failed"}
                    </ThemedText>

                    <ThemedText style={[styles.infoText, { color: palette.icon }]}>
                        {status === "ready" &&
                            "We'll upgrade your cards to our new encryption system. This only takes a moment."}
                        {status === "migrating" &&
                            "Applying military-grade encryption to each card..."}
                        {status === "completed" &&
                            `All ${cardCount} card${cardCount !== 1 ? 's' : ''} have been upgraded with enhanced security.`}
                        {status === "error" &&
                            "Something went wrong during the upgrade. Your cards are safe. Please try again."}
                    </ThemedText>

                    {/* Progress Section */}
                    {status === "migrating" && (
                        <View style={styles.progressSection}>
                            <View style={styles.progressRow}>
                                <ThemedText style={styles.progressLabel}>
                                    Card {currentCard} of {cardCount}
                                </ThemedText>
                                <ThemedText style={[styles.progressPercent, { color: palette.primary }]}>
                                    {progress}%
                                </ThemedText>
                            </View>
                            <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
                                <Animated.View
                                    style={[
                                        styles.progressFill,
                                        { backgroundColor: palette.primary },
                                        barFillStyle
                                    ]}
                                />
                            </View>
                            <View style={styles.stepsList}>
                                <StepItem icon="check-circle" text="Reading cards" color={palette.primary} active />
                                <StepItem icon="lock" text="Encrypting data" color={palette.primary} active loading />
                                <StepItem icon="verified-user" text="Verifying" color={palette.icon} />
                            </View>
                        </View>
                    )}

                    {/* Completion Features */}
                    {status === "completed" && (
                        <View style={styles.featuresSection}>
                            <FeatureRow icon="lock" text="Bank-Level Security" color={palette.primary} />
                            <FeatureRow icon="vpn-key" text="Protected Storage" color={palette.primary} />
                            <FeatureRow icon="verified" text="Data Verified" color={palette.primary} />
                        </View>
                    )}
                </View>

                {/* Security Note */}
                {status === "ready" && (
                    <View style={styles.securityNote}>
                        <MaterialIcons name="info-outline" size={16} color={palette.icon} />
                        <ThemedText style={[styles.securityText, { color: palette.icon }]}>
                            Your cards stay on this device. We never send them anywhere.
                        </ThemedText>
                    </View>
                )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={[
                styles.buttonContainer,
                {
                    backgroundColor: palette.surface,
                    paddingBottom: Math.max(insets.bottom, 16)
                }
            ]}>
                {status === "ready" && (
                    <>
                        <AppButton
                            title={`Upgrade ${cardCount} Card${cardCount !== 1 ? 's' : ''}`}
                            onPress={handleMigrate}
                            icon="upgrade"
                            iconLibrary="material"
                            fullWidth
                        />
                        <AppButton
                            title="Start Fresh Instead"
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
                            title="Start Fresh"
                            onPress={handleFreshSetup}
                            variant="secondary"
                            fullWidth
                        />
                    </>
                )}
            </View>

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
        <View style={styles.stepRow}>
            {loading ? (
                <ActivityIndicator size="small" color={color} />
            ) : (
                <MaterialIcons name={icon} size={18} color={color} />
            )}
            <ThemedText style={[styles.stepLabel, { color: active ? undefined : color }]}>
                {text}
            </ThemedText>
        </View>
    );
}

function FeatureRow({ icon, text, color }: { icon: any; text: string; color: string }) {
    return (
        <View style={styles.featureRow}>
            <MaterialIcons name={icon} size={20} color={color} />
            <ThemedText style={styles.featureLabel}>{text}</ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        // paddingBottom is set dynamically with insets
    },
    iconSection: {
        alignItems: "center",
        marginTop: 20,
        marginBottom: 24,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: "center",
        alignItems: "center",
    },
    infoCard: {
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    infoTitle: {
        fontSize: 20,
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
    },
    progressSection: {
        marginTop: 8,
    },
    progressRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    progressLabel: {
        fontSize: 13,
        fontWeight: "600",
    },
    progressPercent: {
        fontSize: 18,
        fontWeight: "bold",
    },
    progressBar: {
        height: 6,
        borderRadius: 3,
        overflow: "hidden",
        marginBottom: 16,
    },
    progressFill: {
        height: "100%",
        borderRadius: 3,
    },
    stepsList: {
        gap: 10,
    },
    stepRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    stepLabel: {
        fontSize: 13,
    },
    featuresSection: {
        marginTop: 8,
        gap: 12,
    },
    featureRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    featureLabel: {
        fontSize: 15,
        fontWeight: "500",
    },
    securityNote: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: "rgba(0,0,0,0.03)",
    },
    securityText: {
        fontSize: 12,
        flex: 1,
    },
    buttonContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        gap: 12,
    },
});
