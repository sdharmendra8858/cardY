import Hero from "@/components/Hero";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <Hero
        title="Terms & Conditions"
        subtitle="Please read carefully"
        tone="dark"
        surfaceColor="#F2F2F2"
      />
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Last Updated:</Text> October 30, 2025
              {"\n\n"}
              Welcome to <Text style={styles.bold}>Cardy</Text> (“the App”). By
              using Cardy, you agree to the following Terms & Conditions. Please
              read them carefully before using the App.
            </Text>

            <Text style={styles.heading}>1. Purpose of the App</Text>
            <Text style={styles.paragraph}>
              Cardy allows you to securely store and manage your personal card
              details on your device. The App is designed for convenience and
              local use only — it does not upload, share, or transmit your data
              to any external server.
            </Text>

            <Text style={styles.heading}>2. Data Storage & Security</Text>
            <Text style={styles.paragraph}>
              • All card information and data you store within Cardy are saved
              locally on your device.{"\n"}• Cardy does not use any form of
              cloud storage, external database, or online backup.{"\n"}• It is
              your responsibility to ensure your device remains secure,
              including enabling device locks (PIN, fingerprint, or pattern).
              {"\n"}• The App may require device authentication to view
              sensitive information such as card numbers or CVV.
            </Text>

            <Text style={styles.heading}>3. User Responsibility</Text>
            <Text style={styles.paragraph}>
              By using Cardy, you agree to:{"\n"}• Keep your device secure and
              protected from unauthorized access.{"\n"}• Use the App only for
              lawful, personal purposes.{"\n"}• Avoid storing or sharing data
              that does not belong to you.{"\n\n"}
              You are solely responsible for the safety and confidentiality of
              your stored information.
            </Text>

            <Text style={styles.heading}>4. Limitations of Liability</Text>
            <Text style={styles.paragraph}>
              While Cardy is built with care and attention to security, the App
              and its developer(s) are not liable for:{"\n"}• Any loss, theft,
              or unauthorized access of data due to device compromise.{"\n"}•
              Any damages arising from misuse, loss of stored information, or
              reliance on the App.{"\n\n"}
              The App is provided on an “as is” and “as available” basis without
              warranties of any kind.
            </Text>

            <Text style={styles.heading}>5. Advertising and Monetization</Text>
            <Text style={styles.paragraph}>
              In future updates, Cardy may display non-personalized
              advertisements through Google AdMob or similar platforms. These
              ads will never appear on screens showing card details or other
              sensitive information.
              {"\n\n"}Such advertising services may collect limited,
              non-identifiable technical information (such as device type,
              operating system, or general usage) to deliver ads effectively.
              Cardy will never share, upload, or transmit your stored card data
              for advertising purposes.
            </Text>

            <Text style={styles.heading}>6. Modifications & Updates</Text>
            <Text style={styles.paragraph}>
              We may update or modify these Terms & Conditions at any time to
              reflect improvements, new features, or legal requirements. The
              latest version will always be available within the App.
            </Text>

            <Text style={styles.heading}>7. Contact</Text>
            <Text style={styles.paragraph}>
              If you have any questions, suggestions, or feedback, please
              contact us at:{"\n"}
              📧 <Text style={styles.bold}>support@cardy.app</Text>
              {"\n\n"}
              By using Cardy, you acknowledge that you have read, understood,
              and agreed to these Terms & Conditions.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#f2f2f2",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  heading: { fontSize: 16, fontWeight: "600", marginTop: 18, marginBottom: 8 },
  paragraph: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  bold: { fontWeight: "600" },
});
