import { ThemedText } from "@/components/themed-text";
import { Image, StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

interface ShareQRTemplateProps {
    qrValue: string;
    expiresInSeconds?: number;
}

export default function ShareQRTemplate({
    qrValue,
    expiresInSeconds,
}: ShareQRTemplateProps) {
    // ⛔ Never render QR without data (prevents crashes)
    if (!qrValue) return null;

    const formatTime = (seconds?: number) => {
        if (!seconds || seconds <= 0) return "Expired";
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${String(s).padStart(2, "0")}`;
    };

    return (
        <View style={styles.container}>
            {/* Brand */}
            <ThemedText style={styles.brand}>
                cardywall
            </ThemedText>

            {/* Subtitle (receipt-style context) */}
            <ThemedText style={styles.subtitle}>
                Secure Card Sharing
            </ThemedText>

            {/* QR with centered icon */}
            <View style={styles.qrWrapper}>
                <QRCode
                    value={qrValue}
                    size={180}
                    color="#000"
                    backgroundColor="#fff"
                />
                {/* App icon overlay in center */}
                <View style={styles.iconOverlay}>
                    <Image
                        source={require("@/assets/images/cc.png")}
                        style={styles.icon}
                    />
                </View>
            </View>

            {/* Footer info (like UPI receipts) */}
            <View style={styles.footer}>
                <ThemedText style={styles.footerText}>
                    Scan to receive card details
                </ThemedText>

                {expiresInSeconds !== undefined && (
                    <ThemedText style={styles.expiry}>
                        Expires in {formatTime(expiresInSeconds)}
                    </ThemedText>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 300,
        paddingVertical: 24,
        paddingHorizontal: 20,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        alignItems: "center",
    },

    brand: {
        fontSize: 20,
        fontWeight: "800",
        letterSpacing: 0.6,
    },

    subtitle: {
        fontSize: 13,
        marginTop: 4,
        marginBottom: 16,
        opacity: 0.6,
    },

    qrWrapper: {
        padding: 14,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        elevation: 3,
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
    },

    iconOverlay: {
        position: "absolute",
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        elevation: 5,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },

    icon: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },

    footer: {
        marginTop: 16,
        alignItems: "center",
    },

    footerText: {
        fontSize: 13,
        opacity: 0.75,
    },

    expiry: {
        marginTop: 6,
        fontSize: 12,
        opacity: 0.5,
    },
});