/**
 * Security Context
 * Manages device security state and compromised device banner
 * 
 * Spec 11: Root / Jailbreak Response (Mandatory)
 */

import { checkDeviceSecurity, handleCompromisedDevice } from "@/utils/security";
import React, { ReactNode, createContext, useContext, useEffect, useState } from "react";

interface SecurityContextType {
    isDeviceCompromised: boolean;
    isSecurityCheckComplete: boolean;
    securityCheckError?: string;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider = ({ children }: { children: ReactNode }) => {
    const [isDeviceCompromised, setIsDeviceCompromised] = useState(false);
    const [isSecurityCheckComplete, setIsSecurityCheckComplete] = useState(false);
    const [securityCheckError, setSecurityCheckError] = useState<string>();

    // Spec 12: App Launch Security Flow
    useEffect(() => {
        const performSecurityCheck = async () => {
            try {
                console.log("🔒 Performing device security check on app launch...");
                const result = await checkDeviceSecurity();

                if (result.isCompromised) {
                    console.warn("🚨 Device is compromised:", result.reason);
                    setIsDeviceCompromised(true);

                    // Spec 11: Mandatory wipe on compromised device
                    await handleCompromisedDevice();
                } else {
                    console.log("✅ Device security check passed");
                    setIsDeviceCompromised(false);
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error("❌ Security check failed:", message);
                setSecurityCheckError(message);
                // Fail safe: assume compromised if check fails
                setIsDeviceCompromised(true);
                await handleCompromisedDevice();
            } finally {
                setIsSecurityCheckComplete(true);
            }
        };

        performSecurityCheck();
    }, []);

    const value = {
        isDeviceCompromised,
        isSecurityCheckComplete,
        securityCheckError,
    };

    return (
        <SecurityContext.Provider value={value}>
            {children}
        </SecurityContext.Provider>
    );
};

export const useSecurity = () => {
    const context = useContext(SecurityContext);
    if (!context) {
        throw new Error("useSecurity must be used inside SecurityProvider");
    }
    return context;
};
