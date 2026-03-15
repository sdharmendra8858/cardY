// components/NoCards.tsx
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import { FC } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

const NoCards: FC<{ 
  message?: string; 
  showButton?: boolean;
  buttonText?: string;
  onPress?: () => void;
}> = ({
  message = "No cards listed yet.",
  showButton = true,
  buttonText = "Add Your First Card",
  onPress,
}) => {
  const router = useRouter();
  
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push("/add-card");
    }
  };

  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  return (
    <View style={styles.container}>
      {/* SVG Illustration */}
      <Svg
        width={200}
        height={200}
        viewBox="0 0 64 64"
        style={{ marginBottom: 24 }}
      >
        {/* Background rectangle with rounded corners */}
        <Rect
          x={2}
          y={12}
          width={60}
          height={40}
          fill={palette.primary}
          stroke={palette.onPrimary}
          strokeWidth={2}
          rx={4} // rounded corners
        />

        {/* Card lines */}
        <Path d="M12 22h40v4H12zm0 30h40v4H12z" fill={palette.onPrimary} />
      </Svg>

      <ThemedText style={styles.message}>{message}</ThemedText>

      {showButton && (
        <Pressable
          style={[styles.button, { backgroundColor: palette.primary }]}
          onPress={handlePress}
        >
          <ThemedText style={[styles.buttonText, { color: palette.onPrimary }]}>
            {buttonText}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
};

export default NoCards;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "transparent",
  },
  message: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
