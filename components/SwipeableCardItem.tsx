import CardItem from "@/components/CardItem";
import SwipeGestureHandler from "@/components/SwipeGestureHandler";
import { useCardPinning } from "@/context/CardPinningContext";
import React, { useState } from "react";

interface SwipeableCardItemProps {
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
}

const SwipeableCardItem: React.FC<SwipeableCardItemProps> = ({
    id,
    cardName,
    cardNumber,
    cardHolder,
    onDelete,
    onReveal,
    cardKind,
    cobrandName,
    cardUser = "self",
    dominantColor,
    cardExpiresAt,
    expiry,
    isExpiring,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const { isPinned, togglePin } = useCardPinning();

    const handleSwipeOpen = (cardId: string) => {
        if (cardId === id) {
            setIsOpen(true);
        }
    };

    const handleSwipeClose = () => {
        setIsOpen(false);
    };

    const handlePin = (cardId: string, cardType: "self" | "shared") => {
        togglePin(cardId);
        handleSwipeClose();
    };

    const handleDelete = (cardId: string) => {
        handleSwipeClose();
        if (onDelete) {
            onDelete(cardId);
        }
    };

    return (
        <SwipeGestureHandler
            cardId={id}
            cardType={cardUser as "self" | "shared"}
            isPinned={isPinned(id)}
            isOpen={isOpen}
            onSwipeOpen={handleSwipeOpen}
            onSwipeClose={handleSwipeClose}
            onPin={handlePin}
            onDelete={handleDelete}
        >
            <CardItem
                id={id}
                cardName={cardName}
                cardNumber={cardNumber}
                cardHolder={cardHolder}
                onDelete={onDelete}
                onReveal={onReveal}
                cardKind={cardKind}
                cobrandName={cobrandName}
                cardUser={cardUser}
                dominantColor={dominantColor}
                cardExpiresAt={cardExpiresAt}
                expiry={expiry}
                isExpiring={isExpiring}
            />
        </SwipeGestureHandler>
    );
};

export default SwipeableCardItem;
