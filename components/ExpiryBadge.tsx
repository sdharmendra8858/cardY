import { Colors } from "@/constants/theme";
import { useTimer } from "@/context/CardContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type ExpiryBadgeProps = {
    cardExpiresAt: number;
};

export default function ExpiryBadge({ cardExpiresAt }: ExpiryBadgeProps) {
    const { timerTick } = useTimer();
    const [throttledTick, setThrottledTick] = React.useState(0);
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];

    const now = Math.floor(Date.now() / 1000);
    const remaining = cardExpiresAt - now;
    const isExpired = remaining <= 0;
    const isExpiringSoon = !isExpired && remaining < 60; // Final minute

    React.useEffect(() => {
        const currentNow = Math.floor(Date.now() / 1000);
        const currentRemaining = cardExpiresAt - currentNow;

        if (currentRemaining <= 0) {
            setThrottledTick(-1);
        } else if (currentRemaining <= 60) {
            setThrottledTick(currentRemaining);
        } else {
            setThrottledTick(Math.floor(currentRemaining / 60) + 1000);
        }
    }, [timerTick, cardExpiresAt]);

    const getTimeRemainingText = () => {
        if (isExpired) return "Expired";
        if (remaining < 60) return `${remaining}s`;
        if (remaining < 3600) return `${Math.floor(remaining / 60)}m`;
        if (remaining < 86400) return `${Math.floor(remaining / 3600)}h`;
        return `${Math.floor(remaining / 86400)}d`;
    };

    // Throttled tick ensures React bails out of rendering if only seconds changed (> 60s)
    const _ = throttledTick;

    return (
        <View style={[
            styles.badge,
            { backgroundColor: isExpired ? "rgba(255, 59, 48, 0.8)" : isExpiringSoon ? "rgba(255, 193, 7, 0.8)" : "rgba(76, 175, 80, 0.8)" }
        ]}>
            <Text style={styles.badgeText}>
                {isExpired ? "⏰ Expired" : `⏱️ ${getTimeRemainingText()}`}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        color: "white",
        fontSize: 10,
        fontWeight: "bold",
    },
});
