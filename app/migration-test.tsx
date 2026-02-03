/**
 * Migration Test Screen
 * 
 * Temporary screen for testing migration scenarios
 * Add this to your app for easy testing, remove before production
 */

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { MigrationTestHelper } from "@/utils/migration/testHelper";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";

export default function MigrationTestScreen() {
    const router = useRouter();
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];
    const [loading, setLoading] = useState(false);

    const runTest = async (testName: string, testFn: () => Promise<void>) => {
        try {
            setLoading(true);
            await testFn();
            Alert.alert(
                "Test Setup Complete",
                `${testName} setup complete. Close and reopen the app to see the migration in action.`,
                [
                    {
                        text: "OK",
                        onPress: () => router.back(),
                    },
                ]
            );
        } catch (error) {
            Alert.alert("Error", `Failed to set up test: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const checkCurrentState = async () => {
        try {
            setLoading(true);
            await MigrationTestHelper.checkState();
            Alert.alert(
                "State Check Complete",
                "Check the console logs for detailed storage state"
            );
        } catch (error) {
            Alert.alert("Error", `Failed to check state: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ThemedText style={styles.title}>Migration Test Screen</ThemedText>
                <ThemedText style={[styles.subtitle, { color: palette.secondary }]}>
                    Set up different scenarios to test migration
                </ThemedText>

                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Test Scenarios</ThemedText>

                    <TestButton
                        title="1. Fresh Install"
                        description="No cards, no master key"
                        onPress={() =>
                            runTest("Fresh Install", MigrationTestHelper.setupFreshInstall)
                        }
                        disabled={loading}
                        palette={palette}
                    />

                    <TestButton
                        title="2. Existing User"
                        description="Has cards and master key (no migration)"
                        onPress={() =>
                            runTest("Existing User", MigrationTestHelper.setupExistingUser)
                        }
                        disabled={loading}
                        palette={palette}
                    />

                    <TestButton
                        title="3. User with Old Cards"
                        description="Has old cards in SecureStore (migration needed)"
                        onPress={() =>
                            runTest(
                                "User with Old Cards",
                                MigrationTestHelper.setupUserWithOldCards
                            )
                        }
                        disabled={loading}
                        palette={palette}
                        highlight
                    />

                    <TestButton
                        title="4. Missing Master Key"
                        description="Has cards but no master key"
                        onPress={() =>
                            runTest(
                                "Missing Master Key",
                                MigrationTestHelper.setupMissingMasterKey
                            )
                        }
                        disabled={loading}
                        palette={palette}
                    />

                    <TestButton
                        title="5. Corrupted Storage"
                        description="Corrupted new storage, fallback to old"
                        onPress={() =>
                            runTest(
                                "Corrupted Storage",
                                MigrationTestHelper.setupCorruptedStorage
                            )
                        }
                        disabled={loading}
                        palette={palette}
                    />
                </View>

                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>

                    <TestButton
                        title="Add Sample Old Cards"
                        description="Add 3 sample cards to old storage"
                        onPress={() =>
                            runTest(
                                "Sample Cards",
                                MigrationTestHelper.addSampleOldCards
                            )
                        }
                        disabled={loading}
                        palette={palette}
                    />

                    <TestButton
                        title="Reset Migration Status"
                        description="Re-trigger migration without clearing cards"
                        onPress={() =>
                            runTest(
                                "Reset Migration",
                                MigrationTestHelper.resetMigrationStatus
                            )
                        }
                        disabled={loading}
                        palette={palette}
                    />

                    <TestButton
                        title="Check Current State"
                        description="View current storage state in console"
                        onPress={checkCurrentState}
                        disabled={loading}
                        palette={palette}
                    />

                    <TestButton
                        title="Reset All"
                        description="Clear all storage (fresh start)"
                        onPress={() =>
                            runTest("Reset All", MigrationTestHelper.resetAll)
                        }
                        disabled={loading}
                        palette={palette}
                        danger
                    />
                </View>

                <View style={styles.infoBox}>
                    <ThemedText style={styles.infoText}>
                        💡 After setting up a test scenario, close and reopen the app to
                        see the migration in action. Check the console logs for detailed
                        information.
                    </ThemedText>
                </View>

                <Pressable
                    style={[styles.backButton, { backgroundColor: palette.border }]}
                    onPress={() => router.back()}
                >
                    <ThemedText style={styles.backButtonText}>Back to App</ThemedText>
                </Pressable>
            </ScrollView>
        </ThemedView>
    );
}

interface TestButtonProps {
    title: string;
    description: string;
    onPress: () => void;
    disabled: boolean;
    palette: any;
    highlight?: boolean;
    danger?: boolean;
}

function TestButton({
    title,
    description,
    onPress,
    disabled,
    palette,
    highlight,
    danger,
}: TestButtonProps) {
    return (
        <Pressable
            style={[
                styles.testButton,
                { backgroundColor: palette.card },
                highlight && { borderColor: palette.primary, borderWidth: 2 },
                danger && { borderColor: palette.danger, borderWidth: 2 },
                disabled && { opacity: 0.5 },
            ]}
            onPress={onPress}
            disabled={disabled}
        >
            <ThemedText style={styles.buttonTitle}>{title}</ThemedText>
            <ThemedText style={[styles.buttonDescription, { color: palette.secondary }]}>
                {description}
            </ThemedText>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 16,
    },
    testButton: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    buttonTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 4,
    },
    buttonDescription: {
        fontSize: 13,
    },
    infoBox: {
        padding: 16,
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderRadius: 12,
        marginBottom: 24,
    },
    infoText: {
        fontSize: 13,
        lineHeight: 20,
    },
    backButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: "600",
    },
});
