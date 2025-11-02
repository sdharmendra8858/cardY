import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

type InfoBoxProps = {
  message: string;
  type?: "info" | "warning" | "success" | "error";
  style?: ViewStyle; // Allow custom style overrides
};

const InfoBox: React.FC<InfoBoxProps> = ({ message, type = "info", style }) => {
  const getStyles = () => {
    switch (type) {
      case "warning":
        return {
          container: [styles.container, { backgroundColor: "#fff3cd", borderColor: "#ffeeba" }],
          text: [styles.text, { color: "#856404" }],
        };
      case "error":
        return {
          container: [styles.container, { backgroundColor: "#f8d7da", borderColor: "#f5c6cb" }],
          text: [styles.text, { color: "#721c24" }],
        };
      case "success":
        return {
          container: [styles.container, { backgroundColor: "#d4edda", borderColor: "#c3e6cb" }],
          text: [styles.text, { color: "#155724" }],
        };
      default:
        return {
          container: [styles.container, { backgroundColor: "#d1ecf1", borderColor: "#bee5eb" }],
          text: [styles.text, { color: "#0c5460" }],
        };
    }
  };

  const currentStyle = getStyles();

  return (
    <View style={[currentStyle.container, style]}>
      <Text style={currentStyle.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    marginBottom: 12,
    padding: 10,
    borderWidth: 1,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default InfoBox;