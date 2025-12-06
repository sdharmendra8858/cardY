import Hero from "@/components/Hero";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrivacyPolicyScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.surface }]}
    >
      <Hero title="Privacy Policy" subtitle="Your privacy matters" showBackButton={true} />
      <View style={[styles.container, { backgroundColor: palette.surface }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View>
            <ThemedText style={styles.date}>
              Last Updated: October 31, 2025
            </ThemedText>

            <ThemedText style={styles.paragraph}>
              Thank you for using{" "}
              <ThemedText style={styles.bold}>Cardy Wall</ThemedText> (“the
              App”). Your privacy is extremely important to us. This Privacy
              Policy explains how Cardy Wall protects your information, ensures
              complete user control, and upholds transparency in how data is
              managed.
            </ThemedText>

            <ThemedText type="defaultSemiBold" style={styles.heading}>
              1. Overview
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              Cardy Wall is an <ThemedText style={styles.bold}>offline digital card wallet</ThemedText> designed for
              securely storing your personal and financial card details
              <ThemedText style={styles.bold}>locally on your device</ThemedText>. We do not collect, transmit, or share
              any personal data to servers, third parties, or cloud platforms.
              The App functions entirely on-device, ensuring your sensitive
              information remains private and under your control.
            </ThemedText>

            <ThemedText type="defaultSemiBold" style={styles.heading}>
              2. Information We Collect
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              Cardy Wall does <ThemedText style={styles.bold}>not</ThemedText> automatically collect any personal
              information. All data you enter (such as card number, card holder
              name, expiry date, CVV, and notes) is stored securely on your own
              device.{"\n\n"}
              We do <ThemedText style={styles.bold}>not</ThemedText> access, upload, or sync this data to our servers or
              any third-party platform. The App does not use analytics,
              trackers, or behavioral data tools.
            </ThemedText>

            <ThemedText type="defaultSemiBold" style={styles.heading}>
              3. Data Storage & Retention
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              • All data you store in Cardy Wall is encrypted and saved
              locally on your device storage.{"\n"}
              • Your card details, images, or scanned copies never leave your
              phone.{"\n"}
              • When you uninstall the App or clear its data, all stored
              information is permanently deleted.{"\n"}
              • We do not retain or back up your data in any form.
            </ThemedText>

            <ThemedText type="defaultSemiBold" style={styles.heading}>
              4. Device Permissions
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              To provide certain features, Cardy Wall may request limited
              device permissions:{"\n"}
              • <ThemedText style={styles.bold}>Camera access:</ThemedText> used only for scanning or capturing card
              details; images are processed locally and never uploaded.{"\n"}
              • <ThemedText style={styles.bold}>Biometric or PIN access:</ThemedText> used to lock and unlock the App for
              your security; biometric data is handled by your device’s secure
              system (Face ID / fingerprint) and never accessed by Cardy Wall.{"\n"}
              • <ThemedText style={styles.bold}>File access (if applicable):</ThemedText> used only to temporarily store
              cropped or scanned images; files are deleted automatically after
              card creation.
            </ThemedText>

            <ThemedText type="defaultSemiBold" style={styles.heading}>
              5. Security Practices
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              Cardy Wall follows strict security guidelines to protect your
              privacy:{"\n"}
              • Local encryption is used wherever supported by your device’s
              operating system.{"\n"}
              • Sensitive data (like CVV) is masked and shown only after
              biometric or passcode verification.{"\n"}
              • No data is stored outside your device or transmitted via
              internet.{"\n"}
              • We strongly recommend enabling your device’s security features
              (PIN, fingerprint, Face ID) to prevent unauthorized access.
            </ThemedText>

            <ThemedText type="defaultSemiBold" style={styles.heading}>
              6. Advertising & Third-Party Services
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              Future versions of Cardy Wall may include <ThemedText style={styles.bold}>non-personalized,
              non-invasive advertisements</ThemedText> to support app maintenance and
              development.{"\n\n"}
              • Ads will never appear on screens displaying card numbers or
              sensitive details.{"\n"}
              • Limited, technical data (such as device model or ad performance)
              may be processed by the ad network to show relevant, safe ads.{"\n"}
              • Cardy Wall will never use or share your locally stored data for
              ad targeting.{"\n\n"}
              For details on Google’s ad policies, visit:{" "}
              https://policies.google.com/privacy
            </ThemedText>

            <ThemedText type="defaultSemiBold" style={styles.heading}>
              7. Children’s Privacy
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              Cardy Wall is intended for general audiences and is not directed
              toward children under 13. We do not knowingly collect any
              information from children. Since the App functions offline, no
              online registration or parental consent is required.
            </ThemedText>

            <ThemedText type="defaultSemiBold" style={styles.heading}>
              8. User Rights & Control
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              You have full ownership and control over your data. You may:{"\n"}
              • Delete any stored card information at any time from within the
              App.{"\n"}
              • Uninstall the App to permanently erase all locally stored
              information.{"\n"}
              • Revoke permissions (camera, biometrics) through your device’s
              settings at any time.
            </ThemedText>

            <ThemedText type="defaultSemiBold" style={styles.heading}>
              9. Policy Updates
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              We may update this Privacy Policy occasionally to reflect feature
              improvements, legal compliance, or security enhancements. The
              updated policy will be available within the App and will include a
              new “Last Updated” date at the top of this page.{"\n\n"}
              Continued use of the App after changes are posted signifies your
              acceptance of the revised Privacy Policy.
            </ThemedText>

            <ThemedText type="defaultSemiBold" style={styles.heading}>
              10. Contact Us
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              For any privacy-related inquiries, requests, or clarifications,
              please contact us at:{"\n"}
              📧 <ThemedText style={styles.bold}>support@redonelabs.in</ThemedText>{"\n"}
              🏢 RedOne Labs, Bengaluru, India.{"\n\n"}
              We value transparency and will respond to genuine user inquiries
              regarding privacy within a reasonable time.
            </ThemedText>

            <ThemedText style={styles.paragraph}>
              By using Cardy Wall, you acknowledge that you have read,
              understood, and agreed to this Privacy Policy.
            </ThemedText>
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
  },
  date: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 16,
    textAlign: "center",
  },
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
  bold: { fontWeight: "600" },
});