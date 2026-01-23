import SwipeActionButtons from "@/components/SwipeActionButtons";
import { useCardPinning } from "@/context/CardPinningContext";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";

interface SwipeGestureHandlerProps {
    cardId: string;
    cardType: "self" | "shared";
    isPinned: boolean;
    isOpen: boolean;
    onSwipeOpen: (cardId: string) => void;
    onSwipeClose: () => void;
    onPin: (cardId: string, cardType: "self" | "shared") => void;
    onDelete: (cardId: string) => void;
    children: React.ReactNode;
}

const SWIPE_THRESHOLD = 50;
const ACTION_BUTTON_WIDTH = 80;
const MAX_SWIPE_DISTANCE = ACTION_BUTTON_WIDTH * 2;

const SwipeGestureHandler: React.FC<SwipeGestureHandlerProps> = ({
    cardId,
    cardType,
    isPinned,
    isOpen,
    onSwipeOpen,
    onSwipeClose,
    onPin,
    onDelete,
    children,
}) => {
    const { canPin } = useCardPinning();
    const translateX = useRef(new Animated.Value(0)).current;
    const [cardHeight, setCardHeight] = useState(140);
    const panResponder = useRef({
        x: 0,
        isMoving: false,
    }).current;

    const handlePanGestureEvent = Animated.event(
        [{ nativeEvent: { translationX: translateX } }],
        { useNativeDriver: false }
    );

    const handlePanStateChange = (event: any) => {
        const { translationX, velocityX, state } = event.nativeEvent;

        if (state === State.BEGAN) {
            panResponder.x = translationX;
            panResponder.isMoving = true;
            onSwipeOpen(cardId);
        } else if (state === State.END || state === State.CANCELLED) {
            panResponder.isMoving = false;
            const distance = Math.abs(translationX);
            const velocity = Math.abs(velocityX);

            // Determine if we should open or close based on distance and velocity
            const shouldOpen = distance > SWIPE_THRESHOLD || velocity > 500;

            // Determine direction
            const isSwipeLeft = translationX < 0;
            const isSwipeRight = translationX > 0;

            if (shouldOpen && isSwipeLeft) {
                // Snap to open (swipe left)
                Animated.spring(translateX, {
                    toValue: -MAX_SWIPE_DISTANCE,
                    useNativeDriver: false,
                    speed: 12,
                    bounciness: 3,
                }).start();
            } else if (shouldOpen && isSwipeRight) {
                // Snap to open (swipe right) - not used in this design but available
                Animated.spring(translateX, {
                    toValue: MAX_SWIPE_DISTANCE,
                    useNativeDriver: false,
                    speed: 12,
                    bounciness: 3,
                }).start();
            } else {
                // Snap to closed with smooth animation
                Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: false,
                    speed: 12,
                    bounciness: 3,
                }).start();
                onSwipeClose();
            }
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
        const { height } = event.nativeEvent.layout;
        setCardHeight(height);
    };

    return (
        <View style={{ overflow: "hidden", borderRadius: 12, position: "relative" }}>
            {/* Action Buttons - positioned absolutely behind */}
            <View
                style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: MAX_SWIPE_DISTANCE,
                    height: cardHeight,
                    zIndex: 0,
                }}
            >
                <SwipeActionButtons
                    cardId={cardId}
                    cardType={cardType}
                    isPinned={isPinned}
                    canPin={canPin(cardType)}
                    onPin={onPin}
                    onDelete={onDelete}
                    buttonHeight={cardHeight / 2}
                />
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
                    {children}
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
                    onPress={onSwipeClose}
                />
            )}
        </View>
    );
};

export default SwipeGestureHandler;
