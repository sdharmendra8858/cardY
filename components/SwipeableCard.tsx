import { useCardPinning } from "@/context/CardPinningContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { formatCardNumber } from "../utils/formatCardNumber";
import ExpiryBadge from "./ExpiryBadge";
import PinIcon from "./PinIcon";

interface SwipeableCardProps {
    id: string;
    cardName: string;
    cardNumber: string;
    cardHolder: string;
    onDelete?: (id: string) => void;
    onReveal?: (id: string) => void;
    cardKind?: "credit" | "debit";
    cobrandName?: string;
    cardUser?: "self" | "other";
    dominantColor?: string;
    cardExpiresAt?: number;
    expiry?: string;
    isExpiring?: boolean;
    onPin?: (cardId: string, cardType: "self" | "shared") => void;
}

const SWIPE_THRESHOLD = 50;
const ACTION_BUTTON_WIDTH = 80;
const MAX_SWIPE_DISTANCE = ACTION_BUTTON_WIDTH * 2;

export default function SwipeableCard({
    id,
    cardNumber,
    cardName,
    cardHolder,
    onDelete,
    onReveal,
    cardKind,
    cobrandName,
    cardUser = "self",
    dominantColor = "#4b7bec",
    cardExpiresAt,
    expiry,
    isExpiring = false,
    onPin,
}: SwipeableCardProps) {
    const router = useRouter();
    const { isPinned, togglePin, canPin } = useCardPinning();
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const [isOpen, setIsOpen] = useState(false);
    const [cardHeight, setCardHeight] = useState(140);
    const [cardWidth, setCardWidth] = useState(300);
    const panResponder = useRef({
        x: 0,
        isMoving: false,
        currentOffset: 0,
    }).current;

    // Calculate expiry status
    const isExpired = cardExpiresAt ? Math.floor(Date.now() / 1000) > cardExpiresAt : false;
    const isInfinite = !cardExpiresAt && cardUser === "other";

    // Animate card removal when expiring
    useEffect(() => {
        if (isExpiring) {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }).start();
        }
    }, [isExpiring, fadeAnim]);

    // Format card number properly with spaces and X's
    const displayCardNumber = formatCardNumber(cardNumber.replace(/\*/g, 'X'));

    const handlePanGestureEvent = ({ nativeEvent }: any) => {
        const clampedX = Math.max(
            -maxSwipeDistance,
            Math.min(maxSwipeDistance, panResponder.currentOffset + nativeEvent.translationX)
        );
        translateX.setValue(clampedX);
    };

    const handlePanStateChange = (event: any) => {
        const { translationX, velocityX, state } = event.nativeEvent;

        if (state === State.BEGAN) {
            panResponder.x = translationX;
            panResponder.isMoving = true;
            setIsOpen(true);
        } else if (state === State.END || state === State.CANCELLED) {
            panResponder.isMoving = false;
            const currentValue = panResponder.currentOffset + translationX;
            const distance = Math.abs(translationX);
            const velocity = Math.abs(velocityX);

            const shouldOpen = distance > SWIPE_THRESHOLD || velocity > 500;
            const isSwipeLeft = translationX < 0;
            const isSwipeRight = translationX > 0;

            let targetValue = currentValue;

            // If swiping in opposite direction to close
            if (panResponder.currentOffset > 0 && isSwipeLeft) {
                // Currently swiped right, now swiping left to close
                targetValue = 0;
                setIsOpen(false);
            } else if (panResponder.currentOffset < 0 && isSwipeRight) {
                // Currently swiped left, now swiping right to close
                targetValue = 0;
                setIsOpen(false);
            } else if (shouldOpen && isSwipeLeft) {
                targetValue = Math.max(-snapDistance, currentValue);
            } else if (shouldOpen && isSwipeRight) {
                targetValue = Math.min(snapDistance, currentValue);
            } else {
                targetValue = 0;
                setIsOpen(false);
            }

            Animated.spring(translateX, {
                toValue: targetValue,
                useNativeDriver: false,
                speed: 12,
                bounciness: 3,
            }).start();

            // Update current offset for next gesture
            panResponder.currentOffset = targetValue;
        }
    };

    useEffect(() => {
        if (!isOpen) {
            Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: false,
                speed: 12,
                bounciness: 3,
            }).start();
        }
    }, [isOpen, translateX]);

    const handleCardLayout = (event: any) => {
        const { height, width } = event.nativeEvent.layout;
        setCardHeight(height);
        setCardWidth(width);
    };

    const handlePin = () => {
        togglePin(id);
        setIsOpen(false);
    };

    const handleDelete = () => {
        setIsOpen(false);
        if (onDelete) {
            onDelete(id);
        }
    };

    const buttonHeight = cardHeight / 2;
    const backSectionWidth = cardWidth * 0.25;
    const maxSwipeDistance = cardWidth * 0.3;
    const snapDistance = cardWidth * 0.25;

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <View style={{ overflow: "hidden", position: "relative" }}>
                {/* Unified Back Section - Full width behind card */}
                <View
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 0,
                        flexDirection: "column",
                        borderRadius: 12,
                        overflow: "hidden",
                    }}
                >
                    {/* Top Section (50%) - Pin */}
                    <View style={{ height: cardHeight / 2, flexDirection: "row", backgroundColor: "#999", gap: 0, marginBottom: -1 }}>
                        {/* Left 25% - Pin Icon */}
                        <View style={{ flex: 0.25, justifyContent: "center", alignItems: "center" }}>
                            {canPin(cardUser as "self" | "shared") && (
                                <Pressable
                                    style={{ justifyContent: "center", alignItems: "center" }}
                                    onPress={handlePin}
                                >
                                    <PinIcon filled={isPinned(id)} size={20} color="#fff" />
                                </Pressable>
                            )}
                        </View>

                        {/* Middle 50% */}
                        <View style={{ flex: 0.5, backgroundColor: "#999" }} />

                        {/* Right 25% - Pin Icon */}
                        <View style={{ flex: 0.25, justifyContent: "center", alignItems: "center" }}>
                            {canPin(cardUser as "self" | "shared") && (
                                <Pressable
                                    style={{ justifyContent: "center", alignItems: "center" }}
                                    onPress={handlePin}
                                >
                                    <PinIcon filled={isPinned(id)} size={20} color="#fff" />
                                </Pressable>
                            )}
                        </View>
                    </View>

                    {/* Bottom Section (50%) - Delete */}
                    <View style={{ height: cardHeight / 2, flexDirection: "row", backgroundColor: "#d32f2f", gap: 0 }}>
                        {/* Left 25% - Delete Icon */}
                        <View style={{ flex: 0.25, justifyContent: "center", alignItems: "center" }}>
                            <Pressable
                                style={{ justifyContent: "center", alignItems: "center" }}
                                onPress={handleDelete}
                            >
                                <Ionicons name="trash-outline" size={20} color="#fff" />
                            </Pressable>
                        </View>

                        {/* Middle 50% */}
                        <View style={{ flex: 0.5, backgroundColor: "#d32f2f" }} />

                        {/* Right 25% - Delete Icon */}
                        <View style={{ flex: 0.25, justifyContent: "center", alignItems: "center" }}>
                            <Pressable
                                style={{ justifyContent: "center", alignItems: "center" }}
                                onPress={handleDelete}
                            >
                                <Ionicons name="trash-outline" size={20} color="#fff" />
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* Card Content - swipeable */}
                <PanGestureHandler
                    onGestureEvent={handlePanGestureEvent}
                    onHandlerStateChange={handlePanStateChange}
                    activeOffsetX={[-10, 10]}
                    failOffsetY={[-5, 5]}
                >
                    <Animated.View
                        style={{
                            transform: [{ translateX }],
                            zIndex: 1,
                        }}
                        onLayout={handleCardLayout}
                    >
                        {/* Main card pressable */}
                        <Pressable
                            onPress={() => router.push(`/card-details/${encodeURIComponent(id)}`)}
                            style={[styles.card, { backgroundColor: dominantColor, opacity: isExpired ? 0.5 : 1 }]}
                        >
                            {/* Top Section - Bank name and badges */}
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardName}>{cardName}</Text>
                                <View style={styles.badges}>
                                    {cardKind && (
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>
                                                {cardKind === "credit" ? "💳" : "💵"} {cardKind.toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
                                    {cardExpiresAt && (
                                        <ExpiryBadge cardExpiresAt={cardExpiresAt} />
                                    )}
                                    {isInfinite && (
                                        <View style={[styles.badge, { backgroundColor: "rgba(76, 175, 80, 0.8)" }]}>
                                            <Text style={styles.badgeText}>∞ Forever</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Middle Section - Card number and cobrand */}
                            <View style={styles.cardMiddle}>
                                <Text style={[styles.cardNumber, { opacity: isExpired ? 0.6 : 1 }]}>
                                    {displayCardNumber}
                                </Text>
                                {cobrandName && (
                                    <Text style={[styles.cobrandName, { opacity: isExpired ? 0.6 : 1 }]}>
                                        {cobrandName}
                                    </Text>
                                )}
                            </View>

                            {/* Bottom Section - Cardholder name */}
                            <View style={styles.cardFooter}>
                                <Text style={styles.cardHolder}>{cardHolder}</Text>
                            </View>

                            {isExpired && (
                                <View style={styles.expiredOverlay}>
                                    <Text style={styles.expiredText}>This card has expired</Text>
                                </View>
                            )}
                        </Pressable>
                    </Animated.View>
                </PanGestureHandler>

                {/* Click-outside overlay to close swipe */}
                {isOpen && (
                    <Pressable
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "transparent",
                            zIndex: 2,
                        }}
                        onPress={() => setIsOpen(false)}
                    />
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "relative",
        marginBottom: 12,
    },
    card: {
        backgroundColor: "#4b7bec",
        padding: 12,
        borderRadius: 12,
        justifyContent: "space-between",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    cardName: { color: "white", fontSize: 18, fontWeight: "bold" },
    badges: {
        flexDirection: "row",
        gap: 6,
    },
    badge: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        color: "white",
        fontSize: 10,
        fontWeight: "bold",
    },
    cardMiddle: {
        flex: 1,
        justifyContent: "center",
        marginVertical: 8,
    },
    cardNumber: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 4,
        flexShrink: 1,
    },
    cobrandName: {
        color: "white",
        fontSize: 14,
        fontStyle: "italic",
        opacity: 0.9,
    },
    cardFooter: {
        justifyContent: "flex-end",
    },
    cardHolder: {
        color: "white",
        fontSize: 14,
        fontWeight: "500",
    },
    expiredOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 12,
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    expiredText: {
        color: "white",
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center",
    },
    actionButton: {
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
