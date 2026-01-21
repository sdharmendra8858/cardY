import AlertBox from "@/components/AlertBox";
import Hero from "@/components/Hero";
import QRScanSection from "@/components/QRScanSection";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { parseSessionQRString } from "@/utils/qr";
import { decodeQRFromImage } from "@/utils/qrDecoder";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Animated, Easing, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
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
    const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; buttons?: any[] }>({ title: "", message: "" });

    useLayoutEffect(() => {
        navigation.setOptions({
            title: "Share Card",
            headerLeft: () => (
                <TouchableOpacity
                    onPress={() => router.replace("/profile")}
                    style={{ marginLeft: 8, padding: 4 }}
                >
                    <MaterialIcons name="close" size={24} color={palette.text} />
                </TouchableOpacity>
            ),
        });
    }, [navigation, palette.text, router]);

    const handleScanQR = useCallback(async () => {
        try {
            const { status } = await Camera.requestCameraPermissionsAsync();

            if (status !== "granted") {
                setAlertConfig({
                    title: "Camera permission denied",
                    message: "Please enable camera permissions in settings to scan QR codes",
                    buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
                });
                setAlertVisible(true);
                return;
            }

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
            console.error('Error requesting camera permissions:', error);
            setAlertConfig({
                title: "Error",
                message: "Failed to access camera",
                buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
            });
            setAlertVisible(true);
        }
    }, [scanLineAnimation]);

    const handleUploadImage = useCallback(async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
                    const now = Math.floor(Date.now() / 1000);
                    if (now > sessionPayload.expiresAt) {
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
                        pathname: "/share-card/select-card",
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
            const now = Math.floor(Date.now() / 1000);
            if (now > sessionPayload.expiresAt) {
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
                pathname: "/share-card/select-card",
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
                    onBack={() => router.replace("/profile")}
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

            <AlertBox
                visible={alertVisible}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
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
