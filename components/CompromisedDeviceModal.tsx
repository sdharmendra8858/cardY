import { Colors } from "@/constants/theme";
import { useSecurity } from "@/context/SecurityContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StatusBar } from "expo-status-bar";
import { Modal, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "./themed-text";

export default function CompromisedDeviceModal() {
    const { isDeviceCompromised } = useSecurity();
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];
    const insets = useSafeAreaInsets();

    if (!isDeviceCompromised) {
        return null;
    }

    return (
        <Modal
            animationType="fade"
            transparent={false}
            visible={isDeviceCompromised}
            statusBarTranslucent
        >
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                <ThemedText style={[styles.brandName, { color: palette.text }]}>Cardy Wall</ThemedText>
                <View style={styles.alertIconContainer}>
                    <MaterialIcons name="security" size={64} color={palette.danger} />
                </View>

                <ThemedText style={[styles.title, { color: palette.danger }]}>
                    Security Alert
                </ThemedText>

                <ThemedText style={styles.subtitle}>
                    Device Compromised
                </ThemedText>

                <View style={[styles.messageContainer, { backgroundColor: scheme === 'dark' ? '#2c2c2c' : '#f5f5f5' }]}>
                    <ThemedText style={styles.message}>
                        For your security, Cardy Wall cannot run on a rooted or jailbroken device.
                    </ThemedText>

                    <ThemedText style={[styles.message, { marginTop: 12, fontWeight: 'bold' }]}>
                        Action Taken:
                    </ThemedText>

                    <ThemedText style={styles.message}>
                        All locally stored card data has been permanently wiped to prevent theft.
                    </ThemedText>
                </View>

                <ThemedText style={[styles.footer, { color: palette.icon }]}>
                    Please use Cardy Wall on a secure, unmodified device.
                </ThemedText>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    brandName: {
        fontSize: 32,
        fontWeight: "900",
        marginBottom: 60, // Increased spacing
        letterSpacing: 1,
        lineHeight: 40, // Added to prevent clipping
        paddingVertical: 10, // Added to prevent clipping
        fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
    },
    alertIconContainer: {
        marginBottom: 24,
        padding: 20,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 8,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 20,
        fontWeight: "600",
        marginBottom: 32,
        textAlign: "center",
        opacity: 0.8,
    },
    messageContainer: {
        padding: 20,
        borderRadius: 12,
        marginBottom: 32,
        width: '100%',
    },
    message: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: "center",
    },
    footer: {
        fontSize: 14,
        textAlign: "center",
        opacity: 0.6,
        marginTop: "auto",
    },
});
