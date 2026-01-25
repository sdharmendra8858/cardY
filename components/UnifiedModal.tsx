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
    dismissible?: boolean; // If false, modal cannot be closed by tapping outside or back button
    onRequestClose?: () => void;
    type?: "default" | "error" | "warning" | "success"; // For styling
}

/**
 * UnifiedModal Component
 *
 * A single, flexible modal component that handles all alert/modal scenarios:
 * - Dismissible and non-dismissible modes
 * - Multiple action buttons with custom callbacks
 * - Different visual styles (default, error, warning, success)
 * - Prevents back button navigation when non-dismissible
 *
 * Usage:
 * ```tsx
 * <UnifiedModal
 *   visible={isVisible}
 *   title="Card Expired"
 *   message="This card has expired"
 *   dismissible={false}
 *   buttons={[
 *     { text: "Go Home", onPress: () => router.push("/"), style: "default" }
 *   ]}
 * />
 * ```
 */
export default function UnifiedModal({
    visible,
    title,
    message,
    buttons,
    dismissible = true,
    onRequestClose,
    type = "default",
}: UnifiedModalProps) {
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];
    const backHandlerRef = useRef<ReturnType<typeof BackHandler.addEventListener> | null>(null);

    // Handle back button for non-dismissible modals
    useEffect(() => {
        if (!visible || dismissible) return;

        const handleBackPress = () => {
            // Prevent back button when modal is non-dismissible
            return true;
        };

        backHandlerRef.current = BackHandler.addEventListener("hardwareBackPress", handleBackPress);

        return () => {
            if (backHandlerRef.current) {
                backHandlerRef.current.remove();
            }
        };
    }, [visible, dismissible]);

    const getTypeStyles = () => {
        switch (type) {
            case "error":
                return {
                    backgroundColor: "#FFEBEE",
                    borderColor: "#EF5350",
                    iconColor: "#C62828",
                    textColor: "#B71C1C",
                };
            case "warning":
                return {
                    backgroundColor: "#FFF3E0",
                    borderColor: "#FFB74D",
                    iconColor: "#E65100",
                    textColor: "#BF360C",
                };
            case "success":
                return {
                    backgroundColor: "#E8F5E9",
                    borderColor: "#81C784",
                    iconColor: "#2E7D32",
                    textColor: "#1B5E20",
                };
            default:
                return {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                    iconColor: palette.primary,
                    textColor: palette.text,
                };
        }
    };

    const typeStyles = getTypeStyles();

    const getTypeIcon = () => {
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
    };

    const handleBackdropPress = () => {
        if (dismissible && onRequestClose) {
            onRequestClose();
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={dismissible ? onRequestClose : undefined}
        >
            <TouchableWithoutFeedback onPress={handleBackdropPress}>
                <View style={styles.backdrop}>
                    <TouchableWithoutFeedback>
                        <View
                            style={[
                                styles.container,
                                {
                                    backgroundColor: typeStyles.backgroundColor,
                                    borderColor: typeStyles.borderColor,
                                },
                            ]}
                        >
                            {/* Header with icon */}
                            <View style={styles.header}>
                                <Ionicons
                                    name={getTypeIcon()}
                                    size={24}
                                    color={typeStyles.iconColor}
                                    style={styles.icon}
                                />
                                <ThemedText
                                    style={[styles.title, { color: typeStyles.textColor }]}
                                    numberOfLines={2}
                                >
                                    {title}
                                </ThemedText>
                            </View>

                            {/* Message */}
                            <ThemedText
                                style={[styles.message, { color: typeStyles.textColor }]}
                            >
                                {message}
                            </ThemedText>

                            {/* Buttons */}
                            {buttons && buttons.length > 0 && (
                                <View style={styles.buttonContainer}>
                                    {buttons.map((button, index) => (
                                        <Pressable
                                            key={index}
                                            style={[
                                                styles.button,
                                                {
                                                    backgroundColor: getButtonColor(button.style, palette),
                                                    borderTopWidth: index > 0 ? 1 : 0,
                                                    borderTopColor: palette.border,
                                                },
                                            ]}
                                            onPress={button.onPress}
                                        >
                                            <ThemedText
                                                style={[
                                                    styles.buttonText,
                                                    {
                                                        color: getButtonTextColor(button.style, palette),
                                                    },
                                                ]}
                                            >
                                                {button.text}
                                            </ThemedText>
                                        </Pressable>
                                    ))}
                                </View>
                            )}

                            {/* Close button for dismissible modals without buttons */}
                            {dismissible && (!buttons || buttons.length === 0) && (
                                <Pressable
                                    style={[styles.closeButton, { borderTopColor: palette.border }]}
                                    onPress={onRequestClose}
                                >
                                    <ThemedText style={{ color: palette.primary, fontWeight: "600" }}>
                                        Close
                                    </ThemedText>
                                </Pressable>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const getButtonColor = (style: string | undefined, palette: any) => {
    switch (style) {
        case "destructive":
            return palette.danger;
        case "cancel":
            return palette.border;
        default:
            return palette.primary;
    }
};

const getButtonTextColor = (style: string | undefined, palette: any) => {
    switch (style) {
        case "destructive":
            return "white";
        case "cancel":
            return palette.text;
        default:
            return "white";
    }
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    container: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: "hidden",
        maxWidth: 400,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    icon: {
        marginRight: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
        flex: 1,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    buttonContainer: {
        marginTop: 8,
        borderTopWidth: 1,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonText: {
        fontSize: 14,
        fontWeight: "600",
    },
    closeButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: "center",
        justifyContent: "center",
        borderTopWidth: 1,
    },
});
