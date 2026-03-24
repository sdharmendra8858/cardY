import TermsContent from "@/components/TermsContent";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LEGAL_CONFIG } from "@/constants/legalConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";


export default function TermsPopup({ onAccept }: { onAccept?: () => void }) {
  const [visible, setVisible] = useState(false);
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  useEffect(() => {
    const checkTerms = async () => {
      try {
        const accepted = await AsyncStorage.getItem(LEGAL_CONFIG.KEYS.TERMS_ACCEPTED);
        const version = await AsyncStorage.getItem(LEGAL_CONFIG.KEYS.TERMS_VERSION);
        
        // Show popup if never accepted or version mismatch
        if (!accepted || version !== LEGAL_CONFIG.TERMS_VERSION) {
          setVisible(true);
        }
      } catch (error) {
        console.error("Error checking terms version:", error);
        setVisible(true); // Default to showing if error
      }
    };
    checkTerms();
  }, []);

  const handleAccept = async () => {
    try {
      await AsyncStorage.setItem(LEGAL_CONFIG.KEYS.TERMS_ACCEPTED, "true");
      await AsyncStorage.setItem(LEGAL_CONFIG.KEYS.TERMS_VERSION, LEGAL_CONFIG.TERMS_VERSION);
      
      setVisible(false);
      if (onAccept) onAccept();
    } catch (error) {
      console.error("Error accepting terms:", error);
    }
  };

  const screenHeight = Dimensions.get("window").height;

  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            {
              // Adaptive modal height based on screen size
              height:
                Platform.OS === "ios"
                  ? screenHeight * 0.92
                  : screenHeight * 0.94,
              backgroundColor: palette.card,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: palette.surface,
                borderBottomColor: palette.border,
              },
            ]}
          >
            <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
              Terms & Conditions
            </ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Please read carefully
            </ThemedText>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <TermsContent />
          </ScrollView>

          {/* Fixed Button */}
          <View
            style={[
              styles.footer,
              { backgroundColor: palette.card, borderTopColor: palette.border },
            ]}
          >
            <TouchableOpacity
              style={[styles.button, { backgroundColor: palette.primary }]}
              onPress={handleAccept}
            >
              <ThemedText
                style={[styles.buttonText, { color: palette.onPrimary }]}
              >
                I Agree
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    maxWidth: 600, // good for tablets
  },
  header: {
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: "#F8F8F8",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5E5",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  scrollContent: {
    paddingBottom: 80, // leave space for button
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5E5",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14, // Minimum padding from button to bottom (will be additive if not handled carefully, but container padding is safer)
  },
  button: {
    backgroundColor: "#000",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  buttonText: { fontSize: 16, fontWeight: "600" },
});
