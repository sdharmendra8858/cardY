import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
    <ThemedView style={{ flex: 1, padding: 20 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ThemedText
          style={{
            fontSize: 20,
            fontWeight: "600" as const,
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          Terms & Conditions
        </ThemedText>

        <ThemedText style={{ fontSize: 14, lineHeight: 22, marginBottom: 16 }}>
          <ThemedText style={{ fontWeight: "600" as const }}>Last Updated:</ThemedText> October 30, 2025
          {"\n\n"}
          Welcome to <ThemedText style={{ fontWeight: "600" as const }}>Cardy</ThemedText> (“the App”). By
          using Cardy, you agree to the following Terms & Conditions. Please read them carefully before
          using the App.
        </ThemedText>

        <ThemedText style={styles.heading}>1. Purpose of the App</ThemedText>
        <ThemedText style={styles.paragraph}>
          Cardy allows you to securely store and manage your personal card details on your device. The App
          is designed for convenience and local use only — it does not upload, share, or transmit your data
          to any external server.
        </ThemedText>

        <ThemedText style={styles.heading}>2. Data Storage & Security</ThemedText>
        <ThemedText style={styles.paragraph}>
          • All card information and data you store within Cardy are saved locally on your device.
          {"\n"}• Cardy does not use any form of cloud storage, external database, or online backup.
          {"\n"}• It is your responsibility to ensure your device remains secure, including enabling device
          locks (PIN, fingerprint, or pattern).
          {"\n"}• The App may require device authentication to view sensitive information such as card
          numbers or CVV.
        </ThemedText>

        <ThemedText style={styles.heading}>3. User Responsibility</ThemedText>
        <ThemedText style={styles.paragraph}>
          By using Cardy, you agree to:
          {"\n"}• Keep your device secure and protected from unauthorized access.
          {"\n"}• Use the App only for lawful, personal purposes.
          {"\n"}• Avoid storing or sharing data that does not belong to you.
          {"\n\n"}
          You are solely responsible for the safety and confidentiality of your stored information.
        </ThemedText>

        <ThemedText style={styles.heading}>4. Limitations of Liability</ThemedText>
        <ThemedText style={styles.paragraph}>
          While Cardy is built with care and attention to security, the App and its developer(s) are not
          liable for:
          {"\n"}• Any loss, theft, or unauthorized access of data due to device compromise.
          {"\n"}• Any damages arising from misuse, loss of stored information, or reliance on the App.
          {"\n\n"}
          The App is provided on an “as is” and “as available” basis without warranties of any kind.
        </ThemedText>

        <ThemedText style={styles.heading}>5. Advertising and Monetization</ThemedText>
        <ThemedText style={styles.paragraph}>
          In future updates, Cardy may display non-personalized advertisements through Google AdMob or
          similar platforms. These ads will never appear on screens showing card details or other sensitive
          information.
          {"\n\n"}Such advertising services may collect limited, non-identifiable technical information
          (such as device type, operating system, or general usage) to deliver ads effectively. Cardy will
          never share, upload, or transmit your stored card data for advertising purposes.
        </ThemedText>

        <ThemedText style={styles.heading}>6. Modifications & Updates</ThemedText>
        <ThemedText style={styles.paragraph}>
          We may update or modify these Terms & Conditions at any time to reflect improvements, new
          features, or legal requirements. The latest version will always be available within the App.
        </ThemedText>

        <ThemedText style={styles.heading}>7. Contact</ThemedText>
        <ThemedText style={styles.paragraph}>
          If you have any questions, suggestions, or feedback, please contact us at:
          {"\n"}📧 <ThemedText style={{ fontWeight: "600" as const }}>support@cardy.app</ThemedText>
          {"\n\n"}By using Cardy, you acknowledge that you have read, understood, and agreed to these Terms
          & Conditions.
        </ThemedText>
      </ScrollView>
    </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
  heading: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 18,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
});