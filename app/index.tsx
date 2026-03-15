import AdBanner from "@/components/AdBanner";
import AppButton from "@/components/AppButton";
import CardItem from "@/components/CardItem";
import NoCards from "@/components/NoCards";
import IDGridItem from "@/components/IDGridItem";
import SwipeableCard from "@/components/SwipeableCard";
import { ThemedText } from "@/components/themed-text";
import { getAvatarById } from "@/constants/avatars";
import { SECURITY_SETTINGS_KEY } from "@/constants/storage";
import { Colors } from "@/constants/theme";
import { useAlert } from "@/context/AlertContext";
import { useTimer } from "@/context/CardContext";
import { Card, useCardsWithMigration as useCards } from "@/context/CardContextWithMigration";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useScreenProtection } from "@/hooks/useScreenProtection";
import { DEFAULT_PROFILE, getProfile } from "@/utils/profileStorage";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View, useWindowDimensions, Switch } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  useScreenProtection();
  const { showAlert } = useAlert();
  const { cards: contextCards, togglePin, refreshCards } = useCards();
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
  const [cards, setCards] = useState<(Card & { isExpiring?: boolean })[]>([]);

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

  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(windowWidth - 32); // Initial guess
  const [subContainerWidth, setSubContainerWidth] = useState(windowWidth - 32);

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

  const [viewMode, setViewMode] = useState<"cards" | "ids">("cards");
  const [ids, setIds] = useState<any[]>([]);

  const fetchIDs = useCallback(async () => {
    try {
      const { getIDs } = await import("@/utils/idStorage");
      const fetchedIDs = await getIDs();
      setIds(fetchedIDs);
    } catch (error) {
      console.error("Failed to fetch IDs:", error);
    }
  }, []);

  // Sync context cards to local state whenever context updates
  React.useEffect(() => {
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
        setCards(currentCards =>
          currentCards.map(card =>
            expiredCards.some(expired => expired.id === card.id)
              ? { ...card, isExpiring: true }
              : card
          )
        );

        setTimeout(async () => {
          setCards(currentCards =>
            currentCards.filter(card =>
              !expiredCards.some(expired => expired.id === card.id)
            )
          );
        }, 500);
      }
    } catch (error) {
      console.error("Failed to check expired cards:", error);
    }
  }, [cards]);

  // Check for expired cards every second
  React.useEffect(() => {
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

  // Load profile, settings, and IDs
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      checkSecuritySettings();
      fetchIDs();
    }, [fetchIDs])
  );


  const handlePinChange = React.useCallback(async (id: string, isPinned: boolean) => {
    try {
      await togglePin(id, isPinned);
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  }, [togglePin]);

  const viewModeIndicatorStyle = useAnimatedStyle(() => {
    const tabWidth = (containerWidth - 8) / 2;
    return {
      width: Math.max(tabWidth, 0),
      transform: [
        {
          translateX: tabWidth > 0 ? withSpring(viewMode === "cards" ? 0 : tabWidth, { damping: 20, stiffness: 120 }) : 0,
        },
      ],
    };
  }, [viewMode, containerWidth]);

  const tabIndicatorStyle = useAnimatedStyle(() => {
    const tabWidth = (subContainerWidth - 8) / 2;
    return {
      width: Math.max(tabWidth, 0),
      transform: [
        {
          translateX: tabWidth > 0 ? withSpring(activeTab === "self" ? 0 : tabWidth, { damping: 20, stiffness: 120 }) : 0,
        },
      ],
    };
  }, [activeTab, subContainerWidth]);

  const handleTabSwitch = useCallback((mode: "cards" | "ids") => {
    if (viewMode !== mode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setViewMode(mode);
    }
  }, [viewMode]);

  const handleSubTabSwitch = useCallback((tab: "self" | "other") => {
    if (activeTab !== tab) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveTab(tab);
    }
  }, [activeTab]);

  // Stable Header: profile, security alerts, and the main tab toggle
  // Does NOT depend on viewMode so will NOT re-render when switching tabs
  const StaticHeader = useMemo(
    () => (
      <>
        {/* Profile Section */}
        <View style={styles.profileContainer}>
          <Pressable onPress={handleProfilePress}>
            <Image
              source={avatarSource}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory"
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
      </>
    ),
    [avatarSource, profileName, isAppLockEnabled, isCardLockEnabled, router, handleProfilePress]
  );

  // Dynamic tabs + content header: depends on viewMode, cards, activeTab
  const DynamicHeader = useMemo(
    () => (
      <>
        {/* View Mode Toggle (Cards / IDs) */}
        <View
          style={[styles.tabContainer, { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1 }]}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View style={[styles.tabIndicator, viewModeIndicatorStyle, { backgroundColor: palette.surface }]} />
          <Pressable
            style={styles.tab}
            onPress={() => handleTabSwitch("cards")}
            hitSlop={5}
          >
            <ThemedText
              style={[
                styles.tabText,
                viewMode === "cards" && styles.activeTabText,
                { color: viewMode === "cards" ? palette.primary : palette.icon }
              ]}
            >
              Cards
            </ThemedText>
          </Pressable>
          <Pressable
            style={styles.tab}
            onPress={() => handleTabSwitch("ids")}
            hitSlop={5}
          >
            <ThemedText
              style={[
                styles.tabText,
                viewMode === "ids" && styles.activeTabText,
                { color: viewMode === "ids" ? palette.primary : palette.icon }
              ]}
            >
              IDs
            </ThemedText>
          </Pressable>
        </View>

        {/* Cards Specific Header */}
        {viewMode === "cards" && (
          <>
            <View style={styles.listHeaderTitleContainer}>
              <View style={[styles.titleRow, { justifyContent: 'space-between', width: '100%' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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

                {/* Switch moved to the title row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ThemedText style={{ fontSize: 13, fontWeight: '500', opacity: 0.8, color: palette.text }}>
                    Others
                  </ThemedText>
                  <Switch
                    value={activeTab === "other"}
                    onValueChange={(val: boolean) => handleSubTabSwitch(val ? "other" : "self")}
                    trackColor={{ false: "#767577", true: palette.primary }}
                    style={{ transform: [{ scale: 0.85 }] }}
                  />
                </View>
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
          </>
        )}

        {/* IDs Specific Header */}
        {viewMode === "ids" && (
          <View style={styles.listHeaderTitleContainer}>
            <View style={styles.titleRow}>
              <ThemedText type="title" style={styles.title}>
                Personal IDs
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
                  Your IDs are stored only on this device. If you delete the app or clear its data, all saved IDs will be lost permanently.
                </ThemedText>
              </View>
            </Modal>
          </View>
        )}
      </>
    ),
    [
      cards.length,
      activeTab,
      containerWidth,
      router,
      showWarning,
      tooltipTop,
      tooltipLeft,
      viewMode,
      viewModeIndicatorStyle,
      tabIndicatorStyle,
      palette,
      handleTabSwitch,
      handleSubTabSwitch,
    ]
  );

  // The FlatList only needs the dynamic portion (tabs + titles) as its header.
  // Profile section is rendered outside the FlatList to prevent re-renders on tab switch.
  const ListHeader = DynamicHeader;

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
      <CardItem
        id={item.id}
        cardName={item.bank || item.cardName || `Unknown Bank`}
        cardNumber={item.cardNumber}
        cardHolder={item.cardHolder}
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
  ), [handlePinChange]);

  const renderIDItem = React.useCallback(({ item }: { item: any }) => (
    <View style={{ flex: 1, maxWidth: "50%" }}>
      <IDGridItem item={item} />
    </View>
  ), []);

  const ListEmptyComponent = React.useMemo(() => {
    return (
      <NoCards
        showButton={viewMode === "cards" ? cards.length === 0 : ids.length === 0}
        message={
          viewMode === "cards"
            ? (cards.length === 0 ? "No cards listed yet." : `No cards found in ${activeTab === "self" ? "Self" : "Others"}.`)
            : "No ID documents stored yet."
        }
        buttonText={viewMode === "cards" ? "Add Your First Card" : "Add Your First ID"}
        onPress={() => router.push(viewMode === "cards" ? "/add-card" : "/add-id")}
      />
    );
  }, [cards.length, ids.length, viewMode, activeTab]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={["top"]}>
      {/* Profile + security alerts — rendered outside FlatList so they never re-render on tab switch */}
      {StaticHeader}

      <FlatList
        data={viewMode === "cards" ? filteredCards : ids}
        renderItem={viewMode === "cards" ? renderCardItem : renderIDItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmptyComponent}
        numColumns={viewMode === "ids" ? 2 : 1}
        key={viewMode} // Force re-render when switching layouts
        contentContainerStyle={{
          paddingBottom: 100,
        }}
        columnWrapperStyle={viewMode === "ids" ? { paddingHorizontal: 8 } : undefined}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button - Only show if list is not empty */}
      {(viewMode === "cards" ? cards.length > 0 : ids.length > 0) && (
        <View style={styles.stickyButtonContainer}>
          <AppButton
            title={viewMode === "cards" ? "Add New Card" : "Add New ID"}
            onPress={() => router.push(viewMode === "cards" ? "/add-card" : "/add-id")}
            icon={viewMode === "cards" ? "add-circle-outline" : "document-text-outline"}
            style={styles.footerButton}
          />
        </View>
      )}

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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  footerButton: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  stickyButtonContainer: {
    position: "absolute",
    bottom: 60, // Adjust to be above AdBanner
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    paddingTop: 12,
    zIndex: 99,
    elevation: 5,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    zIndex: 1,
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  activeTabText: {
    fontWeight: "800",
  },
});
