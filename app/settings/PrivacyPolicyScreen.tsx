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
      <Hero title="Privacy Policy" subtitle="Last Updated: March 28, 2026" showBackButton={true} />
      <View style={[styles.container, { backgroundColor: palette.surface }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View>

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
              Cardy Wall is an <ThemedText style={styles.bold}>offline-first digital card wallet</ThemedText> designed for
              securely storing your <ThemedText style={styles.bold}>personal cards, ID documents, and profile settings</ThemedText>
              <ThemedText style={styles.bold}> locally on your device</ThemedText>. Your personal data functions entirely 
              on-device, ensuring sensitive information remains private. The App 
              utilizes third-party services for advertising, which may require 
              limited internet connectivity for ad delivery.
            </ThemedText>

            <ThemedText type="defaultSemiBold" style={styles.heading}>
              2. Information We Collect
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              Cardy Wall does <ThemedText style={styles.bold}>not</ThemedText> automatically collect any personal
              information. All data you enter (such as card details via manual 
              entry or <ThemedText style={styles.bold}>NFC scanning</ThemedText>, card holder names, user profile 
              settings, and <ThemedText style={styles.bold}>scanned ID document images</ThemedText>) is stored securely 
              on your own device.{"\n\n"}
              We do <ThemedText style={styles.bold}>not</ThemedText> access, upload, or sync this data to our servers or
              any third-party platform. The secure sharing feature uses 
              point-to-point encryption for user-initiated transfers only.
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
              To provide certain local features, Cardy Wall may request limited
              device permissions:{"\n"}
              • <ThemedText style={styles.bold}>Camera access:</ThemedText> Used only for scanning card
              details or ID documents; images are processed locally and never uploaded.{"\n"}
              • <ThemedText style={styles.bold}>NFC access:</ThemedText> Used for quick scanning of payment cards; 
              data is ephemeral and only saved to your local vault.{"\n"}
              • <ThemedText style={styles.bold}>Biometric or PIN access:</ThemedText> Used to secure the 
              Hardware-Locked Vault; biometric data is handled by your device’s 
              secure system and never accessed by Cardy Wall.{"\n"}
              • <ThemedText style={styles.bold}>Media Library access:</ThemedText> Used for "File Upload" 
              (to scan QR codes or IDs from existing images) and "Download ID" 
              (to save processed ID documents back to your phone).
            </ThemedText>

            <ThemedText type="defaultSemiBold" style={styles.heading}>
              5. Security Practices
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              Cardy Wall follows a <ThemedText style={styles.bold}>Zero-Cloud (Ultra Private)</ThemedText> architecture:{"\n"}
              • All data is <ThemedText style={styles.bold}>Device-Isolated (Local)</ThemedText> and encrypted 
              on your storage.{"\n"}
              • Sensitive items are <ThemedText style={styles.bold}>Hardware-Locked</ThemedText> through your 
              system’s biometric security.{"\n"}
              • <ThemedText style={styles.bold}>End-to-End Encrypted Sharing</ThemedText> ensures only the intended 
              recipient can view shared card details via user-initiated QR codes.{"\n"}
              • NFC scanning and File uploads are processed <ThemedText style={styles.bold}>ephemerally</ThemedText> 
              on-device for maximum privacy.
            </ThemedText>

            <ThemedText type="defaultSemiBold" style={styles.heading}>
              6. Advertising & Third-Party Services
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              Cardy Wall uses <ThemedText style={styles.bold}>Google AdMob</ThemedText> to provide non-intrusive
              advertisements.{"\n\n"}
              • Ads will never appear on screens displaying sensitive card data.{"\n"}
              • If you grant permission, personalized ads may be shown using
              technical identifiers.{"\n"}
              • No stored personal or card data is ever shared with ad networks.{"\n"}
              • Third-party ad networks may process device-specific information
              (such as IP address) as required by technical standards.{"\n\n"}
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