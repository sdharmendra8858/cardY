import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Colors } from "../constants/theme";
import AppButton from "./AppButton";

interface QRDisplaySectionProps {
    qrData: string;
    card: any;
    onShareQR: () => void;
    onCardShared: () => void;
    expiresInSeconds?: number;
}

export default function QRDisplaySection({
    qrData,
    card,
    onShareQR,
    onCardShared,
}: QRDisplaySectionProps) {
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];

    return (
        <>
            <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>

                    <View style={[styles.cardPreview, { backgroundColor: palette.card }]}>
                        <View style={styles.cardInfo}>
                            <MaterialIcons name="credit-card" size={24} color={palette.tint} />
                            <View style={styles.cardDetails}>
                                <ThemedText style={styles.cardName}>{card.bank || 'Bank'}</ThemedText>
                                <ThemedText style={styles.cardNumber}>
                                    {card.cardNumber}
                                </ThemedText>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.qrContainer, { backgroundColor: palette.card }]}>
                        <ThemedText style={styles.qrTitle}>Scan This QR Code</ThemedText>

                        {qrData ? (
                            <>
                                <View style={styles.qrWrapper}>
                                    <QRCode
                                        value={qrData}
                                        size={200}
                                        color="black"
                                        backgroundColor="white"
                                        logo={require("@/assets/images/cc.png")}
                                        logoSize={40}
                                        logoBorderRadius={20}
                                    />
                                </View>
                                <View style={styles.encryptionNotice}>
                                    <MaterialIcons name="security" size={16} color={palette.primary} />
                                    <ThemedText style={styles.encryptionText}>
                                        End-to-end encrypted
                                    </ThemedText>
                                </View>
                            </>
                        ) : (
                            <View style={styles.qrPlaceholder}>
                                <MaterialIcons name="enhanced-encryption" size={100} color={palette.secondary} />
                                <ThemedText style={styles.qrPlaceholderText}>
                                    Encrypting card data...
                                </ThemedText>
                            </View>
                        )}

                        <View style={styles.instructionBox}>
                            <ThemedText style={styles.instructionTitle}>Ready to scan!</ThemedText>
                            <ThemedText style={styles.instructionText}>
                                Have the card receiver open their CardyWall app and scan this QR code using their camera in the Import Card section.
                            </ThemedText>
                        </View>
                    </View>

                    <View style={styles.securityNotice}>
                        <MaterialIcons name="security" size={20} color={palette.secondary || "#666"} />
                        <ThemedText style={styles.securityText}>
                            This card is encrypted and can only be decrypted on the receiving device.
                        </ThemedText>
                    </View>

                    <View style={styles.cvvNotice}>
                        <MaterialIcons name="info-outline" size={20} color={palette.primary} />
                        <ThemedText style={styles.cvvText}>
                            CVV will not be shared for security reasons.
                        </ThemedText>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
                <AppButton
                    title="Share QR Code"
                    onPress={onShareQR}
                    disabled={!qrData}
                    variant="secondary"
                    icon="share"
                    iconLibrary="material"
                    fullWidth
                />

                <TouchableOpacity
                    style={[styles.doneButton, { backgroundColor: palette.primary }]}
                    onPress={onCardShared}
                    activeOpacity={0.8}
                >
                    <MaterialIcons name="check" size={20} color={palette.onPrimary} />
                    <ThemedText style={[styles.doneButtonText, { color: palette.onPrimary }]}>
                        Card Shared
                    </ThemedText>
                </TouchableOpacity>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    scrollContent: { flex: 1 },
    scrollContentContainer: { paddingBottom: 20 },
    content: { padding: 20 },
    cardPreview: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    cardInfo: {
        flexDirection: "row",
        alignItems: "center",
    },
    cardDetails: {
        marginLeft: 12,
        flex: 1,
    },
    cardName: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 4,
    },
    cardNumber: {
        fontSize: 14,
        opacity: 0.7,
        fontFamily: "monospace",
    },
    qrContainer: {
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        borderRadius: 16,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    qrDisplay: {
        alignItems: "center",
        width: "100%",
    },
    qrTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 16,
        textAlign: "center",
    },
    instructionBox: {
        marginBottom: 20,
        paddingHorizontal: 16,
    },
    instructionTitle: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
        textAlign: "center",
    },
    instructionText: {
        fontSize: 12,
        opacity: 0.8,
        textAlign: "center",
        lineHeight: 18,
    },
    securityNotice: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0, 122, 255, 0.1)",
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    securityText: {
        flex: 1,
        fontSize: 14,
        opacity: 0.8,
        lineHeight: 20,
    },
    cvvNotice: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0, 122, 255, 0.08)",
        padding: 16,
        borderRadius: 12,
        gap: 12,
        marginTop: 12,
    },
    cvvText: {
        flex: 1,
        fontSize: 14,
        opacity: 0.8,
        lineHeight: 20,
    },
    buttonContainer: {
        padding: 20,
        paddingBottom: 32,
        gap: 8,
    },
    doneButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
    },
    doneButtonText: {
        fontSize: 16,
        fontWeight: "600",
    },
    qrCodeContainer: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
        padding: 20,
        borderRadius: 12,
        marginVertical: 16,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    qrWrapper: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 3,
    },
    qrPlaceholder: {
        alignItems: "center",
        justifyContent: "center",
        width: 200,
        height: 200,
    },
    qrPlaceholderText: {
        marginTop: 12,
        fontSize: 14,
        color: "#666",
        textAlign: "center",
    },
    encryptionNotice: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: "rgba(0, 122, 255, 0.1)",
        borderRadius: 16,
        gap: 6,
    },
    encryptionText: {
        fontSize: 12,
        color: "#007AFF",
        fontWeight: "500",
    },
});
