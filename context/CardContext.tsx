import React, { ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cleanupExpiredCards } from "../utils/cardExpiry";
import { addCard as secureAddCard, getCards as secureGetCards, removeCard as secureRemoveCard } from "../utils/secureStorage";

type Card = {
  id: string;
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv?: string;
  cardName?: string;
  cardKind?: "credit" | "debit";
  cobrandName?: string;
  cardUser?: "self" | "other";
  dominantColor?: string;
  bank?: string;
  cardExpiresAt?: number; // Unix timestamp - when imported card should be auto-removed
};

type CardContextType = {
  cards: Card[];
  addCard: (card: Card) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  refreshCards: () => Promise<void>;
  isLoading: boolean;
};

const CardContext = createContext<CardContextType | undefined>(undefined);

export const CardProvider = ({ children }: { children: ReactNode }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCards = useCallback(async () => {
    try {
      await cleanupExpiredCards();
      const storedCards = await secureGetCards();
      setCards(storedCards);
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

  const removeCard = async (id: string) => {
    try {
      await secureRemoveCard(id);
      await refreshCards();
    } catch (error) {
      console.error("Failed to remove card:", error);
      throw error;
    }
  };

  useEffect(() => {
    refreshCards();
  }, [refreshCards]);

  const value = React.useMemo(() => ({
    cards,
    addCard,
    removeCard,
    refreshCards,
    isLoading
  }), [cards, addCard, removeCard, refreshCards, isLoading]);

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