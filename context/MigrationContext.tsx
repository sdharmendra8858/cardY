/**
 * Migration Context
 * 
 * Handles card migration from old storage to new storage on app startup
 * Only runs migration if needed (checked via needsMigration function)
 * Shows modal during migration process
 */

import { migrateCards, needsMigration } from "@/utils/migration";
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";

type MigrationStatus = "idle" | "checking" | "migrating" | "completed" | "error";

type MigrationContextType = {
    status: MigrationStatus;
    isReady: boolean;
    showModal: boolean;
    cardCount: number;
    migratedCount: number;
    error: string | null;
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

    useEffect(() => {
        let isMounted = true;

        const runMigration = async () => {
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

                // Show modal BEFORE starting migration
                if (isMounted) {
                    setCardCount(count);
                    setShowModal(true);
                    setStatus("checking");
                }

                // Small delay to ensure modal is visible
                await new Promise(resolve => setTimeout(resolve, 500));

                // Run migration
                if (__DEV__) console.log("🔄 Starting migration process...");
                setStatus("migrating");

                const result = await migrateCards();

                if (!isMounted) return;

                if (result.success) {
                    setMigratedCount(result.migratedCount);

                    if (result.migratedCount > 0) {
                        if (__DEV__) console.log(`✅ Migrated ${result.migratedCount} cards`);
                        setStatus("completed");
                        // Keep modal open - user must click "Done"
                    } else {
                        if (__DEV__) console.log("✅ No cards to migrate");
                        setStatus("completed");
                        setShowModal(false);
                        setIsReady(true);
                    }
                } else {
                    console.error("❌ Migration failed:", result.errors);
                    setError(result.errors.join(", "));
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
            } catch (err) {
                console.error("❌ Unexpected migration error:", err);
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

        runMigration();

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
            dismissModal,
        }),
        [status, isReady, showModal, cardCount, migratedCount, error, dismissModal]
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
