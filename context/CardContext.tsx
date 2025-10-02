import React, { ReactNode, createContext, useContext, useState } from "react";

type Card = {
  id: string;
  cardName: string;
  cardNumber: string;
  cardHolder: string;
  expiry: string;
};

type CardContextType = {
  cards: Card[];
  addCard: (card: Card) => void;
  removeCard: (id: string) => void;
};

const CardContext = createContext<CardContextType | undefined>(undefined);

export const CardProvider = ({ children }: { children: ReactNode }) => {
  const [cards, setCards] = useState<Card[]>([]);

  const addCard = (card: Card) => {
    setCards((prev) => [...prev, card]);
  };

  const removeCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <CardContext.Provider value={{ cards, addCard, removeCard }}>
      {children}
    </CardContext.Provider>
  );
};

export const useCardContext = () => {
  const context = useContext(CardContext);
  if (!context) throw new Error("useCardContext must be used inside CardProvider");
  return context;
};