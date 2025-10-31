import Hero from "@/components/Hero";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Hero
        title="Privacy Policy"
        subtitle="Your privacy matters"
        tone="dark"
        surfaceColor="#F2F2F2"
      />
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View>
            <Text style={styles.date}>Last Updated: October 30, 2025</Text>

            <Text style={styles.paragraph}>
              Thank you for using <Text style={styles.bold}>Cardy</Text> (“the
              App”). Your privacy is important to us. This Privacy Policy
              explains how Cardy handles your information and ensures your
              personal data remains safe.
            </Text>

            <Text style={styles.heading}>1. Data Collection</Text>
            <Text style={styles.paragraph}>
              Cardy does not collect, transmit, or share any personal
              information. The App operates entirely offline — no user data,
              card information, or personal identifiers are sent to any external
              server. We do not use analytics, tracking, or third-party SDKs
              that monitor user behavior.
            </Text>

            <Text style={styles.heading}>2. Data Storage</Text>
            <Text style={styles.paragraph}>
              • All data (such as card numbers or notes) you save in Cardy is
              stored locally on your device.{"\n"}• Cardy does not automatically
              back up or sync your data to any cloud or server.{"\n"}• You have
              full control over your data — uninstalling the App permanently
              deletes all saved information.
            </Text>

            <Text style={styles.heading}>3. Security</Text>
            <Text style={styles.paragraph}>
              • Cardy provides optional device lock authentication (PIN,
              fingerprint, or pattern) for viewing sensitive data.{"\n"}•
              Because data is stored only on your device, the security of your
              information depends on your device’s protection measures.{"\n"}•
              We recommend keeping your device locked and up to date.
            </Text>

            <Text style={styles.heading}>4. Advertising and Monetization</Text>
            <Text style={styles.paragraph}>
              In future versions, Cardy may include non-personalized
              advertisements through Google AdMob or similar services. These ads
              will never appear on screens displaying sensitive card
              information.{"\n\n"}
              AdMob may collect limited, non-identifiable technical information
              (e.g., device model, OS version, ad performance data) to deliver
              ads effectively.{"\n\n"}
              Cardy will never share or upload your stored data for advertising
              purposes.{"\n\n"}
              You can review Google’s privacy policy at:
              https://policies.google.com/privacy
            </Text>

            <Text style={styles.heading}>5. Children’s Privacy</Text>
            <Text style={styles.paragraph}>
              Cardy is designed for general audiences and does not knowingly
              collect data from children under 13. Since the App operates
              offline, no special parental consent is required.
            </Text>

            <Text style={styles.heading}>6. Policy Updates</Text>
            <Text style={styles.paragraph}>
              We may update this Privacy Policy periodically to improve
              transparency or comply with new regulations. The latest version
              will always be available inside the App.
            </Text>

            <Text style={styles.heading}>7. Contact</Text>
            <Text style={styles.paragraph}>
              If you have questions or concerns about this Privacy Policy, you
              can contact us at:{"\n"}📧
              <Text style={styles.bold}> support@cardy.app</Text>
            </Text>

            <Text style={styles.paragraph}>
              By using Cardy, you acknowledge that you have read and understood
              this Privacy Policy.
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
    marginBottom: 8,
    textAlign: "center",
  },
  date: { fontSize: 13, opacity: 0.7, marginBottom: 16, textAlign: "center" },
  heading: { fontSize: 16, fontWeight: "600", marginTop: 18, marginBottom: 8 },
  paragraph: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  bold: { fontWeight: "600" },
});
