import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
    BackHandler,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View,
} from "react-native";

export interface UnifiedModalButton {
    text: string;
    onPress: () => void;
    style?: "default" | "cancel" | "destructive";
}

export interface UnifiedModalProps {
    visible: boolean;
    title: string;
    message: string;
    buttons?: UnifiedModalButton[];
    dismissible?: boolean;
    onRequestClose?: () => void;
    type?: "default" | "error" | "warning" | "success";
}

export default function UnifiedModal({
    visible,
    title,
    message,
    buttons = [],
    dismissible = true,
    onRequestClose,
    type = "default",
}: UnifiedModalProps) {
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];

    // Ensure buttons is always an array
    const safeButtons = Array.isArray(buttons) ? buttons : [];

    const backHandlerRef = useRef<ReturnType<
        typeof BackHandler.addEventListener
    > | null>(null);

    /**
     * Prevent Android back button when modal is non-dismissible
     */
    useEffect(() => {
        if (!visible || dismissible) return;

        const handler = () => true;
        backHandlerRef.current = BackHandler.addEventListener(
            "hardwareBackPress",
            handler
        );

        return () => backHandlerRef.current?.remove();
    }, [visible, dismissible]);

    /**
     * Accent color per type
     */
    const accentColor = (() => {
        switch (type) {
            case "error":
                return "#EF4444";
            case "warning":
                return "#F59E0B";
            case "success":
                return "#22C55E";
            default:
                return palette.primary;
        }
    })();

    const iconName = (() => {
        switch (type) {
            case "error":
                return "alert-circle";
            case "warning":
                return "warning";
            case "success":
                return "checkmark-circle";
            default:
                return "information-circle";
        }
    })();

    const handleBackdropPress = () => {
        if (dismissible && onRequestClose) {
            onRequestClose();
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={dismissible ? onRequestClose : undefined}
        >
            <TouchableWithoutFeedback onPress={handleBackdropPress}>
                <View style={styles.backdrop}>
                    <TouchableWithoutFeedback>
                        <View
                            style={[
                                styles.container,
                                { backgroundColor: palette.card },
                            ]}
                        >
                            {/* Header */}
                            <View style={styles.header}>
                                <View
                                    style={[
                                        styles.iconWrapper,
                                        { backgroundColor: `${accentColor}20` },
                                    ]}
                                >
                                    <Ionicons
                                        name={iconName}
                                        size={20}
                                        color={accentColor}
                                    />
                                </View>

                                <ThemedText
                                    style={styles.title}
                                    numberOfLines={2}
                                >
                                    {title}
                                </ThemedText>
                            </View>

                            {/* Message */}
                            <ThemedText style={styles.message}>
                                {message}
                            </ThemedText>

                            {/* Buttons */}
                            {safeButtons && safeButtons.length > 0 ? (
                                <View
                                    style={styles.buttonContainer}
                                >
                                    {safeButtons.map((btn, index) => {
                                        const isCancel =
                                            btn.style === "cancel";
                                        const isDestructive =
                                            btn.style === "destructive";

                                        return (
                                            <Pressable
                                                key={index}
                                                style={[
                                                    styles.button,
                                                    isCancel &&
                                                    styles.cancelButton,
                                                    isDestructive && {
                                                        backgroundColor:
                                                            palette.danger,
                                                    },
                                                ]}
                                                onPress={btn.onPress}
                                            >
                                                <Text
                                                    style={[
                                                        styles.buttonText,
                                                        isCancel && styles.cancelButtonText,
                                                    ]}
                                                >
                                                    {btn.text}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            ) : dismissible ? (
                                <Pressable
                                    style={[
                                        styles.button,
                                        styles.cancelButton,
                                        { marginHorizontal: 20 },
                                    ]}
                                    onPress={onRequestClose}
                                >
                                    <Text
                                        style={[
                                            styles.buttonText,
                                            styles.cancelButtonText,
                                        ]}
                                    >
                                        Close
                                    </Text>
                                </Pressable>
                            ) : null}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },

    container: {
        width: "100%",
        maxWidth: 360,
        borderRadius: 20,
        paddingVertical: 22,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 25,
        elevation: 10,
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        marginBottom: 12,
    },

    iconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },

    title: {
        fontSize: 16,
        fontWeight: "700",
        flexShrink: 1,
    },

    message: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: "center",
        opacity: 0.8,
        paddingHorizontal: 24,
        marginBottom: 20,
    },

    buttonContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 10,
        gap: 10,
        flexDirection: "row",
    },

    button: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        backgroundColor: "#2563EB",
        justifyContent: "center",
        alignItems: "center",
    },

    cancelButton: {
        backgroundColor: "#E5E7EB",
    },

    buttonText: {
        fontSize: 15,
        fontWeight: "600",
        color: "white",
    },

    cancelButtonText: {
        color: "#374151",
    },
});