import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { readNfcCard } from '@/utils/nfcUtils';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Animated, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import NfcManager from 'react-native-nfc-manager';

export default function NfcScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const [isScanning, setIsScanning] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Bring your physical card near the back of your phone to scan details automatically.");
    const waveAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const setupNfc = async () => {
            try {
                console.log('NFC: Starting NfcManager...');
                await NfcManager.start();
                const supported = await NfcManager.isSupported();
                const enabled = await NfcManager.isEnabled();
                console.log(`NFC Status: Supported=${supported}, Enabled=${enabled}`);

                if (!supported) {
                    console.error('NFC: Hardware not supported on this device');
                } else if (!enabled) {
                    console.warn('NFC: Hardware supported but disabled in settings');
                    Alert.alert('NFC Disabled', 'Please enable NFC in your device settings.');
                } else {
                    startScanning();
                }
            } catch (err) {
                console.error('NFC: Setup failed', err);
            }
        };

        setupNfc();

        // Animation for "wave"
        Animated.loop(
            Animated.sequence([
                Animated.timing(waveAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(waveAnim, {
                    toValue: 0,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        return () => {
            console.log('NFC: Cleaning up...');
            NfcManager.cancelTechnologyRequest().catch(() => { });
        };
    }, []);

    const startScanning = async () => {
        if (Platform.OS === 'ios') {
            console.log('NFC: iOS detected, showing restricted message');
            Alert.alert(
                "NFC Not Supported",
                "Direct credit card scanning via NFC is not supported on iOS due to platform restrictions.",
                [{ text: "OK", onPress: () => router.back() }]
            );
            return;
        }

        console.log('NFC: Entering scan loop...');
        setIsScanning(true);
        setStatusMessage("Hold card still...");

        try {
            const cardData = await readNfcCard();
            console.log('NFC: Scan finished. Result:', cardData ? 'SUCCESS' : 'FAILURE/CANCEL');
            setIsScanning(false);

            if (cardData) {
                console.log('NFC: Card data found! Navigating back...');
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.back();
                setTimeout(() => {
                    router.setParams({
                        defaultCardNumber: cardData.cardNumber,
                        defaultExpiry: cardData.expiry,
                        defaultCardHolder: cardData.cardHolder,
                        defaultCardKind: cardData.appLabel.toUpperCase().includes('DEBIT') ? 'debit' :
                            cardData.appLabel.toUpperCase().includes('CREDIT') ? 'credit' : undefined,
                        fromNfc: 'true'
                    });
                }, 100);
            } else {
                console.log('NFC: No card data found from scan session.');
                setStatusMessage("Card not supported. Please enter details manually.");
            }
        } catch (err: any) {
            console.log('NFC: Scan error catch block:', err.message);
            setIsScanning(false);
            if (err.message === 'CONNECTION_LOST') {
                setStatusMessage("Card moved! Please keep the card still against the phone.");
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } else {
                setStatusMessage("Scan failed. Please try again.");
            }
        }
    };

    const handleRetry = () => {
        console.log('NFC: Manual retry triggered');
        startScanning();
    };

    const translateY = waveAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -30],
    });

    const scale = waveAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.1],
    });

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={theme.text} />
                </TouchableOpacity>
                <ThemedText style={styles.title}>NFC Scan</ThemedText>
            </View>

            <View style={styles.content}>
                <View style={styles.animationContainer}>
                    {/* Device Icon */}
                    <View style={[styles.deviceFrame, { borderColor: theme.border }]}>
                        <View style={[styles.deviceScreen, { backgroundColor: theme.card }]} />
                    </View>

                    {/* Waving Card Icon */}
                    <Animated.View style={[
                        styles.cardIcon,
                        {
                            transform: [{ translateY }, { scale }],
                            backgroundColor: theme.primary
                        }
                    ]}>
                        <MaterialCommunityIcons name="credit-card-chip" size={50} color="white" />
                    </Animated.View>

                    {/* Wave lines */}
                    <View style={styles.waves}>
                        <Ionicons name="radio-outline" size={80} color={theme.primary} style={{ opacity: 0.3 }} />
                    </View>
                </View>

                <ThemedText style={styles.instruction}>
                    {isScanning ? "Scanning..." : "Ready to Scan"}
                </ThemedText>
                <ThemedText style={[styles.subtitle, { color: statusMessage.includes('moved') ? '#FF5252' : theme.text }]}>
                    {statusMessage}
                </ThemedText>

                {!isScanning && (
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: theme.primary }]}
                        onPress={handleRetry}
                    >
                        <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>Scan Again</ThemedText>
                    </TouchableOpacity>
                )}

                <View style={styles.tipsContainer}>
                    <ThemedText style={[styles.tipText, { color: theme.text }]}>• Hold card still for 2-3 seconds</ThemedText>
                    <ThemedText style={[styles.tipText, { color: theme.text }]}>• Aim for the top-back near camera</ThemedText>
                    <ThemedText style={[styles.tipText, { color: theme.text }]}>• Remove thick phone cases</ThemedText>
                </View>

                <TouchableOpacity
                    style={[styles.cancelButton, { borderColor: theme.border }]}
                    onPress={() => router.back()}
                >
                    <ThemedText style={{ color: theme.text }}>Cancel</ThemedText>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // ... (styles update)
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        marginBottom: 40,
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    animationContainer: {
        width: 250,
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    deviceFrame: {
        width: 120,
        height: 220,
        borderWidth: 4,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
    },
    deviceScreen: {
        width: 100,
        height: 180,
        borderRadius: 10,
    },
    cardIcon: {
        width: 100,
        height: 60,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: 60,
        right: -30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    waves: {
        position: 'absolute',
        top: 80,
    },
    instruction: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.7,
        lineHeight: 24,
    },
    retryButton: {
        marginTop: 24,
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 25,
    },
    tipsContainer: {
        marginTop: 40,
        width: '100%',
        padding: 20,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    tipText: {
        fontSize: 13,
        opacity: 0.6,
        marginBottom: 8,
    },
    cancelButton: {
        marginTop: 'auto',
        marginBottom: 50,
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 25,
        borderWidth: 1,
    }
});
