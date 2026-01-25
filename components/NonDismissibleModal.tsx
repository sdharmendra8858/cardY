import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useEffect } from "react";
import {
    BackHandler,
    Modal,
    StyleSheet,
    View,
} from "react-native";
import AppButton from "./AppButton";
import { ThemedText } from "./themed-text";

interface NonDismissibleModalProps {
    visible: boolean;
    title: string;
    message: string;
    buttonText: string;
    onButtonPress: () => void;
}

/**
 * NonDismissibleModal Component
 * 
 * A truly non-dismissible modal that cannot be closed by:
 * - Tapping outside the modal
 * - Pressing the back button
 * - Swiping
 * - Any other gesture
 * 
 * Can only be closed by pressing the action button.
 */
export default function NonDismissibleModal({
    visible,
    title,
    message,
    buttonText,
    onButtonPress,
}: NonDismissibleModalProps) {
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];

    // Prevent back button from dismissing the modal on Android
    useEffect(() => {
        if (!visible) return;

        const backAction = () => {
            // Always return true to consume the event and prevent dismissal
            return true;
        };

        const handler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => handler.remove();
    }, [visible]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            hardwareAccelerated
            onRequestClose={() => {
                // Do nothing - modal is non-dismissible
            }}
        >
            <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.7)" }]}>
                <View style={[styles.card, { backgroundColor: palette.background }]}>
                    <ThemedText type="subtitle" style={styles.title}>
                        {title}
                    </ThemedText>
                    <ThemedText style={styles.message}>
                        {message}
                    </ThemedText>
                    <AppButton
                        title={buttonText}
                        variant="primary"
                        fullWidth
                        onPress={onButtonPress}
                    />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    card: {
        width: "100%",
        borderRadius: 16,
        padding: 24,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    title: {
        marginBottom: 12,
        textAlign: "center",
    },
    message: {
        marginBottom: 24,
        textAlign: "center",
        lineHeight: 20,
    },
});
