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
    isPinned?: boolean;
    onPinChange?: (cardId: string, isPinned: boolean) => void;
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
    isPinned: initialIsPinned = false,
    onPinChange,
}: SwipeableCardProps) {
    const router = useRouter();
    const { isPinned: isContextPinned, togglePin, canPin } = useCardPinning();
    const [isPinned, setIsPinned] = useState(initialIsPinned);
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

    // Sync isPinned prop to local state whenever it changes
    useEffect(() => {
        setIsPinned(initialIsPinned);
    }, [initialIsPinned]);

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
    const displayCardNumber = formatCardNumber(cardNumber);

    const handlePanGestureEvent = ({ nativeEvent }: any) => {
        const clampedX = Math.max(
            -maxSwipeDistance,
            Math.min(maxSwipeDistance, panResponder.currentOffset + nativeEvent.translationX)
        );
        translateX.setValue(clampedX);
    };

    const handlePanStateChange = (event: any) => {
        const { translationX, translationY, velocityX, state } = event.nativeEvent;

        if (state === State.BEGAN) {
            panResponder.x = translationX;
            panResponder.isMoving = true;
        } else if (state === State.END || state === State.CANCELLED) {
            panResponder.isMoving = false;

            // Check if gesture is primarily on X axis
            const isXGesture = Math.abs(translationX) > Math.abs(translationY);

            // If gesture is primarily on Y axis, close the card and ignore
            if (!isXGesture) {
                const isCurrentlyOpen = Math.abs(panResponder.currentOffset) > snapDistance * 0.1;
                if (isCurrentlyOpen) {
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: false,
                        speed: 12,
                        bounciness: 3,
                    }).start();
                    panResponder.currentOffset = 0;
                    setIsOpen(false);
                }
                return;
            }

            const isSwipeLeft = translationX < 0;
            const isSwipeRight = translationX > 0;
            const isCurrentlyOpen = Math.abs(panResponder.currentOffset) > snapDistance * 0.1;

            let targetValue = 0;

            // If card is open and user swipes in any direction, close it
            if (isCurrentlyOpen) {
                targetValue = 0;
                setIsOpen(false);
            } else if (isSwipeLeft) {
                // Swiping left - open to the left
                targetValue = -snapDistance;
                setIsOpen(true);
            } else if (isSwipeRight) {
                // Swiping right - open to the right
                targetValue = snapDistance;
                setIsOpen(true);
            } else {
                // No significant swipe - return to original
                targetValue = 0;
                setIsOpen(false);
            }

            Animated.spring(translateX, {
                toValue: targetValue,
                useNativeDriver: false,
                speed: 12,
                bounciness: 3,
            }).start();

            panResponder.currentOffset = targetValue;
        }
    };

    const handleCardLayout = (event: any) => {
        const { height, width } = event.nativeEvent.layout;
        setCardHeight(height);
        setCardWidth(width);
    };

    const handlePin = () => {
        const newPinnedState = !isPinned;
        console.log(`📌 Pin button pressed for card ${id}`);
        console.log(`   Current isPinned: ${isPinned}`);
        console.log(`   New isPinned: ${newPinnedState}`);
        console.log(`   canPin result: ${canPin(cardUser as "self" | "shared" | "other")}`);
        console.log(`   onPinChange callback exists: ${!!onPinChange}`);
        setIsPinned(newPinnedState);
        togglePin(id);

        // Close the swipe menu and animate back to original position
        setIsOpen(false);
        Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
            speed: 12,
            bounciness: 3,
        }).start();
        panResponder.currentOffset = 0;

        if (onPinChange) {
            console.log(`   Calling onPinChange callback with isPinned: ${newPinnedState}`);
            onPinChange(id, newPinnedState);
        } else {
            console.log(`   ❌ onPinChange callback is NOT defined!`);
        }
    };

    const handleDelete = () => {
        // Close the swipe menu and animate back to original position
        setIsOpen(false);
        Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
            speed: 12,
            bounciness: 3,
        }).start();
        panResponder.currentOffset = 0;

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
                    pointerEvents="box-none"
                >
                    {/* Top Section (50%) - Pin */}
                    <View style={{ height: cardHeight / 2, flexDirection: "row", backgroundColor: "#999", gap: 0, marginBottom: -1 }} pointerEvents="box-none">
                        {/* Left 25% - Pin Icon */}
                        <View style={{ flex: 0.25, justifyContent: "center", alignItems: "center" }} pointerEvents="box-none">
                            {canPin(cardUser as "self" | "shared" | "other") ? (
                                <Pressable
                                    style={{ justifyContent: "center", alignItems: "center" }}
                                    hitSlop={12}
                                    onPress={() => {
                                        console.log(`🎯 Left pin button pressed for card ${id}`);
                                        handlePin();
                                    }}
                                >
                                    <PinIcon filled={isPinned} size={20} color="#fff" />
                                </Pressable>
                            ) : (
                                <Text style={{ color: "#fff", fontSize: 10 }}>N/A</Text>
                            )}
                        </View>

                        {/* Middle 50% */}
                        <View style={{ flex: 0.5, backgroundColor: "#999" }} pointerEvents="none" />

                        {/* Right 25% - Pin Icon */}
                        <View style={{ flex: 0.25, justifyContent: "center", alignItems: "center" }} pointerEvents="box-none">
                            {canPin(cardUser as "self" | "shared" | "other") ? (
                                <Pressable
                                    style={{ justifyContent: "center", alignItems: "center" }}
                                    hitSlop={12}
                                    onPress={() => {
                                        console.log(`🎯 Right pin button pressed for card ${id}`);
                                        handlePin();
                                    }}
                                >
                                    <PinIcon filled={isPinned} size={20} color="#fff" />
                                </Pressable>
                            ) : (
                                <Text style={{ color: "#fff", fontSize: 10 }}>N/A</Text>
                            )}
                        </View>
                    </View>

                    {/* Bottom Section (50%) - Delete */}
                    <View style={{ height: cardHeight / 2, flexDirection: "row", backgroundColor: "#d32f2f", gap: 0 }} pointerEvents="box-none">
                        {/* Left 25% - Delete Icon */}
                        <View style={{ flex: 0.25, justifyContent: "center", alignItems: "center" }} pointerEvents="box-none">
                            <Pressable
                                style={{ justifyContent: "center", alignItems: "center" }}
                                hitSlop={12}
                                onPress={handleDelete}
                            >
                                <Ionicons name="trash-outline" size={20} color="#fff" />
                            </Pressable>
                        </View>

                        {/* Middle 50% */}
                        <View style={{ flex: 0.5, backgroundColor: "#d32f2f" }} pointerEvents="none" />

                        {/* Right 25% - Delete Icon */}
                        <View style={{ flex: 0.25, justifyContent: "center", alignItems: "center" }} pointerEvents="box-none">
                            <Pressable
                                style={{ justifyContent: "center", alignItems: "center" }}
                                hitSlop={12}
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
                    simultaneousHandlers={[]}
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
                            onPress={() => {
                                if (!isOpen) {
                                    router.push(`/card-details/${encodeURIComponent(id)}`);
                                }
                            }}
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
                                {isPinned && (
                                    <View style={styles.pinnedIndicator}>
                                        <PinIcon filled={true} size={16} color="#fff" />
                                    </View>
                                )}
                            </View>

                            {isExpired && (
                                <View style={styles.expiredOverlay}>
                                    <Text style={styles.expiredText}>This card has expired</Text>
                                </View>
                            )}
                        </Pressable>
                    </Animated.View>
                </PanGestureHandler>

                {/* Click-outside overlay to close swipe - only on middle sections */}
                {isOpen && (
                    <>
                        {/* Top middle section overlay */}
                        <Pressable
                            style={{
                                position: "absolute",
                                top: 0,
                                left: "25%",
                                right: "25%",
                                height: "50%",
                                backgroundColor: "transparent",
                                zIndex: 2,
                            }}
                            onPress={() => setIsOpen(false)}
                        />
                        {/* Bottom middle section overlay */}
                        <Pressable
                            style={{
                                position: "absolute",
                                bottom: 0,
                                left: "25%",
                                right: "25%",
                                height: "50%",
                                backgroundColor: "transparent",
                                zIndex: 2,
                            }}
                            onPress={() => setIsOpen(false)}
                        />
                    </>
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
        justifyContent: "flex-start",
        alignItems: "center",
        flexDirection: "row",
        position: "relative",
        minHeight: 20,
    },
    cardHolder: {
        color: "white",
        fontSize: 14,
        fontWeight: "500",
        flex: 1,
    },
    pinnedIndicator: {
        position: "absolute",
        right: 0,
        justifyContent: "center",
        alignItems: "center",
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
