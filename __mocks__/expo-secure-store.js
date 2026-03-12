// Mock for expo-secure-store
export const setItemAsync = jest.fn(() => Promise.resolve());
export const getItemAsync = jest.fn(() => Promise.resolve(null));
export const deleteItemAsync = jest.fn(() => Promise.resolve());
export const isAvailableAsync = jest.fn(() => Promise.resolve(true));
