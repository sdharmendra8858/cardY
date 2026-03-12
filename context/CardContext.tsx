import React, { ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Card,
  getMaskedCards,
  setCards as persistCards,
  addCard as secureAddCard,
  removeCard as secureRemoveCard,
  revealCard as secureRevealCard,
  updateCard as secureUpdateCard
} from "../utils/secureStorage";
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

export const CardProvider = ({ children }: { children: ReactNode }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const cardsRef = React.useRef<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isDeviceCompromised } = useSecurity();

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
      const expiredCardIds: string[] = [];
      const activeCards = storedCards.filter((card) => {
        if (card.cardExpiresAt && now > card.cardExpiresAt && card.cardUser === "other") {
          expiredCardIds.push(card.id);
          return false; // Remove this card
        }
        return true; // Keep this card
      });

      // If any cards were filtered out, persist to storage
      if (activeCards.length !== storedCards.length) {
        if (__DEV__) {
          expiredCardIds.forEach(id => {
            const card = storedCards.find(c => c.id === id);
            if (card) {
              console.log(`🗑️ Card expired and filtered out: ${id}, expiresAt=${card.cardExpiresAt}, now=${now}`);
            }
          });
          console.log(`📦 Updating storage: removing ${storedCards.length - activeCards.length} expired card(s)`);
        }
        // Persist the filtered cards to storage
        await persistCards(activeCards);
      }

      // Update context state if cards changed
      const prevCards = cardsRef.current;
      const cardsChanged = JSON.stringify(prevCards) !== JSON.stringify(activeCards);

      if (cardsChanged) {
        cardsRef.current = activeCards;
        // Update React state to trigger re-render
        setCards(activeCards);
      }
    } catch (error) {
      console.error("Failed to load cards:", error);
    } finally {
      setIsLoading(false);
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
      const { toggleCardPin } = await import("../utils/secureStorage");
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

export const useCards = () => {
  const context = useContext(CardContext);
  if (!context) throw new Error("useCards must be used inside CardProvider");
  return context;
};

// --- Timer Context for real-time updates ---

type TimerContextType = {
  timerTick: number;
};

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider = ({ children }: { children: ReactNode }) => {
  const [timerTick, setTimerTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setTimerTick(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return (
    <TimerContext.Provider value={{ timerTick }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) throw new Error("useTimer must be used inside TimerProvider");
  return context;
};