import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { CameraView } from "expo-camera";
import React from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/theme";

interface QRScanSectionProps {
    isScanning: boolean;
    scanLineAnimation: Animated.Value;
    onBarcodeScanned: (data: { type: string; data: string }) => void;
    onCameraError?: (error: any) => void;
    onScanPress: () => void;
    onUploadPress: () => void;
    onStopPress: () => void;
    isProcessing?: boolean;
    title: string;
    instructions: Array<{
        number: number;
        text: string;
    }>;
}

export default function QRScanSection({
    isScanning,
    scanLineAnimation,
    onBarcodeScanned,
    onCameraError,
    onScanPress,
    onUploadPress,
    onStopPress,
    isProcessing = false,
    title,
    instructions,
}: QRScanSectionProps) {
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];

    return (
        <>
            <View style={[styles.scanArea, { backgroundColor: palette.card }]}>
                {isScanning ? (
                    <CameraView
                        style={styles.camera}
                        facing="back"
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr"],
                        }}
                        onBarcodeScanned={isScanning ? onBarcodeScanned : undefined}
                        onCameraReady={() => {
                            console.log('Camera is ready for scanning');
                        }}
                        onMountError={(error) => {
                            console.error('Camera mount error:', error);
                            onCameraError?.(error);
                        }}
                    >
                        <View style={styles.cameraOverlay}>
                            <View style={styles.scanFrame}>
                                <Animated.View
                                    style={[
                                        styles.scanLine,
                                        {
                                            backgroundColor: palette.primary,
                                            transform: [{
                                                translateY: scanLineAnimation.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0, 200],
                                                }),
                                            }],
                                        },
                                    ]}
                                />
                            </View>
                            <ThemedText style={[styles.cameraText, { backgroundColor: "rgba(0,0,0,0.7)" }]}>
                                Center the QR code in the frame
                            </ThemedText>
                        </View>
                    </CameraView>
                ) : (
                    <View style={styles.scanPlaceholder}>
                        <View style={[styles.placeholderIcon, { backgroundColor: palette.card }]}>
                            <MaterialIcons name="qr-code-2" size={80} color={palette.secondary} />
                        </View>
                        <ThemedText style={[styles.scanPlaceholderText, { color: palette.text }]}>
                            Ready to scan when you tap the button below
                        </ThemedText>
                    </View>
                )}
            </View>

            <View style={[styles.instructions, { backgroundColor: palette.card }]}>
                <ThemedText style={[styles.instructionTitle, { color: palette.text }]}>
                    {title}
                </ThemedText>
                {instructions.map((instruction) => (
                    <View key={instruction.number} style={styles.instructionItem}>
                        <ThemedText
                            style={[
                                styles.instructionNumber,
                                { backgroundColor: palette.primary },
                            ]}
                        >
                            {instruction.number}
                        </ThemedText>
                        <ThemedText style={styles.instructionText}>
                            {instruction.text}
                        </ThemedText>
                    </View>
                ))}
            </View>

            <View style={styles.buttonContainer}>
                {!isScanning && !isProcessing && (
                    <TouchableOpacity
                        style={[styles.scanButton, { backgroundColor: palette.primary, marginTop: 24 }]}
                        onPress={onScanPress}
                        activeOpacity={0.8}
                        accessibilityLabel="Scan QR code"
                        accessibilityHint="Opens camera to scan a QR code"
                    >
                        <MaterialIcons name="qr-code-scanner" size={24} color={palette.onPrimary} />
                        <ThemedText style={[styles.scanButtonText, { color: palette.onPrimary }]}>
                            Scan QR Code
                        </ThemedText>
                    </TouchableOpacity>
                )}

                {!isScanning && !isProcessing && (
                    <TouchableOpacity
                        style={[styles.uploadButton, { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1 }]}
                        onPress={onUploadPress}
                        activeOpacity={0.8}
                        accessibilityLabel="Upload QR code image"
                        accessibilityHint="Select an image from gallery containing a QR code"
                    >
                        <MaterialIcons name="photo-library" size={24} color={palette.text} />
                        <ThemedText style={[styles.uploadButtonText, { color: palette.text }]}>
                            Upload QR Code
                        </ThemedText>
                    </TouchableOpacity>
                )}

                {isScanning && (
                    <TouchableOpacity
                        style={[styles.cancelButton, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }]}
                        onPress={onStopPress}
                        activeOpacity={0.7}
                        accessibilityLabel="Cancel QR scanning"
                    >
                        <ThemedText style={[styles.cancelButtonText, { color: palette.text }]}>
                            Stop Scanning
                        </ThemedText>
                    </TouchableOpacity>
                )}

                {isProcessing && (
                    <View style={[styles.processingButton, { backgroundColor: palette.card }]}>
                        <ThemedText style={[styles.processingButtonText, { color: palette.secondary }]}>
                            Please wait...
                        </ThemedText>
                    </View>
                )}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    scanArea: {
        height: 300,
        borderRadius: 16,
        marginBottom: 24,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
        overflow: "hidden",
    },
    camera: {
        flex: 1,
        width: "100%",
    },
    cameraOverlay: {
        flex: 1,
        backgroundColor: "transparent",
        justifyContent: "center",
        alignItems: "center",
    },
    scanFrame: {
        width: 200,
        height: 200,
        borderWidth: 2,
        borderColor: "#fff",
        borderRadius: 12,
        backgroundColor: "transparent",
    },
    cameraText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
        marginTop: 16,
        textAlign: "center",
        backgroundColor: "rgba(0,0,0,0.7)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    scanPlaceholder: {
        alignItems: "center",
        justifyContent: "center",
    },
    placeholderIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "rgba(0,0,0,0.05)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    scanPlaceholderText: {
        fontSize: 16,
        opacity: 0.7,
        textAlign: "center",
        paddingHorizontal: 20,
    },
    scanLine: {
        position: "absolute",
        top: 0,
        left: 40,
        width: 120,
        height: 2,
        borderRadius: 1,
    },
    instructions: {
        padding: 16,
        borderRadius: 16,
        marginTop: 16,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    instructionTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 16,
    },
    instructionItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    instructionNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        color: "white",
        textAlign: "center",
        textAlignVertical: "center",
        fontSize: 12,
        fontWeight: "700",
        marginRight: 12,
        marginTop: 2,
    },
    instructionText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        opacity: 0.8,
    },
    buttonContainer: {
        paddingHorizontal: 0,
        paddingVertical: 16,
        paddingBottom: 32,
        gap: 12,
    },
    scanButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    scanButtonText: {
        fontSize: 16,
        fontWeight: "600",
    },
    uploadButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    uploadButtonText: {
        fontSize: 16,
        fontWeight: "600",
    },
    cancelButton: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 12,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: "600",
    },
    processingButton: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 12,
    },
    processingButtonText: {
        fontSize: 16,
        fontWeight: "600",
    },
});
