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
    migratedCount: number;
    error: string | null;
};

const MigrationContext = createContext<MigrationContextType | undefined>(undefined);

export const MigrationProvider = ({ children }: { children: ReactNode }) => {
    const [status, setStatus] = useState<MigrationStatus>("idle");
    const [showModal, setShowModal] = useState(false);
    const [migratedCount, setMigratedCount] = useState(0);
    const [error, setError] = useState<string | null>(null);

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
                    }
                    return;
                }

                if (__DEV__) console.log("🚀 Migration needed, showing modal...");

                // Show modal before starting migration
                if (isMounted) {
                    setShowModal(true);
                }

                // Run migration
                const result = await migrateCards();

                if (!isMounted) return;

                if (result.success) {
                    setMigratedCount(result.migratedCount);

                    if (result.migratedCount > 0) {
                        if (__DEV__) console.log(`✅ Migrated ${result.migratedCount} cards`);
                        setStatus("migrating");

                        // Show success for 1.5 seconds
                        setTimeout(() => {
                            if (isMounted) {
                                setStatus("completed");
                                setShowModal(false);
                            }
                        }, 1500);
                    } else {
                        if (__DEV__) console.log("✅ No cards to migrate");
                        setStatus("completed");
                        setShowModal(false);
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
            isReady: status === "completed",
            showModal,
            migratedCount,
            error,
        }),
        [status, showModal, migratedCount, error]
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
