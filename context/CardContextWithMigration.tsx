/**
 * Card Context with Migration Support
 * 
 * Wraps the original CardContext to use secureStorageWithFallback
 * Does NOT modify original CardContext.tsx
 */

import React, { ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
import {
    Card,
    getMaskedCards,
    getUnmaskedCards,
    setCards as persistCards,
    addCard as secureAddCard,
    removeCard as secureRemoveCard,
    revealCard as secureRevealCard,
    updateCard as secureUpdateCard,
} from "../utils/secureStorageWithFallback";
import { useMigration } from "./MigrationContext";
import { useSecurity } from "./SecurityContext";

// Export Card type for use in other modules
export type { Card };

type CardContextType = {
    cards: Card[];
    addCard: (card: Card) => Promise<void>;
    updateCard: (id: string, card: Card) => Promise<void>;
    removeCard: (id: string) => Promise<void>;
    refreshCards: () => Promise<void>;
    revealCard: (cardId: string) => Promise<Card | null>;
    togglePin: (cardId: string, shouldPin: boolean) => Promise<void>;
    isLoading: boolean;
};

const CardContext = createContext<CardContextType | undefined>(undefined);

export const CardProviderWithMigration = ({ children }: { children: ReactNode }) => {
    const [cards, setCards] = useState<Card[]>([]);
    const cardsRef = React.useRef<Card[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { isDeviceCompromised } = useSecurity();
    const { isReady: isMigrationReady } = useMigration();

    // Clear cards if device is compromised
    useEffect(() => {
        if (isDeviceCompromised) {
            setCards([]);
            cardsRef.current = [];
            if (__DEV__) console.log("🔒 CardContext: Cleared cards due to compromised device");
        }
    }, [isDeviceCompromised]);

    const refreshCards = useCallback(async () => {
        try {
            const storedCards = await getMaskedCards();
            // Check for expired cards and filter them out
            const now = Math.floor(Date.now() / 1000);
            const expiredCards = storedCards.filter(card =>
                card.cardExpiresAt && now > card.cardExpiresAt && card.cardUser === "other"
            );

            // If any cards were filtered out, persist the UNMASKED versions to storage
            if (expiredCards.length > 0) {
                if (__DEV__) console.log(`📦 Filtering ${expiredCards.length} expired card(s) and updating storage...`);

                const unmaskedCards = await getUnmaskedCards();
                const activeUnmaskedCards = unmaskedCards.filter(card =>
                    !expiredCards.some(expired => expired.id === card.id)
                );

                // Persist the filtered UNMASKED cards to storage
                await persistCards(activeUnmaskedCards);

                // Re-fetch masked cards for display
                const updatedMasked = await getMaskedCards();
                updateCardsState(updatedMasked);
                return;
            }

            // Update context state if cards changed
            updateCardsState(storedCards);
        } catch (error) {
            console.error("Failed to load cards:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateCardsState = useCallback((newCards: Card[]) => {
        const prevCards = cardsRef.current;
        const cardsChanged = JSON.stringify(prevCards) !== JSON.stringify(newCards);

        if (cardsChanged) {
            cardsRef.current = newCards;
            setCards(newCards);
        }
    }, []);

    const addCard = async (card: Card) => {
        try {
            await secureAddCard(card);
            await refreshCards();
        } catch (error) {
            console.error("Failed to add card:", error);
            throw error;
        }
    };

    const updateCard = async (id: string, card: Card) => {
        try {
            await secureUpdateCard(id, card);
            await refreshCards();
        } catch (error) {
            console.error("Failed to update card:", error);
            throw error;
        }
    };

    const removeCard = async (id: string) => {
        try {
            await secureRemoveCard(id);
            await refreshCards();
        } catch (error) {
            console.error("Failed to remove card:", error);
            throw error;
        }
    };

    const revealCard = async (cardId: string): Promise<Card | null> => {
        try {
            const revealedCard = await secureRevealCard(cardId);
            return revealedCard;
        } catch (error) {
            console.error("Failed to reveal card:", error);
            return null;
        }
    };

    const togglePin = async (cardId: string, shouldPin: boolean) => {
        try {
            const { toggleCardPin } = await import("../utils/secureStorageWithFallback");
            await toggleCardPin(cardId, shouldPin);
            await refreshCards();
        } catch (error) {
            console.error("Failed to toggle pin:", error);
            throw error;
        }
    };

    useEffect(() => {
        refreshCards();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    // Refresh cards when migration completes
    useEffect(() => {
        if (isMigrationReady) {
            if (__DEV__) {
                console.log("🔄 Migration ready check, refreshing cards...");
            }
            // Use a small delay to ensure storage writes are complete
            const timer = setTimeout(() => {
                refreshCards();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isMigrationReady, refreshCards]);

    const value = React.useMemo(() => ({
        cards,
        addCard,
        updateCard,
        removeCard,
        refreshCards,
        revealCard,
        togglePin,
        isLoading
    }), [cards, addCard, updateCard, removeCard, refreshCards, revealCard, isLoading]);

    return (
        <CardContext.Provider value={value}>
            {children}
        </CardContext.Provider>
    );
};

export const useCardsWithMigration = () => {
    const context = useContext(CardContext);
    if (!context) throw new Error("useCardsWithMigration must be used inside CardProviderWithMigration");
    return context;
};
