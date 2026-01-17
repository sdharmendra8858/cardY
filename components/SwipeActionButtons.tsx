import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

interface SwipeActionButtonsProps {
    cardId: string;
    cardType: "self" | "shared";
    isPinned: boolean;
    canPin: boolean;
    onPin: (cardId: string, cardType: "self" | "shared") => void;
    onDelete: (cardId: string) => void;
    buttonHeight?: number;
}

const SwipeActionButtons: React.FC<SwipeActionButtonsProps> = ({
    cardId,
    cardType,
    isPinned,
    canPin,
    onPin,
    onDelete,
    buttonHeight = 70,
}) => {
    return (
        <View style={styles.container}>
            {/* Pin Button */}
            {canPin && (
                <Pressable
                    style={[styles.button, styles.pinButton, { height: buttonHeight }]}
                    onPress={() => onPin(cardId, cardType)}
                >
                    <Ionicons
                        name={isPinned ? "pin" : "pin-outline"}
                        size={20}
                        color="#fff"
                    />
                </Pressable>
            )}

            {/* Delete Button */}
            <Pressable
                style={[styles.button, styles.deleteButton, { height: buttonHeight }]}
                onPress={() => onDelete(cardId)}
            >
                <Ionicons name="trash-outline" size={20} color="#fff" />
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: "column",
        justifyContent: "space-around",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
    },
    button: {
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
    pinButton: {
        backgroundColor: "#999",
    },
    deleteButton: {
        backgroundColor: "#d32f2f",
    },
});

export default SwipeActionButtons;
