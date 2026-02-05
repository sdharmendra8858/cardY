/**
 * Migration Context
 * 
 * Handles card migration from old storage to new storage on app startup
 * Only runs migration if needed (checked via needsMigration function)
 * Shows modal during migration process
 */

import { migrateCards, needsMigration } from "@/utils/migration";
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";

type MigrationStatus = "idle" | "checking" | "ready" | "migrating" | "completed" | "error";

type MigrationContextType = {
    status: MigrationStatus;
    isReady: boolean;
    showModal: boolean;
    cardCount: number;
    migratedCount: number;
    error: string | null;
    startMigration: () => void;
    dismissModal: () => void;
};

const MigrationContext = createContext<MigrationContextType | undefined>(undefined);

export const MigrationProvider = ({ children }: { children: ReactNode }) => {
    const [status, setStatus] = useState<MigrationStatus>("idle");
    const [showModal, setShowModal] = useState(false);
    const [cardCount, setCardCount] = useState(0);
    const [migratedCount, setMigratedCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    const dismissModal = React.useCallback(() => {
        if (__DEV__) console.log("👋 User dismissed migration modal");
        setShowModal(false);
        setIsReady(true);
    }, []);

    const startMigration = React.useCallback(async () => {
        if (__DEV__) console.log("🚀 User clicked Start Migration");
        setStatus("migrating");

        try {
            const result = await migrateCards();

            if (result.success) {
                setMigratedCount(result.migratedCount);
                if (__DEV__) console.log(`✅ Migrated ${result.migratedCount} cards`);
                setStatus("completed");
            } else {
                console.error("❌ Migration failed:", result.errors);
                setError(result.errors.join(", "));
                setStatus("error");

                // Auto-recover after 3 seconds
                setTimeout(() => {
                    setStatus("completed");
                    setShowModal(false);
                    setIsReady(true);
                }, 3000);
            }
        } catch (err) {
            console.error("❌ Unexpected migration error:", err);
            setError(err instanceof Error ? err.message : String(err));
            setStatus("error");

            // Auto-recover after 3 seconds
            setTimeout(() => {
                setStatus("completed");
                setShowModal(false);
                setIsReady(true);
            }, 3000);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const checkMigration = async () => {
            try {
                if (__DEV__) console.log("🔄 MigrationContext: Starting migration check...");
                setStatus("checking");

                // Check if migration is needed
                const needed = await needsMigration();

                if (!needed) {
                    if (__DEV__) console.log("✅ Migration not needed");
                    if (isMounted) {
                        setStatus("completed");
                        setIsReady(true); // Allow app to load
                    }
                    return;
                }

                if (__DEV__) console.log("🚀 Migration needed, showing modal...");

                // Get card count BEFORE migration starts
                const { readOldCards } = await import("@/utils/migration/oldStorage");
                const oldCards = await readOldCards();
                const count = oldCards.length;

                // Show modal and wait for user to click "Start Migration"
                if (isMounted) {
                    setCardCount(count);
                    setShowModal(true);
                    setStatus("ready"); // Ready to migrate, waiting for user
                }
            } catch (err) {
                console.error("❌ Unexpected migration check error:", err);
                if (isMounted) {
                    setError(err instanceof Error ? err.message : String(err));
                    setStatus("error");

                    // Auto-recover after 3 seconds
                    setTimeout(() => {
                        if (isMounted) {
                            setStatus("completed");
                            setShowModal(false);
                            setIsReady(true);
                        }
                    }, 3000);
                }
            }
        };

        checkMigration();

        return () => {
            isMounted = false;
        };
    }, []);

    const value = React.useMemo(
        () => ({
            status,
            isReady,
            showModal,
            cardCount,
            migratedCount,
            error,
            startMigration,
            dismissModal,
        }),
        [status, isReady, showModal, cardCount, migratedCount, error, startMigration, dismissModal]
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
