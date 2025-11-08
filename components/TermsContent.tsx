import { ThemedText } from "@/components/themed-text";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

const TERMS_KEY = "terms_accepted";
const TERMS_DATE_KEY = "terms_accepted_at";

export default function TermsContent() {
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const accepted = await AsyncStorage.getItem(TERMS_KEY);
      const date = await AsyncStorage.getItem(TERMS_DATE_KEY);
      if (accepted && date) setAcceptedAt(date);
    })();
  }, []);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View>
        <ThemedText style={styles.paragraph}>
          <ThemedText style={styles.bold}>Last Updated: </ThemedText>
          {new Date("2025-10-31").toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}

          {acceptedAt && (
            <ThemedText>
              {"\n"}
              <ThemedText style={styles.bold}>Accepted On: </ThemedText>
              {new Date(acceptedAt).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </ThemedText>
          )}
          {"\n\n"}
          Welcome to <ThemedText style={styles.bold}>Cardy Wall</ThemedText> (“the App”).  
          By downloading or using Cardy Wall, you agree to the following Terms & Conditions.  
          Please read them carefully before continuing.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.heading}>
          1. Purpose of the App
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          Cardy Wall is a personal, secure digital wallet designed to help you
          store and manage your physical card details directly on your device.
          The App is intended for <ThemedText style={styles.bold}>offline use only</ThemedText> — no data you enter is
          uploaded to external servers or shared with third parties.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.heading}>
          2. Data Storage & Security
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          • All card details (card number, holder name, expiry date, CVV, etc.)
          are securely stored <ThemedText style={styles.bold}>locally on your device</ThemedText> using system-provided
          encrypted storage mechanisms.{"\n"}
          • Cardy Wall does <ThemedText style={styles.bold}>not</ThemedText> sync, back up, or transmit any stored data to
          online services.{"\n"}
          • Users are encouraged to protect their devices using screen locks,
          biometric authentication, or passcodes to prevent unauthorized
          access.{"\n"}
          • When viewing or editing sensitive information, the App may prompt
          for biometric authentication (e.g., fingerprint or Face ID) for your
          protection.
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
          4. Privacy & Permissions
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          Cardy Wall may request certain permissions to provide its features, such
          as access to the camera for scanning card details. These permissions
          are used <ThemedText style={styles.bold}>only</ThemedText> for their intended purpose and are never used to
          collect or transmit your personal data.{"\n\n"}
          The App does not require or access your internet connection for core
          features like adding or viewing cards.
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
          Future versions of Cardy Wall may include <ThemedText style={styles.bold}>non-intrusive,
          non-personalized advertisements</ThemedText> using third-party ad networks such
          as Google AdMob.{"\n"}
          • Ads will never appear on screens displaying sensitive information.{"\n"}
          • Card data will <ThemedText style={styles.bold}>never</ThemedText> be shared, sold, or transmitted for
          advertising purposes.{"\n"}
          • You may see optional offers or promotional cards relevant to your
          region, which will remain fully user-controlled.
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
          9. Contact Information
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