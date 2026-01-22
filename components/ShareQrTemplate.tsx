import { StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

interface ShareQRTemplateProps {
    qrValue: string;
    expiresInSeconds?: number;
    intent?: 'send' | 'receive';
}

export default function ShareQRTemplate({
    qrValue,
    expiresInSeconds,
    intent,
}: ShareQRTemplateProps) {
    // ⛔ Never render QR without data (prevents crashes)
    if (!qrValue || !intent) return null;

    const formatTime = (seconds?: number) => {
        if (!seconds || seconds <= 0) return "Expired";
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${String(s).padStart(2, "0")}`;
    };

    const intentText = intent === 'send'
        ? 'Scan to receive my card'
        : 'Scan to share your card';

    const footerText = intent === 'send'
        ? 'I want to share my card with you'
        : 'Ready to receive your card';

    return (
        <View style={styles.container}>
            {/* Brand */}
            <Text style={styles.brand}>
                cardyWall
            </Text>

            {/* Intent subtitle */}
            <Text style={styles.subtitle}>
                {intentText}
            </Text>

            {/* Decorative line */}
            <View style={styles.decorativeLine} />

            {/* QR with centered icon */}
            <View style={styles.qrWrapper}>
                <QRCode
                    value={qrValue}
                    size={180}
                    color="#000"
                    logo={require("@/assets/images/cc.png")}
                    logoSize={40}
                    logoBorderRadius={50}
                    backgroundColor="#fff"
                />
            </View>

            {/* Footer info with indicator */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    {footerText}
                </Text>

                {expiresInSeconds !== undefined && (
                    <Text style={styles.expiry}>
                        Expires in {formatTime(expiresInSeconds)}
                    </Text>
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
        paddingBottom: 32,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        alignItems: "center",
        overflow: "hidden",
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

    decorativeLine: {
        width: 40,
        height: 2,
        backgroundColor: "#007AFF",
        marginBottom: 16,
        borderRadius: 1,
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

    footer: {
        marginTop: 16,
        alignItems: "center",
    },

    footerText: {
        fontSize: 13,
        opacity: 0.75,
        textAlign: "center",
        fontWeight: "500",
    },

    expiry: {
        marginTop: 6,
        fontSize: 12,
        opacity: 0.5,
    },
});