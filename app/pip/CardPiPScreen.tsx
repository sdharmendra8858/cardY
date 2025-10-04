import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function CardPiPScreen({  }) {
  // You can read the cardId from props if passed
  return (
    <View style={styles.container}>
      <Text style={styles.text}>PiP Card Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },
  text: { fontSize: 20, fontWeight: "bold" },
});