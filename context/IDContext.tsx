import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { IDDocument } from '@/types/id';
import { getIDs, addID as storageAddID, deleteID as storageDeleteID } from '@/utils/idStorage';

interface IDContextType {
  ids: IDDocument[];
  isLoading: boolean;
  hasLoaded: boolean;
  refreshIDs: () => Promise<void>;
  addID: (idDoc: IDDocument) => Promise<void>;
  removeID: (id: string) => Promise<void>;
}

const IDContext = createContext<IDContextType | undefined>(undefined);

export function IDProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<IDDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const refreshIDs = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedIDs = await getIDs();
      setIds(fetchedIDs);
      setHasLoaded(true);
    } catch (error) {
      console.error("❌ IDContext: Failed to fetch IDs:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addID = useCallback(async (idDoc: IDDocument) => {
    try {
      await storageAddID(idDoc);
      // Re-fetch all IDs from storage to ensure we have normalized absolute paths in our state
      await refreshIDs();
    } catch (error) {
       console.error("❌ IDContext: Failed to add ID:", error);
       throw error;
    }
  }, [refreshIDs]);

  const removeID = useCallback(async (id: string) => {
    try {
      await storageDeleteID(id);
      setIds(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("❌ IDContext: Failed to remove ID:", error);
      throw error;
    }
  }, []);

  return (
    <IDContext.Provider value={{ ids, isLoading, hasLoaded, refreshIDs, addID, removeID }}>
      {children}
    </IDContext.Provider>
  );
}

export function useIDs() {
  const context = useContext(IDContext);
  if (context === undefined) {
    throw new Error('useIDs must be used within an IDProvider');
  }
  return context;
}
