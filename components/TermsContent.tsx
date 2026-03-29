import { ThemedText } from "@/components/themed-text";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";


export default function TermsContent() {

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View>
        <ThemedText style={styles.paragraph}>
          Welcome to <ThemedText style={styles.bold}>Cardy Wall</ThemedText> (“the App”).
          By downloading or using Cardy Wall, you agree to the following Terms & Conditions.
          Please read them carefully before continuing.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.heading}>
          1. Purpose of the App
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          Cardy Wall is a personal, secure digital wallet designed to help you
          store and manage your <ThemedText style={styles.bold}>physical cards and ID documents</ThemedText> directly on
          your device. The App provides features like <ThemedText style={styles.bold}>NFC scanning</ThemedText> for quick
          entry and encrypted storage. The App is intended for offline-first
          personal use. While your personal data remains strictly local to your
          device, the App may require an internet connection for third-party
          services such as advertising.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.heading}>
          2. Data Storage & Security
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          • All data (cards, ID documents, and profile settings) is stored
          strictly <ThemedText style={styles.bold}>locally on your device</ThemedText> using a
          <ThemedText style={styles.bold}> Zero-Cloud (Ultra Private)</ThemedText> architecture.{"\n"}
          • Sensitive documents are stored in a <ThemedText style={styles.bold}>Hardware-Locked Vault</ThemedText>,
          secured by your device's biometric authentication (Face ID / Fingerprint)
          or PIN.{"\n"}
          • Cardy Wall does <ThemedText style={styles.bold}>not</ThemedText> transmit, sync, or back up any of your
          stored cards or images to online servers.{"\n"}
          • Your data is <ThemedText style={styles.bold}>Device-Isolated</ThemedText>, meaning it is inaccessible
          to other apps or external services.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.heading}>
          3. User Responsibility
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          You are responsible for:{"\n"}
          • Ensuring your device remains secure and protected from
          unauthorized access.{"\n"}
          • Using the App solely for <ThemedText style={styles.bold}>personal, lawful purposes</ThemedText>.{"\n"}
          • Not sharing or storing cards that do not belong to you.{"\n"}
          • Keeping your device software updated and avoiding use on rooted or
          jailbroken devices that may compromise data security.{"\n\n"}
          Cardy Wall and its developers are not responsible for data loss or
          leakage resulting from device-level vulnerabilities or third-party
          interference.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.heading}>
          4. Privacy, Permissions & Sharing
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          Cardy Wall requests limited permissions to enable local features:{"\n"}
          • <ThemedText style={styles.bold}>NFC:</ThemedText> Used for quick scanning of payment card details on <ThemedText style={styles.bold}>supported devices</ThemedText>. 
          The data read is ephemeral and only stored when you explicitly save the card. 
          <ThemedText style={styles.bold}>Safety Note:</ThemedText> To prevent potential unauthorized scanning by 
          malicious actors, ensure NFC is disabled in your device settings when not 
          actively using this feature.{"\n"}
          • <ThemedText style={styles.bold}>Camera & Gallery:</ThemedText> Used for scanning ID documents
          or uploading QR codes/images for secure sharing. These files are processed
          <ThemedText style={styles.bold}> locally</ThemedText> and never leaves your phone.{"\n"}
          • <ThemedText style={styles.bold}>Storage/Download:</ThemedText> The "Download ID" feature allows
          you to save a copy of your processed ID document to your device's local
          gallery or file system for your convenience.{"\n\n"}
          The <ThemedText style={styles.bold}>Secure Sharing</ThemedText> feature allows you to share card details
          via encrypted QR codes. This process is <ThemedText style={styles.bold}>entirely user-initiated</ThemedText> and uses
          end-to-end encryption (ECDH/AES) so that only the intended recipient
          can decrypt the data.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.heading}>
          5. Limitations of Liability
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          While Cardy Wall uses secure storage and best practices to protect your
          information, it cannot guarantee absolute protection against all
          risks. The App and its developer(s) are not liable for:{"\n"}
          • Data loss due to device reset, uninstallation, or corruption.{"\n"}
          • Unauthorized access resulting from weak device security.{"\n"}
          • Damages or losses resulting from misuse or third-party actions.{"\n\n"}
          The App is provided “as is,” without any warranties or guarantees,
          express or implied.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.heading}>
          6. Advertising and Monetization
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          Cardy Wall includes <ThemedText style={styles.bold}>non-intrusive advertisements</ThemedText> using third-party
          ad networks such as Google AdMob.{"\n"}
          • Ads will never appear on screens displaying sensitive card data.{"\n"}
          • Personalized ads may be shown based on your device settings and permission to track.{"\n"}
          • Your sensitive card data will <ThemedText style={styles.bold}>never</ThemedText> be shared, sold, or
          transmitted for advertising purposes.{"\n"}
          • Advertisements require a limited internet connection to be served.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.heading}>
          7. Updates, Changes & Termination
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          We may periodically update or modify these Terms & Conditions to
          comply with evolving privacy standards, improve functionality, or
          introduce new features. The updated terms will take effect
          immediately upon publication within the App.{"\n\n"}
          Continued use of Cardy Wall after an update constitutes acceptance of
          the revised Terms.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.heading}>
          8. Governing Law
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          These Terms shall be governed by and construed in accordance with the
          laws of India. Any disputes arising from or relating to Cardy Wall will
          be subject to the jurisdiction of Indian courts.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.heading}>
          9. Data Migration
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          Cardy Wall includes an <ThemedText style={styles.bold}>automated migration system</ThemedText> designed to
          seamlessly upgrade your storage security as the App evolves (e.g., v1.0 to v2.0).
          This process happens <ThemedText style={styles.bold}>entirely on your device</ThemedText> and
          never transmits your cards or documents to any server.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.heading}>
          10. Contact Information
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          For questions, concerns, or feedback, reach out to:{"\n"}
          📧 <ThemedText style={styles.bold}>support@redonelabs.in</ThemedText>{"\n"}
          🏢 RedOne Labs, Bengaluru, India.{"\n\n"}
          By continuing to use Cardy Wall, you confirm that you have read,
          understood, and agreed to these Terms & Conditions.
        </ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 16, fontWeight: "600", marginTop: 18, marginBottom: 8 },
  paragraph: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  bold: { fontWeight: "600" },
});