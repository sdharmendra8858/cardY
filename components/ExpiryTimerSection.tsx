import { Colors } from "@/constants/theme";
import { useTimer } from "@/context/CardContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "./themed-text";

type ExpiryTimerSectionProps = {
    cardExpiresAt: number;
};

export default function ExpiryTimerSection({ cardExpiresAt }: ExpiryTimerSectionProps) {
    const { timerTick } = useTimer();
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];

    const validityInfo = React.useMemo(() => {
        // Calculate current time on every call to ensure accuracy
        const now = Math.floor(Date.now() / 1000);
        const isExpired = now > cardExpiresAt;
        const isExpiringSoon = now > (cardExpiresAt - 60);

        if (isExpired) {
            return {
                text: "Expired",
                color: palette.danger,
                bgColor: palette.danger + '15',
            };
        } else {
            const remaining = cardExpiresAt - now;
            let text = "";
            if (remaining < 60) text = `${remaining}s`;
            else if (remaining < 3600) text = `${Math.floor(remaining / 60)}m`;
            else if (remaining < 86400) text = `${Math.floor(remaining / 3600)}h`;
            else text = `${Math.floor(remaining / 86400)}d`;

            return {
                text,
                color: isExpiringSoon ? palette.secondary : palette.primary,
                bgColor: isExpiringSoon ? palette.secondary + '15' : palette.primary + '15',
            };
        }
    }, [timerTick, cardExpiresAt, palette]);

    return (
        <View style={[styles.summaryCard, { backgroundColor: palette.card }]}>
            <View style={[styles.summaryIcon, { backgroundColor: validityInfo.bgColor }]}>
                <Ionicons name="time-outline" size={18} color={validityInfo.color} />
            </View>
            <View style={styles.summaryContent}>
                <ThemedText style={styles.summaryLabel}>Validity</ThemedText>
                <ThemedText style={styles.summaryValue}>
                    {validityInfo.text}
                </ThemedText>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    summaryCard: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        padding: 12,
        width: "48%",
    },
    summaryIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    summaryContent: { flex: 1 },
    summaryLabel: { fontSize: 10, opacity: 0.6, marginBottom: 2, textTransform: "uppercase", fontWeight: "500" },
    summaryValue: { fontSize: 14, fontWeight: "600" },
});
