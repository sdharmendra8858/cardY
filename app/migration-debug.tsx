/**
 * Migration Debug Screen
 * 
 * Use this screen to debug migration issues
 * Navigate to /migration-debug in your app
 */

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
    clearAllStorageForTesting,
    debugMigrationState,
    resetMigrationForTesting
} from "@/utils/migration";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    View
} from "react-native";

export default function MigrationDebugScreen() {
    const router = useRouter();
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];
    const [output, setOutput] = useState<string[]>([]);

    const addLog = (message: string) => {
        setOutput(prev => [...prev, message]);
    };

    const clearLogs = () => {
        setOutput([]);
    };

    const handleDebug = async () => {
        clearLogs();
        addLog("Running debug...");

        // Capture console logs
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        console.log = (...args) => {
            addLog(args.join(" "));
            originalLog(...args);
        };
        console.error = (...args) => {
            addLog("ERROR: " + args.join(" "));
            originalError(...args);
        };
        console.warn = (...args) => {
            addLog("WARN: " + args.join(" "));
            originalWarn(...args);
        };

        try {
            await debugMigrationState();
        } catch (error) {
            addLog("ERROR: " + String(error));
        }

        // Restore console
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;

        addLog("\n✅ Debug complete!");
    };

    const handleReset = async () => {
        Alert.alert(
            "Reset Migration?",
            "This will allow migration to run again. Continue?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                        clearLogs();
                        addLog("Resetting migration...");
                        await resetMigrationForTesting();
                        addLog("✅ Migration reset! Restart app to trigger migration.");
                    },
                },
            ]
        );
    };

    const handleClearAll = async () => {
        Alert.alert(
            "⚠️ Clear ALL Storage?",
            "This will DELETE ALL cards and keys. This cannot be undone!",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear All",
                    style: "destructive",
                    onPress: async () => {
                        clearLogs();
                        addLog("Clearing all storage...");
                        await clearAllStorageForTesting();
                        addLog("✅ All storage cleared! Restart app.");
                    },
                },
            ]
        );
    };

    return (
        <ThemedView style={styles.container}>
            <View style={[styles.header, { borderBottomColor: palette.border }]}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ThemedText style={styles.backText}>← Back</ThemedText>
                </Pressable>
                <ThemedText style={styles.title}>Migration Debug</ThemedText>
            </View>

            <View style={styles.buttonContainer}>
                <Pressable
                    style={[styles.button, { backgroundColor: palette.primary }]}
                    onPress={handleDebug}
                >
                    <ThemedText style={styles.buttonText}>Run Debug</ThemedText>
                </Pressable>

                <Pressable
                    style={[styles.button, { backgroundColor: "#FFA500" }]}
                    onPress={handleReset}
                >
                    <ThemedText style={styles.buttonText}>Reset Migration</ThemedText>
                </Pressable>

                <Pressable
                    style={[styles.button, { backgroundColor: palette.danger }]}
                    onPress={handleClearAll}
                >
                    <ThemedText style={styles.buttonText}>Clear All Storage</ThemedText>
                </Pressable>

                <Pressable
                    style={[styles.button, { backgroundColor: palette.secondary }]}
                    onPress={clearLogs}
                >
                    <ThemedText style={styles.buttonText}>Clear Logs</ThemedText>
                </Pressable>
            </View>

            <ScrollView
                style={[styles.output, { backgroundColor: palette.card }]}
                contentContainerStyle={styles.outputContent}
            >
                {output.length === 0 ? (
                    <ThemedText style={[styles.outputText, { color: palette.secondary }]}>
                        Tap "Run Debug" to see migration state
                    </ThemedText>
                ) : (
                    output.map((line, index) => (
                        <ThemedText
                            key={index}
                            style={[
                                styles.outputText,
                                line.includes("ERROR") && styles.errorText,
                                line.includes("WARN") && styles.warnText,
                            ]}
                        >
                            {line}
                        </ThemedText>
                    ))
                )}
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        marginBottom: 8,
    },
    backText: {
        fontSize: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
    },
    buttonContainer: {
        padding: 16,
        gap: 12,
    },
    button: {
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    output: {
        flex: 1,
        margin: 16,
        borderRadius: 12,
        padding: 16,
    },
    outputContent: {
        gap: 4,
    },
    outputText: {
        fontSize: 12,
        fontFamily: "monospace",
    },
    errorText: {
        color: "#FF4444",
    },
    warnText: {
        color: "#FFA500",
    },
});
