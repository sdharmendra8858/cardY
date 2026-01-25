import AdBanner from "@/components/AdBanner";
import AppButton from "@/components/AppButton";
import NoCards from "@/components/NoCards";
import SwipeableCard from "@/components/SwipeableCard";
import { ThemedText } from "@/components/themed-text";
import { getAvatarById } from "@/constants/avatars";
import { SECURITY_SETTINGS_KEY } from "@/constants/storage";
import { Colors } from "@/constants/theme";
import { useAlert } from "@/context/AlertContext";
import { useCards, useTimer } from "@/context/CardContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useScreenProtection } from "@/hooks/useScreenProtection";
import { DEFAULT_PROFILE, getProfile } from "@/utils/profileStorage";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  useScreenProtection();
  const { showAlert } = useAlert();
  const { cards: contextCards, removeCard, refreshCards } = useCards();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  // Only subscribe to timer if there are "other" cards with non-infinity expiry
  const hasExpiringOtherCards = React.useMemo(() => {
    return contextCards.some(card =>
      card.cardUser === "other" && card.cardExpiresAt !== undefined
    );
  }, [contextCards]);

  // Always call the hook (required by React rules), but only use it when needed
  const { timerTick } = useTimer();
  const [cards, setCards] = useState<
    {
      id: string;
      cardNumber: string;
      cardHolder: string;
      expiry: string;
      cardName?: string;
      bank?: string;
      cardKind?: "credit" | "debit";
      cobrandName?: string;
      cardUser?: "self" | "other";
      dominantColor?: string;
      cardExpiresAt?: number;
      isExpiring?: boolean; // For animation
      isPinned?: boolean; // Whether the card is pinned
    }[]
  >([]);

  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [tooltipTop, setTooltipTop] = useState(0);
  const [tooltipLeft, setTooltipLeft] = useState(0);
  const iconRef = useRef<View>(null);
  const [profileName, setProfileName] = useState<string>(DEFAULT_PROFILE.name);
  const [avatarSource, setAvatarSource] = useState<any>(
    (DEFAULT_PROFILE.avatarId && getAvatarById(DEFAULT_PROFILE.avatarId)) ||
    DEFAULT_PROFILE.avatarUrl
  );

  const [isAppLockEnabled, setIsAppLockEnabled] = useState(true);
  const [isCardLockEnabled, setIsCardLockEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<"self" | "other">("self");
  const isNavigatingRef = useRef(false);

  const handleProfilePress = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    router.push("/profile");

    // Reset navigation flag after a short delay
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);
  }, [router]);
  const { redirectToTab } = useLocalSearchParams<{ redirectToTab: "self" | "other" }>();

  // Handle redirection from other screens
  useEffect(() => {
    if (redirectToTab) {
      setActiveTab(redirectToTab);
    }
  }, [redirectToTab]);

  const [containerWidth, setContainerWidth] = useState(0);

  const checkSecuritySettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(SECURITY_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setIsAppLockEnabled(parsed.appLock ?? false);
        setIsCardLockEnabled(parsed.cardLock ?? false);
      } else {
        setIsAppLockEnabled(false);
        setIsCardLockEnabled(false);
      }
    } catch {
      // ignore
    }
  };

  // Sync context cards to local state whenever context updates
  React.useEffect(() => {
    // Only update if cards actually changed
    setCards(prevCards => {
      const cardsChanged = JSON.stringify(prevCards) !== JSON.stringify(contextCards);
      if (cardsChanged) {
        return contextCards;
      }
      return prevCards;
    });
  }, [contextCards]);

  // Check for expired cards and animate their removal
  const checkExpiredCards = React.useCallback(async () => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const expiredCards = cards.filter(card =>
        card.cardExpiresAt && now > card.cardExpiresAt && card.cardUser === "other" && !card.isExpiring
      );

      if (expiredCards.length > 0) {
        // Mark cards as expiring for animation
        setCards(currentCards =>
          currentCards.map(card =>
            expiredCards.some(expired => expired.id === card.id)
              ? { ...card, isExpiring: true }
              : card
          )
        );

        // Remove cards after animation delay
        setTimeout(async () => {
          setCards(currentCards =>
            currentCards.filter(card =>
              !expiredCards.some(expired => expired.id === card.id)
            )
          );

          // Clean up expired cards from storage
        }, 500); // 500ms animation delay
      }
    } catch (error) {
      console.error("Failed to check expired cards:", error);
    }
  }, [cards, showAlert]);

  // Check for expired cards every second (only when there are expiring cards)
  React.useEffect(() => {
    // Skip if no expiring cards exist
    if (!hasExpiringOtherCards) return;

    checkExpiredCards();
  }, [timerTick, checkExpiredCards, hasExpiringOtherCards]);

  const fetchProfile = async () => {
    try {
      const profile = await getProfile();
      setProfileName(profile.name);
      const resolved = profile.avatarId
        ? getAvatarById(profile.avatarId)
        : undefined;
      setAvatarSource(
        resolved || profile.avatarUrl || DEFAULT_PROFILE.avatarUrl
      );
    } catch {
      // fallback already set
    }
  };

  // Load profile and settings
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      checkSecuritySettings();
    }, [])
  );

  const handleRemoveCard = React.useCallback((id: string) => {
    showAlert({
      title: "Remove Card",
      message: "Are you sure you want to delete this card?",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await removeCard(id);
          },
        },
      ],
    });
  }, [showAlert, removeCard]);

  const handlePinChange = React.useCallback((id: string, isPinned: boolean) => {
    console.log(`🔄 handlePinChange called for card ${id} with isPinned: ${isPinned}`);

    // Find the card being pinned/unpinned
    const cardIndex = cards.findIndex(card => card.id === id);
    if (cardIndex === -1) {
      console.log(`❌ Card ${id} not found in current cards`);
      return;
    }

    const card = cards[cardIndex];
    console.log(`✅ Found card at index ${cardIndex}:`, card);

    const updatedCard = {
      ...card,
      isPinned,
    };
    console.log(`📝 Updated card:`, updatedCard);

    // Separate self and other cards
    const selfCards = cards.filter(c => !c.cardUser || c.cardUser === "self");
    const otherCards = cards.filter(c => c.cardUser === "other");
    console.log(`📊 Self cards: ${selfCards.length}, Other cards: ${otherCards.length}`);

    // Update the appropriate array
    let reorderedCards;
    if (!card.cardUser || card.cardUser === "self") {
      // Remove from self cards
      const selfWithoutCurrent = selfCards.filter(c => c.id !== id);

      let updatedSelfCards;
      if (isPinned) {
        // Check if we're exceeding max 3 pinned cards (count in ORIGINAL array)
        const pinnedCountInOriginal = selfCards.filter(c => c.isPinned).length;
        if (pinnedCountInOriginal >= 3) {
          // Find the oldest pinned card (LAST pinned card in the array, since newest are at top)
          let oldestPinnedIndex = -1;
          for (let i = selfCards.length - 1; i >= 0; i--) {
            if (selfCards[i].isPinned) {
              oldestPinnedIndex = i;
              break;
            }
          }
          if (oldestPinnedIndex !== -1) {
            const oldestPinnedCard = selfCards[oldestPinnedIndex];
            console.log(`📌 Max pinned cards (3) reached. Unpinning oldest card: ${oldestPinnedCard.id}`);
            // Update it in the filtered array
            const indexInFiltered = selfWithoutCurrent.findIndex(c => c.id === oldestPinnedCard.id);
            if (indexInFiltered !== -1) {
              selfWithoutCurrent[indexInFiltered] = {
                ...selfWithoutCurrent[indexInFiltered],
                isPinned: false,
              };
            }
          }
        }
        // Add new pinned card to top
        updatedSelfCards = [updatedCard, ...selfWithoutCurrent];
      } else {
        // Add unpinned card to bottom
        updatedSelfCards = [...selfWithoutCurrent, updatedCard];
      }

      // Combine with other cards
      reorderedCards = [...updatedSelfCards, ...otherCards];
      console.log(`🔄 Reordered SELF cards. New order:`, reorderedCards.map(c => ({ id: c.id, isPinned: c.isPinned })));
    } else {
      // Remove from other cards
      const otherWithoutCurrent = otherCards.filter(c => c.id !== id);

      let updatedOtherCards;
      if (isPinned) {
        // Check if we're exceeding max 3 pinned cards (count in ORIGINAL array)
        const pinnedCountInOriginal = otherCards.filter(c => c.isPinned).length;
        if (pinnedCountInOriginal >= 3) {
          // Find the oldest pinned card (LAST pinned card in the array, since newest are at top)
          let oldestPinnedIndex = -1;
          for (let i = otherCards.length - 1; i >= 0; i--) {
            if (otherCards[i].isPinned) {
              oldestPinnedIndex = i;
              break;
            }
          }
          if (oldestPinnedIndex !== -1) {
            const oldestPinnedCard = otherCards[oldestPinnedIndex];
            console.log(`📌 Max pinned cards (3) reached. Unpinning oldest card: ${oldestPinnedCard.id}`);
            // Update it in the filtered array
            const indexInFiltered = otherWithoutCurrent.findIndex(c => c.id === oldestPinnedCard.id);
            if (indexInFiltered !== -1) {
              otherWithoutCurrent[indexInFiltered] = {
                ...otherWithoutCurrent[indexInFiltered],
                isPinned: false,
              };
            }
          }
        }
        // Add new pinned card to top
        updatedOtherCards = [updatedCard, ...otherWithoutCurrent];
      } else {
        // Add unpinned card to bottom
        updatedOtherCards = [...otherWithoutCurrent, updatedCard];
      }

      // Combine with self cards
      reorderedCards = [...selfCards, ...updatedOtherCards];
      console.log(`🔄 Reordered OTHER cards. New order:`, reorderedCards.map(c => ({ id: c.id, isPinned: c.isPinned })));
    }

    // Persist to storage and refresh
    (async () => {
      console.log(`💾 Persisting ${reorderedCards.length} cards to storage...`);
      const { setCards: setCardsInStorage } = await import("@/utils/secureStorage");
      await setCardsInStorage(reorderedCards);
      console.log(`✅ Cards persisted to storage`);
      // Refresh cards from storage to sync context and local state
      await refreshCards();
      console.log(`🔄 Cards refreshed from storage after pin change`);
    })();
  }, [cards, refreshCards]);


  const tabIndicatorStyle = useAnimatedStyle(() => {
    const tabWidth = (containerWidth - 8) / 2;
    return {
      width: tabWidth > 0 ? tabWidth : "49%",
      transform: [
        {
          translateX: withSpring(activeTab === "self" ? 0 : tabWidth),
        },
      ],
    };
  });

  const ListHeader = useMemo(
    () => (
      <>
        {/* Profile Section */}
        <View style={styles.profileContainer}>
          <Pressable onPress={handleProfilePress}>
            <Image
              source={avatarSource}
              style={styles.avatar}
              contentFit="cover"
            />
          </Pressable>
          <View style={styles.profileTextWrapper}>
            <View>
              <ThemedText style={styles.greeting}>Hello,</ThemedText>
              <ThemedText type="title" style={styles.name}>
                {profileName}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Security Alerts */}
        {(!isAppLockEnabled || !isCardLockEnabled) && (
          <View style={styles.securityAlertContainer}>
            <View style={styles.securityAlertContent}>
              <View style={styles.securityAlertHeader}>
                <ThemedText style={styles.securityAlertEmoji}>🛡️</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: "#E65100" }}>
                  Security Recommendation
                </ThemedText>
              </View>
              <ThemedText style={styles.securityAlertText}>
                {!isAppLockEnabled && !isCardLockEnabled
                  ? "App Lock and Card Lock are disabled. Enable them to secure your data."
                  : !isAppLockEnabled
                    ? "App Lock is disabled. Enable it to prevent unauthorized access."
                    : "Card Lock is disabled. Enable it to protect card details."}
              </ThemedText>
              <Pressable
                onPress={() => router.push("/settings")}
                style={styles.securityAlertButton}
              >
                <ThemedText style={styles.securityAlertButtonText}>
                  Enable Security Features
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {/* Title and Info */}
        {cards.length !== 0 && (
          <View style={styles.listHeaderTitleContainer}>
            <View style={styles.titleRow}>
              <ThemedText type="title" style={styles.title}>
                Your Cards
              </ThemedText>
              <Pressable
                ref={iconRef}
                onPress={() => {
                  if (iconRef.current) {
                    iconRef.current.measure((_x, _y, _width, height, _px, py) => {
                      setTooltipTop(py + height);
                      setTooltipLeft(_px);
                      setShowWarning(true);
                    });
                  }
                }}
                hitSlop={20}
              >
                <Ionicons
                  name={showWarning ? "information-circle" : "information-circle-outline"}
                  size={22}
                  color={showWarning ? palette.primary : palette.icon}
                />
              </Pressable>
            </View>

            <Modal
              transparent
              visible={showWarning}
              onRequestClose={() => setShowWarning(false)}
              animationType="fade"
            >
              <Pressable
                style={styles.backdrop}
                onPress={() => setShowWarning(false)}
              />
              <View
                style={[styles.tooltipContainer, { top: tooltipTop + 5 }]}
              >
                <View style={[styles.tooltipArrow, { left: tooltipLeft - 20 - 8 + (22 / 2) }]} />
                <ThemedText style={styles.tooltipText}>
                  Your cards are stored only on this device. If you delete the app or clear its data, all saved cards will be lost permanently.
                </ThemedText>
              </View>
            </Modal>
          </View>
        )}

        {/* Tabs */}
        {cards.length > 0 && (
          <View
            style={styles.tabContainer}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
          >
            {/* Sliding Indicator */}
            <Animated.View style={[styles.tabIndicator, tabIndicatorStyle]} />
            <Pressable
              style={styles.tab}
              onPress={() => setActiveTab("self")}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === "self" && styles.activeTabText,
                ]}
              >
                Self
              </ThemedText>
            </Pressable>
            <Pressable
              style={styles.tab}
              onPress={() => setActiveTab("other")}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === "other" && styles.activeTabText,
                ]}
              >
                Others
              </ThemedText>
            </Pressable>
          </View>
        )}
      </>
    ),
    [
      avatarSource,
      profileName,
      isAppLockEnabled,
      isCardLockEnabled,
      cards.length,
      activeTab,
      containerWidth,
      router,
      showWarning,
      tooltipTop,
      tooltipLeft,
    ]
  );

  const filteredCards = React.useMemo(() => {
    return cards.filter((card) => {
      if (activeTab === "self") {
        return !card.cardUser || card.cardUser === "self";
      }
      return card.cardUser === "other";
    });
  }, [cards, activeTab]);

  const renderCardItem = React.useCallback(({ item }: { item: any }) => (
    <View style={{ paddingHorizontal: 16 }}>
      <SwipeableCard
        id={item.id}
        cardName={item.bank || item.cardName || `Unknown Bank`}
        cardNumber={item.cardNumber}
        cardHolder={item.cardHolder}
        onDelete={handleRemoveCard}
        cardKind={item.cardKind}
        cobrandName={item.cobrandName}
        cardUser={item.cardUser}
        dominantColor={item.dominantColor}
        cardExpiresAt={item.cardExpiresAt}
        expiry={item.expiry}
        isExpiring={item.isExpiring}
        isPinned={item.isPinned}
        onPinChange={handlePinChange}
      />
    </View>
  ), [handleRemoveCard, handlePinChange]);


  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.surface }]}
      edges={["top", "bottom"]}
    >
      <View style={{ flex: 1 }}>
        <FlatList
          data={filteredCards}
          keyExtractor={(item) => item.id}
          renderItem={renderCardItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={React.useMemo(() => {
            const EmptyComponent = () => (
              <NoCards
                showButton={cards.length === 0}
                message={
                  cards.length === 0
                    ? "No cards listed yet."
                    : `No cards found in ${activeTab === "self" ? "Self" : "Others"}.`
                }
              />
            );
            EmptyComponent.displayName = "EmptyCardsList";
            return EmptyComponent;
          }, [cards.length, activeTab])}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />

        {cards.length > 0 && (
          <View style={styles.stickyButtonContainer}>
            <Link href="/add-card" asChild>
              <AppButton
                title="Add New Card"
                fullWidth
                style={styles.footerButton}
              />
            </Link>
          </View>
        )}
      </View>

      <AdBanner />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f2f2f2" },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 50,
  },
  profileTextWrapper: {
    marginLeft: 12,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    fontSize: 17,
    color: "#666",
  },
  name: {
    fontSize: 25,
    fontWeight: "bold",
  },
  securityAlertContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  securityAlertContent: {
    backgroundColor: "#FFF4E5",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  securityAlertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  securityAlertEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  securityAlertText: {
    color: "#BF360C",
    marginBottom: 12,
    fontSize: 13,
  },
  securityAlertButton: {
    backgroundColor: "#E65100",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  securityAlertButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 13,
  },
  listHeaderTitleContainer: {
    marginBottom: 12,
    paddingHorizontal: 16,
    zIndex: 1000, // Ensure tooltip appears above list items
    elevation: 1000, // Android z-index equivalent
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginRight: 8,
  },
  tooltipContainer: {
    position: 'absolute',
    // top is set dynamically via style prop
    left: 20,
    right: 20,
    padding: 12,
    backgroundColor: '#FFF4E5', // Warning background
    borderRadius: 8,
    // Remove zIndex/elevation as Modal handles stacking
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  tooltipArrow: {
    position: 'absolute',
    top: -8,
    // left is set dynamically via style prop
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFF4E5', // Match warning background
  },
  tooltipText: {
    color: '#BF360C', // Warning text color
    fontSize: 13,
    lineHeight: 18,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  footerButton: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  stickyButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    paddingTop: 12,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#eee",
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
    zIndex: 1,
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    backgroundColor: "#fff",
    borderRadius: 6,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888",
  },
  activeTabText: {
    color: "#000",
  },
});
