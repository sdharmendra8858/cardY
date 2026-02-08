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
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    BackHandler,
    Dimensions,
    Platform,
    StyleSheet,
    View
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

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
    const [status, setStatus] = useState<MigrationStatus>("ready");
    const [progress, setProgress] = useState(0);
    const [currentCard, setCurrentCard] = useState(0);
    const [showFreshSetupModal, setShowFreshSetupModal] = useState(false);

    // Reanimated Shared Values
    const cardY = useSharedValue(100);
    const cardOpacity = useSharedValue(0);
    const iconScale = useSharedValue(0);
    const pulseAnim = useSharedValue(1);

    const progressWidth = useSharedValue(0);

    // Prevent back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
            return true; // Prevent back
        });

        return () => backHandler.remove();
    }, []);

    // Entrance Animation
    useEffect(() => {
        cardY.value = withSpring(0, { damping: 15 });
        cardOpacity.value = withTiming(1, { duration: 800 });
        iconScale.value = withSpring(1, { damping: 12 });
    }, []);

    // Pulse effect during migration
    useEffect(() => {
        if (status === "migrating") {
            pulseAnim.value = withRepeat(
                withSequence(
                    withTiming(1.1, { duration: 1000 }),
                    withTiming(1, { duration: 1000 })
                ),
                -1
            );
        } else {
            pulseAnim.value = withTiming(1);
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

    // Animated Styles
    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: cardY.value }],
        opacity: cardOpacity.value,
    }));

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value * pulseAnim.value }],
    }));

    const barFillStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    const gradientColors = scheme === 'dark'
        ? [palette.primary, '#1a1a1a'] as const
        : [palette.primary, '#ffffff'] as const;

    const glassColor = scheme === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.8)';

    return (
        <LinearGradient
            colors={[palette.primary, scheme === 'dark' ? '#000' : '#fff']}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <SafeAreaView style={styles.safeArea}>
                <Animated.View style={[styles.mainCard, cardStyle, { backgroundColor: glassColor }]}>
                    {/* Hero Section */}
                    <Animated.View style={[styles.hero, iconStyle]}>
                        <View style={[styles.iconContainer, { backgroundColor: `${palette.primary}30` }]}>
                            <MaterialIcons
                                name={
                                    status === "completed" ? "verified" :
                                        status === "error" ? "report-problem" :
                                            status === "migrating" ? "sync" : "security"
                                }
                                size={80}
                                color={status === "error" ? palette.danger : palette.primary}
                            />
                        </View>
                    </Animated.View>

                    <ThemedText type="title" style={styles.title}>
                        {status === "ready" && "Everything is Ready"}
                        {status === "migrating" && "Adding Protection"}
                        {status === "completed" && "You're All Set!"}
                        {status === "error" && "Something Went Wrong"}
                    </ThemedText>

                    <ThemedText style={[styles.subtitle, { color: palette.icon }]}>
                        {status === "ready" &&
                            `We found your cards from the previous version. We just need a moment to update them to our new, extra-secure system.`}
                        {status === "migrating" &&
                            `This will only take a few seconds. We're making sure each card is safely stored.`}
                        {status === "completed" &&
                            `Your ${cardCount} cards are now updated and ready to use with even better security.`}
                        {status === "error" &&
                            "We couldn't finish the update. Don't worry, your cards are safe. Let's try one more time."}
                    </ThemedText>

                    {/* Progress Section */}
                    {status === "migrating" && (
                        <View style={styles.progressContainer}>
                            <View style={styles.progressHeader}>
                                <ThemedText style={styles.progressText}>
                                    Card {currentCard} of {cardCount}
                                </ThemedText>
                                <ThemedText style={[styles.progressPercent, { color: palette.primary }]}>
                                    {progress}%
                                </ThemedText>
                            </View>
                            <View style={[styles.barBg, { backgroundColor: `${palette.primary}20` }]}>
                                <Animated.View
                                    style={[
                                        styles.barFill,
                                        { backgroundColor: palette.primary },
                                        barFillStyle
                                    ]}
                                />
                            </View>
                            <View style={styles.steps}>
                                <StepItem icon="check" text="Found your cards" color={palette.primary} active />
                                <StepItem icon="lock" text="Updating security" color={palette.primary} active loading />
                                <StepItem icon="done-all" text="Finished" color={palette.icon} />
                            </View>
                        </View>
                    )}

                    {/* Feature Highlights on Completion */}
                    {status === "completed" && (
                        <View style={styles.featureGrid}>
                            <FeatureItem icon="shield" text="Extra Protection" color={palette.primary} />
                            <FeatureItem icon="flash-on" text="Faster Access" color={palette.primary} />
                        </View>
                    )}

                    {/* Actions */}
                    <View style={styles.actions}>
                        {status === "ready" && (
                            <>
                                <AppButton
                                    title="Update Everything"
                                    onPress={handleMigrate}
                                    icon="rocket-launch"
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

                        {status === "completed" && (
                            <AppButton
                                title="Go to My Cards"
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
                                    title="Skip and Start Fresh"
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
        </LinearGradient>
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
    safeArea: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    mainCard: {
        borderRadius: 32,
        padding: 30,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.2,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
        }),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    hero: {
        alignItems: "center",
        marginBottom: 24,
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        textAlign: "center",
        fontSize: 32,
        fontWeight: "800",
        marginBottom: 12,
    },
    subtitle: {
        textAlign: "center",
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 32,
    },
    progressContainer: {
        marginBottom: 32,
    },
    progressHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 10,
    },
    progressText: {
        fontSize: 14,
        fontWeight: "600",
    },
    progressPercent: {
        fontSize: 24,
        fontWeight: "900",
    },
    barBg: {
        height: 12,
        borderRadius: 6,
        overflow: "hidden",
        marginBottom: 20,
    },
    barFill: {
        height: "100%",
        borderRadius: 6,
    },
    steps: {
        gap: 12,
    },
    stepItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    stepText: {
        fontSize: 14,
    },
    featureGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 40,
        gap: 20,
    },
    featureItem: {
        alignItems: "center",
        gap: 8,
        flex: 1,
    },
    featureText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    actions: {
        gap: 16,
    },
});
