import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";
import { useCards } from "../../context/CardContext";
import { getCards, setCards } from "../../utils/secureStorage";

export default function ShareCardScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const navigation = useNavigation();
  const router = useRouter();
  const { cards, isLoading, refreshCards } = useCards();

  const [sessionCode, setSessionCode] = useState<string>("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showCardSelection, setShowCardSelection] = useState<boolean>(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Share Card",
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginLeft: 8, padding: 4 }}
        >
          <MaterialIcons name="close" size={24} color={palette.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, palette.text, router]);

  const validateSessionCode = (code: string): boolean => {
    // 6-character alphanumeric code (excluding confusing characters)
    const validPattern = /^[A-Z0-9]{6}$/;
    return validPattern.test(code.toUpperCase());
  };

  const handleSessionCodeSubmit = useCallback(async () => {
    if (!sessionCode.trim()) {
      Alert.alert("Error", "Please enter a session code");
      return;
    }

    const code = sessionCode.toUpperCase();
    if (!validateSessionCode(code)) {
      Alert.alert(
        "Invalid Code",
        "Session code must be 6 characters long and contain only letters and numbers"
      );
      return;
    }

    // Ensure cards are loaded before showing selection
    if (cards.length === 0 && !isLoading) {
      console.log("🔄 Loading cards before showing selection...");
      await refreshCards();
    }

    setSessionCode(code);
    setShowCardSelection(true);
  }, [sessionCode, cards.length, isLoading, refreshCards]);

  const handleCardSelect = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
  }, []);

  const generateQRCode = useCallback(() => {
    if (!selectedCardId) {
      Alert.alert("Error", "Please select a card to share");
      return;
    }

    // Navigate to QR generation screen with session code
    // The QR screen will retrieve the full session payload including receiver's public key
    router.push({
      pathname: "/share-card/qr",
      params: {
        sessionCode,
        cardId: selectedCardId,
      },
    });
  }, [selectedCardId, sessionCode, router]);

  // Debug function to check stored cards
  const checkStoredCards = useCallback(async () => {
    try {
      const storedCards = await getCards();
      console.log("🔍 All stored cards:", storedCards.map(c => ({
        id: c.id,
        cardUser: c.cardUser,
        bank: c.bank,
        cardHolder: c.cardHolder,
        cardNumber: c.cardNumber.substring(0, 4) + "****"
      })));

      const selfCards = storedCards.filter(c => c.cardUser !== "other");
      const otherCards = storedCards.filter(c => c.cardUser === "other");
      const undefinedCards = storedCards.filter(c => !c.cardUser);

      // Fix cards with undefined cardUser
      if (undefinedCards.length > 0) {
        console.log("🔧 Fixing cards with undefined cardUser...");
        const fixedCards = storedCards.map(c => ({
          ...c,
          cardUser: c.cardUser || "self"
        }));
        await setCards(fixedCards);
        console.log("✅ Fixed", undefinedCards.length, "cards");

        // Refresh the context
        await refreshCards();
      }

      Alert.alert(
        "Debug Results",
        `Total: ${storedCards.length} cards\nSelf cards: ${selfCards.length}\nOther cards: ${otherCards.length}\nUndefined: ${undefinedCards.length}\n\n${undefinedCards.length > 0 ? 'Cards fixed! Try again.' : 'Check console for details.'}`
      );
    } catch (error) {
      console.error("Error checking stored cards:", error);
      Alert.alert("Error", "Failed to check stored cards");
    }
  }, [refreshCards]);

  // Filter to only show cards that belong to the user (not "other" cards)
  const availableCards = cards.filter((card) => card.cardUser !== "other");

  // Debug logging (only when card selection is shown to avoid excessive logging)
  if (showCardSelection) {
    console.log("🎯 ShareCard Debug:", {
      totalCards: cards.length,
      availableCards: availableCards.length,
      isLoading,
      showCardSelection,
      sessionCode: sessionCode || "none",
      filteredOut: cards.length - availableCards.length
    });
  }

  if (showCardSelection) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.surface }]}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setShowCardSelection(false)}
              style={styles.backButton}
            >
              <MaterialIcons name="chevron-left" size={24} color={palette.text} />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.selectionTitle}>
              Select Card to Share
            </ThemedText>
          </View>

          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: palette.card }]}>
              <MaterialIcons name="credit-card" size={48} color={palette.tint} />
            </View>

            <ThemedText type="title" style={styles.title}>
              Choose Card
            </ThemedText>

            <ThemedText style={[styles.description, { textAlign: "center" }]}>
              Select the card you&apos;d like to share with session code: {sessionCode}
            </ThemedText>


            <View style={styles.cardsList}>
              {isLoading ? (
                <View style={styles.emptyState}>
                  <MaterialIcons
                    name="hourglass-empty"
                    size={48}
                    color={palette.secondary || "#666"}
                  />
                  <ThemedText style={styles.emptyTitle}>Loading cards...</ThemedText>
                </View>
              ) : availableCards.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons
                    name="credit-card"
                    size={48}
                    color={palette.secondary || "#666"}
                  />
                  <ThemedText style={styles.emptyTitle}>No cards available</ThemedText>
                  <ThemedText style={styles.emptyText}>
                    You don&apos;t have any cards to share. Add some cards first.
                  </ThemedText>
                </View>
              ) : (
                availableCards.map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    onPress={() => handleCardSelect(card.id)}
                    activeOpacity={0.7}
                    style={{ paddingHorizontal: 16, marginBottom: 12 }}
                  >
                    <View
                      style={[
                        styles.cardContainer,
                        {
                          backgroundColor: palette.card,
                          borderColor: selectedCardId === card.id ? palette.primary : "transparent",
                          borderWidth: selectedCardId === card.id ? 2 : 0,
                        },
                      ]}
                    >
                      {/* Custom card display for selection */}
                      <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>
                            {card.bank || card.cardName || `Unknown Bank`}
                          </ThemedText>
                          {card.cardKind && (
                            <View style={{
                              backgroundColor: palette.surface,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 12
                            }}>
                              <ThemedText style={{ fontSize: 12, textTransform: 'capitalize' }}>
                                {card.cardKind}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View>
                            <ThemedText style={{ fontSize: 18, fontFamily: 'monospace', letterSpacing: 1 }}>
                              •••• •••• •••• {card.cardNumber.slice(-4)}
                            </ThemedText>
                            <ThemedText style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>
                              {card.cardHolder}
                            </ThemedText>
                          </View>
                          <ThemedText style={{ fontSize: 14, fontFamily: 'monospace' }}>
                            {card.expiry}
                          </ThemedText>
                        </View>
                      </View>
                      {selectedCardId === card.id && (
                        <View style={[styles.selectedIndicator, { backgroundColor: palette.primary }]}>
                          <MaterialIcons name="check" size={16} color={palette.onPrimary} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>

          {!isLoading && availableCards.length > 0 && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  {
                    backgroundColor: selectedCardId ? palette.primary : palette.surface,
                  },
                ]}
                onPress={generateQRCode}
                disabled={!selectedCardId}
                activeOpacity={selectedCardId ? 0.8 : 1}
              >
                <MaterialIcons
                  name="qr-code"
                  size={20}
                  color={selectedCardId ? palette.onPrimary : palette.secondary || "#666"}
                />
                <ThemedText
                  style={[
                    styles.generateButtonText,
                    {
                      color: selectedCardId ? palette.onPrimary : palette.secondary || "#666",
                    },
                  ]}
                >
                  Generate QR Code
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.surface }]}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: palette.card }]}>
            <MaterialIcons name="share" size={48} color={palette.tint} />
          </View>

          <ThemedText type="title" style={styles.title}>
            Share Card
          </ThemedText>

          <ThemedText style={styles.description}>
            Enter the session code provided by the person receiving your card.
            This will securely share your card details.
          </ThemedText>

          <View style={[styles.inputContainer, { backgroundColor: palette.card }]}>
            <MaterialIcons name="code" size={20} color={palette.tint} />
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="Enter 6-character code"
              placeholderTextColor={palette.secondary || "#666"}
              value={sessionCode}
              onChangeText={setSessionCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleSessionCodeSubmit}
            />
            {sessionCode.length > 0 && (
              <TouchableOpacity
                onPress={() => setSessionCode("")}
                style={styles.clearButton}
              >
                <MaterialIcons name="clear" size={20} color={palette.secondary || "#666"} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.instructions}>
            <ThemedText style={styles.instructionTitle}>How it works:</ThemedText>
            <View style={styles.instructionItem}>
              <ThemedText style={styles.instructionNumber}>1</ThemedText>
              <ThemedText style={styles.instructionText}>
                Get the session code from the person receiving your card
              </ThemedText>
            </View>
            <View style={styles.instructionItem}>
              <ThemedText style={styles.instructionNumber}>2</ThemedText>
              <ThemedText style={styles.instructionText}>
                Enter the code above and select which card to share
              </ThemedText>
            </View>
            <View style={styles.instructionItem}>
              <ThemedText style={styles.instructionNumber}>3</ThemedText>
              <ThemedText style={styles.instructionText}>
                Generate and show the QR code for them to scan
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          {/* Debug button to check stored cards */}
          <TouchableOpacity
            style={[styles.debugButton, { backgroundColor: palette.secondary || "#666" }]}
            onPress={checkStoredCards}
            activeOpacity={0.8}
          >
            <ThemedText style={[styles.debugButtonText, { color: palette.onSecondary || "#fff" }]}>
              Debug: Check Cards
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.continueButton,
              {
                backgroundColor: sessionCode.length === 6 ? palette.primary : palette.surface,
              },
            ]}
            onPress={handleSessionCodeSubmit}
            disabled={sessionCode.length !== 6}
            activeOpacity={sessionCode.length === 6 ? 0.8 : 1}
          >
            <ThemedText
              style={[
                styles.continueButtonText,
                {
                  color: sessionCode.length === 6 ? palette.onPrimary : palette.secondary || "#666",
                },
              ]}
            >
              Continue
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { flex: 1, padding: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  selectionTitle: {
    fontSize: 28,
    flex: 1,
  },
  title: {
    textAlign: "center",
    marginBottom: 12,
    fontSize: 28,
  },
  description: {
    textAlign: "center",
    fontSize: 16,
    opacity: 0.8,
    lineHeight: 22,
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 18,
    marginLeft: 12,
    fontWeight: "500",
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  instructions: {
    marginTop: 16,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    color: "white",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 12,
    marginTop: 2,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  continueButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  debugButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  debugButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  cardsList: {
    flex: 1,
  },
  cardContainer: {
    borderRadius: 12,
    padding: 16,
    position: "relative",
  },
  selectedIndicator: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
