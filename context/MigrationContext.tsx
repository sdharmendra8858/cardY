/**
 * Migration Context
 * 
 * Handles card migration from old storage to new storage on app startup
 * Shows full-screen migration experience instead of modal
 */

import { migrateCards, needsMigration } from "@/utils/migration";
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

type MigrationContextType = {
    needsMigration: boolean;
    cardCount: number;
    isReady: boolean;
    handleMigrate: () => Promise<{ success: boolean; migratedCount: number; errors: string[] }>;
    handleFreshSetup: () => void;
    handleComplete: () => void;
};

const MigrationContext = createContext<MigrationContextType | undefined>(undefined);

export const MigrationProvider = ({ children }: { children: ReactNode }) => {
    const [needsMigrationState, setNeedsMigrationState] = useState(false);
    const [cardCount, setCardCount] = useState(0);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const checkMigration = async () => {
            if (Platform.OS === 'ios') {
                if (__DEV__) console.log("🍎 iOS detected, skipping migration...");
                if (isMounted) setIsReady(true);
                return;
            }

            try {
                if (__DEV__) console.log("🔄 MigrationContext: Starting migration check...");

                // Check if migration is needed
                const needed = await needsMigration();

                if (!needed) {
                    if (__DEV__) console.log("✅ Migration not needed");
                    if (isMounted) {
                        setIsReady(true);
                    }
                    return;
                }

                if (__DEV__) console.log("🚀 Migration needed, preparing screen...");

                // Get card count
                const { readOldCards } = await import("@/utils/migration/oldStorage");
                const oldCards = await readOldCards();
                const count = oldCards.length;

                if (isMounted) {
                    setCardCount(count);
                    setNeedsMigrationState(true);
                }
            } catch (err) {
                console.error("❌ Unexpected migration check error:", err);
                if (isMounted) {
                    // On error, allow app to load
                    setIsReady(true);
                }
            }
        };

        checkMigration();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleMigrate = React.useCallback(async () => {
        if (__DEV__) console.log("🚀 User started migration");
        const result = await migrateCards();
        return result;
    }, []);

    const handleFreshSetup = React.useCallback(async () => {
        if (__DEV__) console.log("🔄 User chose fresh setup");

        // Delete old cards and mark migration as complete
        const { deleteOldCards } = await import("@/utils/migration/oldStorage");
        const AsyncStorage = await import("@react-native-async-storage/async-storage");

        try {
            await deleteOldCards();
            await AsyncStorage.default.setItem("@migration_status", "v1");
            if (__DEV__) console.log("✅ Old cards deleted, fresh setup ready");
        } catch (error) {
            console.error("❌ Error during fresh setup:", error);
        }

        setNeedsMigrationState(false); // Hide migration screen
        setIsReady(true); // Allow app to load
    }, []);

    const handleComplete = React.useCallback(() => {
        if (__DEV__) console.log("✅ Migration complete, loading app");
        setNeedsMigrationState(false); // Hide migration screen
        setIsReady(true); // Allow app to load
    }, []);

    const value = React.useMemo(
        () => ({
            needsMigration: needsMigrationState,
            cardCount,
            isReady,
            handleMigrate,
            handleFreshSetup,
            handleComplete,
        }),
        [needsMigrationState, cardCount, isReady, handleMigrate, handleFreshSetup, handleComplete]
    );

    return (
        <MigrationContext.Provider value={value}>
            {children}
        </MigrationContext.Provider>
    );
};

export const useMigration = () => {
    const context = useContext(MigrationContext);
    if (!context) {
        throw new Error("useMigration must be used inside MigrationProvider");
    }
    return context;
};
