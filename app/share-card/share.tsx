import Hero from "@/components/Hero";
import QRScanSection from "@/components/QRScanSection";
import UnifiedModal, { UnifiedModalButton } from "@/components/UnifiedModal";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { parseSessionQRString } from "@/utils/qr";
import { decodeQRFromImage } from "@/utils/qrDecoder";
import { isSessionValid } from "@/utils/session";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";

export default function ShareScreen() {
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];
    const navigation = useNavigation();
    const router = useRouter();

    const [isScanning, setIsScanning] = useState<boolean>(false);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const scanLineAnimation = useRef(new Animated.Value(0)).current;
    const [alertVisible, setAlertVisible] = useState(false);
    const permissionDeniedRef = useRef(false);
    const [alertConfig, setAlertConfig] = useState<{
        title: string;
        message: string;
        buttons?: UnifiedModalButton[];
        type?: "default" | "error" | "warning" | "success";
    }>({ title: "", message: "" });

    const handleBackAction = useCallback(() => {
        if (isScanning) {
            setIsScanning(false);
            scanLineAnimation.stopAnimation();
            return true;
        }
        router.replace("/profile");
        return true;
    }, [isScanning, router, scanLineAnimation]);

    useLayoutEffect(() => {
        navigation.setOptions({
            title: "Share Card",
            headerLeft: () => (
                <TouchableOpacity
                    onPress={handleBackAction}
                    style={{ marginLeft: 8, padding: 4 }}
                >
                    <MaterialIcons name="close" size={24} color={palette.text} />
                </TouchableOpacity>
            ),
        });
    }, [navigation, palette.text, handleBackAction]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            // If the user is trying to leave and we are scanning, stop scanning instead
            if (isScanning) {
                e.preventDefault();
                setIsScanning(false);
                scanLineAnimation.stopAnimation();
                return;
            }

            // If we are not scanning, allow the navigation to proceed
            // The handleBackAction will be called from the header button
        });

        return unsubscribe;
    }, [navigation, isScanning, scanLineAnimation]);

    const handleScanQR = useCallback(async () => {
        try {
            console.log('Requesting camera permissions...');
            const { status } = await Camera.requestCameraPermissionsAsync();
            console.log('Camera permission status:', status);

            if (status !== "granted") {
                // If permission was already denied once, show modal with "Open Settings"
                if (permissionDeniedRef.current) {
                    console.log('Permission denied again - showing modal with Open Settings');
                    setAlertConfig({
                        title: "Camera permission denied",
                        message: "Camera permission is required to scan QR codes. Please enable it in settings.",
                        buttons: [
                            {
                                text: "Open Settings",
                                style: "default",
                                onPress: () => {
                                    setAlertVisible(false);
                                    if (Platform.OS === 'ios') {
                                        Linking.openURL('app-settings:');
                                    } else {
                                        Linking.openSettings();
                                    }
                                }
                            },
                            {
                                text: "Cancel",
                                style: "cancel",
                                onPress: () => setAlertVisible(false)
                            }
                        ]
                    });
                    setAlertVisible(true);
                } else {
                    // First time denied - just mark it
                    console.log('Permission denied first time');
                    permissionDeniedRef.current = true;
                }
                return;
            }

            // Permission granted - reset the ref and start scanning
            permissionDeniedRef.current = false;
            console.log('Starting camera scan...');
            setIsScanning(true);

            // Start scan line animation
            scanLineAnimation.setValue(0);
            Animated.loop(
                Animated.timing(scanLineAnimation, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } catch (error) {
            console.error('Error in handleScanQR:', error);
        }
    }, [scanLineAnimation]);

    const handleUploadImage = useCallback(async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled && result.assets[0]) {
                setIsProcessing(true);
                const imageUri = result.assets[0].uri;

                try {
                    const qrResult = await decodeQRFromImage(imageUri);

                    if (!qrResult.success || !qrResult.data) {
                        throw new Error(qrResult.error || "Could not read QR code from image");
                    }

                    console.log("✅ QR decoded from image:", qrResult.data);

                    // Parse and validate the QR
                    const sessionPayload = parseSessionQRString(qrResult.data);

                    if (!sessionPayload) {
                        throw new Error("Invalid QR code format");
                    }

                    // Check if session is expired
                    if (!isSessionValid(sessionPayload.expiresAt)) {
                        setAlertConfig({
                            title: "QR Code Expired",
                            message: "This QR code has expired. Please ask the receiver to generate a new one.",
                            buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
                        });
                        setAlertVisible(true);
                        setIsProcessing(false);
                        return;
                    }

                    // Navigate to select card screen with session data
                    router.push({
                        pathname: "./select-card",
                        params: {
                            sessionId: sessionPayload.sessionId,
                            receiverPublicKey: sessionPayload.receiverPublicKey,
                            expiresAt: sessionPayload.expiresAt.toString(),
                        },
                    });
                } catch (error) {
                    console.error("❌ Failed to decode QR from image:", error);
                    setAlertConfig({
                        title: "Invalid QR Code",
                        message: error instanceof Error ? error.message : "Could not read QR code from image",
                        buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
                    });
                    setAlertVisible(true);
                } finally {
                    setIsProcessing(false);
                }
            }
        } catch (error) {
            console.error("Error picking image:", error);
            setAlertConfig({
                title: "Error",
                message: "Failed to pick image",
                buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
            });
            setAlertVisible(true);
        }
    }, [router]);

    const handleBarCodeScanned = useCallback(async (data: { type: string; data: string }) => {
        console.log("📱 QR code scanned:", data.data);
        setIsScanning(false);
        scanLineAnimation.stopAnimation();
        setIsProcessing(true);

        try {
            // Parse the QR code
            const sessionPayload = parseSessionQRString(data.data);

            if (!sessionPayload) {
                throw new Error("Invalid QR code format");
            }

            console.log("✅ Session payload parsed:", {
                sessionId: sessionPayload.sessionId,
                receiverPublicKey: sessionPayload.receiverPublicKey ? "present" : "MISSING",
                expiresAt: sessionPayload.expiresAt,
            });

            // Check if session is expired
            if (!isSessionValid(sessionPayload.expiresAt)) {
                setAlertConfig({
                    title: "QR Code Expired",
                    message: "This QR code has expired. Please ask the receiver to generate a new one.",
                    buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
                });
                setAlertVisible(true);
                setIsProcessing(false);
                return;
            }

            // Navigate to select card screen with session data
            router.push({
                pathname: "./select-card",
                params: {
                    sessionId: sessionPayload.sessionId,
                    receiverPublicKey: sessionPayload.receiverPublicKey,
                    expiresAt: sessionPayload.expiresAt.toString(),
                },
            });
        } catch (error) {
            console.error("❌ Failed to parse QR code:", error);
            setAlertConfig({
                title: "Invalid QR Code",
                message: error instanceof Error ? error.message : "Could not read QR code",
                buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
            });
            setAlertVisible(true);
        } finally {
            setIsProcessing(false);
        }
    }, [router, scanLineAnimation]);

    return (
        <>
            <SafeAreaView
                style={[styles.safeArea, { backgroundColor: palette.surface }]}
            >
                <Hero
                    title="Share Card"
                    subtitle="Scan receiver's QR code to share your card"
                    showBackButton={true}
                    onBack={handleBackAction}
                />
                <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.content}>
                        <QRScanSection
                            isScanning={isScanning}
                            scanLineAnimation={scanLineAnimation}
                            onBarcodeScanned={handleBarCodeScanned}
                            onCameraError={(error: any) => {
                                setAlertConfig({
                                    title: 'Camera Error',
                                    message: 'Unable to access camera. Please check permissions.',
                                    buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
                                });
                                setAlertVisible(true);
                                setIsScanning(false);
                                scanLineAnimation.stopAnimation();
                            }}
                            onScanPress={handleScanQR}
                            onUploadPress={handleUploadImage}
                            onStopPress={() => {
                                setIsScanning(false);
                                scanLineAnimation.stopAnimation();
                            }}
                            isProcessing={isProcessing}
                            title="Ready to share?"
                            instructions={[
                                {
                                    number: 1,
                                    text: "Have the receiver show you their session QR code",
                                },
                                {
                                    number: 2,
                                    text: 'Tap "Scan QR Code" below',
                                },
                                {
                                    number: 3,
                                    text: "Hold your camera over the QR code",
                                },
                            ]}
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>

            <UnifiedModal
                visible={alertVisible}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
                type={alertConfig.type}
                onRequestClose={() => setAlertVisible(false)}
            />
        </>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    container: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 20,
    },
});
