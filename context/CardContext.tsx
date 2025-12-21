import React, { ReactNode, createContext, useContext, useEffect, useState } from "react";
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

  const refreshCards = async () => {
    try {
      const storedCards = await secureGetCards();
      setCards(storedCards);
    } catch (error) {
      console.error("Failed to load cards:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
  }, []);

  return (
    <CardContext.Provider value={{ cards, addCard, removeCard, refreshCards, isLoading }}>
      {children}
    </CardContext.Provider>
  );
};

export const useCards = () => {
  const context = useContext(CardContext);
  if (!context) throw new Error("useCards must be used inside CardProvider");
  return context;
};