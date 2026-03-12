import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCountdown } from "@/hooks/use-countdown";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "./themed-text";

interface SessionTimerBarProps {
    expiresAt: number | null;
    label?: string;
}

/**
 * SessionTimerBar Component
 * 
 * Displays a countdown timer bar for sessions or card validity.
 * Shows remaining time in MM:SS format.
 * Only displays when time is remaining (timeLeft > 0).
 * 
 * Used in:
 * - Share card screens (session expiry)
 * - Card form screen (card validity for imported cards)
 */
export default function SessionTimerBar({
    expiresAt,
    label = "Session expires in",
}: SessionTimerBarProps) {
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];

    const { timeLeft, formatTime } = useCountdown(expiresAt);

    // Only show if there's time remaining
    if (!expiresAt || timeLeft <= 0) {
        return null;
    }

    return (
        <View style={[styles.sessionTimerBar, { backgroundColor: palette.primary + '15', borderBottomColor: palette.primary }]}>
            <MaterialIcons name="schedule" size={16} color={palette.primary} />
            <ThemedText style={[styles.sessionTimerText, { color: palette.primary }]}>
                {label} {formatTime(timeLeft)}
            </ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    sessionTimerBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 8,
    },
    sessionTimerText: {
        fontSize: 13,
        fontWeight: "600",
    },
});
