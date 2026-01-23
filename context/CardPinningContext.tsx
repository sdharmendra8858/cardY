import React, { ReactNode, createContext, useCallback, useContext, useState } from "react";

type CardPinningContextType = {
    pinnedCards: Set<string>;
    togglePin: (cardId: string) => void;
    isPinned: (cardId: string) => boolean;
    canPin: (cardType: "self" | "shared" | "other") => boolean;
};

const CardPinningContext = createContext<CardPinningContextType | undefined>(undefined);

export const CardPinningProvider = ({ children }: { children: ReactNode }) => {
    const [pinnedCards, setPinnedCards] = useState<Set<string>>(new Set());

    const togglePin = useCallback((cardId: string) => {
        setPinnedCards((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(cardId)) {
                newSet.delete(cardId);
            } else {
                newSet.add(cardId);
            }
            return newSet;
        });
    }, []);

    const isPinned = useCallback((cardId: string) => {
        return pinnedCards.has(cardId);
    }, [pinnedCards]);

    const canPin = useCallback((cardType: "self" | "shared" | "other") => {
        return true; // Allow pinning for all card types
    }, []);

    const value = React.useMemo(
        () => ({
            pinnedCards,
            togglePin,
            isPinned,
            canPin,
        }),
        [pinnedCards, togglePin, isPinned, canPin]
    );

    return (
        <CardPinningContext.Provider value={value}>
            {children}
        </CardPinningContext.Provider>
    );
};

export const useCardPinning = () => {
    const context = useContext(CardPinningContext);
    if (!context) {
        throw new Error("useCardPinning must be used inside CardPinningProvider");
    }
    return context;
};
