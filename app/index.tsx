import { showInterstitialAd } from "@/components/AdInterstitial";
import NativeAd from "@/components/AdNative";
import AppButton from "@/components/AppButton";
import CardItem from "@/components/CardItem";
import IDGridItem from "@/components/IDGridItem";
import NoCards from "@/components/NoCards";
import { ThemedText } from "@/components/themed-text";
import { getAvatarById } from "@/constants/avatars";
import { SECURITY_SETTINGS_KEY } from "@/constants/storage";
import { Colors } from "@/constants/theme";
import { useTimer } from "@/context/CardContext";
import { Card, useCardsWithMigration as useCards } from "@/context/CardContextWithMigration";
import { useIDs } from "@/context/IDContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useQuota } from "@/hooks/useQuota";
import { useScreenProtection } from "@/hooks/useScreenProtection";
import { DEFAULT_PROFILE, getProfile } from "@/utils/profileStorage";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Switch, View, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { redirectToTab, viewMode: paramViewMode } = useLocalSearchParams<{
    redirectToTab: "self" | "other",
    viewMode: "cards" | "ids"
  }>();

  const [viewMode, setViewMode] = useState<"cards" | "ids">(paramViewMode || "cards");

  // Enable screen protection only when viewing Personal IDs
  useScreenProtection(viewMode === 'ids');

  const { cards: contextCards, togglePin, refreshCards } = useCards();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  // Only subscribe to timer if there are "other" cards with non-infinity expiry
  const hasExpiringOtherCards = React.useMemo(() => {
    return contextCards.some(card =>
      card.cardUser === "other" && card.cardExpiresAt !== undefined
    );
  }, [contextCards]);

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
  const [isIDLockEnabled, setIsIDLockEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<"self" | "other">(redirectToTab || "self");
  const isNavigatingRef = useRef(false);

  const { ids, isLoading: isIdsLoading, hasLoaded: idsHasLoaded, refreshIDs } = useIDs();
  const { isQuotaExceeded, viewsCount, loading: quotaLoading, incrementViews, maxFreeViews } = useQuota('id');

  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [isAdWatched, setIsAdWatched] = useState(false);
  const [pendingIDId, setPendingIDId] = useState<string | null>(null);

  const handleProfilePress = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    router.push("/profile");

    // Reset navigation flag after a short delay
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);
  }, [router]);

  // Handle redirection from other screens
  useEffect(() => {
    if (redirectToTab) {
      setActiveTab(redirectToTab);
    }
    if (paramViewMode) {
      setViewMode(paramViewMode);
    }
  }, [redirectToTab, paramViewMode]);

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
        setIsIDLockEnabled(parsed.idLock ?? false);
      } else {
        setIsAppLockEnabled(false);
        setIsCardLockEnabled(false);
        setIsIDLockEnabled(false);
      }
    } catch {
      // ignore
    }
  };

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

  // Lazy load IDs only when the tab is active
  const retryTimeoutRef = useRef<any>(null);
  useEffect(() => {
    if (viewMode === 'ids' && !idsHasLoaded && !isIdsLoading) {
      // Small safeguard: ensure we don't spam refresh calls
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(() => {
        refreshIDs();
      }, 500);
    }
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [viewMode, idsHasLoaded, isIdsLoading, refreshIDs]);

  // Load profile and settings
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      checkSecuritySettings();
    }, [])
  );


  const handlePinChange = React.useCallback(async (id: string, isPinned: boolean) => {
    try {
      await togglePin(id, isPinned);
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  }, [togglePin]);

  const viewModeIndicatorStyle = useAnimatedStyle(() => {
    const tabWidth = containerWidth / 2;
    return {
      width: Math.max(tabWidth, 0),
      height: 3,
      bottom: 0,
      transform: [
        {
          translateX: tabWidth > 0 ? withSpring(viewMode === "cards" ? 0 : tabWidth, {
            damping: 20,
            stiffness: 150,
          }) : 0,
        },
      ],
    };
  }, [viewMode, containerWidth]);

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      flex: 1,
    };
  }, []);

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

  const handleIDPress = useCallback((id: string) => {
    if (isNavigatingRef.current) return;

    console.log(`📊 [Quota] View Count: ${viewsCount}/${maxFreeViews} | Exceeded: ${isQuotaExceeded}`);
    if (isQuotaExceeded && !isAdWatched) {
      setPendingIDId(id);
      setShowQuotaModal(true);
      return;
    }

    incrementViews();
    console.log(`📊 [Quota] View Granted! New Count: ${viewsCount + 1}/${maxFreeViews}`);
    isNavigatingRef.current = true;
    router.push({ pathname: "/id-details/[id]", params: { id: id, unlocked: 'true' } });
    setIsAdWatched(false);

    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);
  }, [isQuotaExceeded, isAdWatched, router, incrementViews, viewsCount, maxFreeViews]);

  const handleWatchAd = async () => {
    setIsAdLoading(true);
    setShowQuotaModal(false);
    try {
      await showInterstitialAd();
      setIsAdWatched(true);
      // Proceed to ID details
      if (pendingIDId) {
        console.log(`📊 [Quota] Incrementing view via Ad for ${pendingIDId}`);
        incrementViews();
        isNavigatingRef.current = true;
        router.push({ pathname: "/id-details/[id]", params: { id: pendingIDId, unlocked: 'true' } });
        setPendingIDId(null);
        setIsAdWatched(false);
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 1000);
      }
    } catch (err) {
      console.error("Ad failed to show:", err);
      Toast.show({
        type: "error",
        text1: "Ad Error",
        text2: "Failed to load ad. Please try again.",
      });
    } finally {
      setIsAdLoading(false);
    }
  };

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
        {(!isAppLockEnabled || !isCardLockEnabled || !isIDLockEnabled) && (
          <View style={styles.securityAlertContainer}>
            <View style={styles.securityAlertContent}>
              <View style={styles.securityAlertHeader}>
                <ThemedText style={styles.securityAlertEmoji}>🛡️</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: "#E65100" }}>
                  Security Recommendation
                </ThemedText>
              </View>
              <ThemedText style={styles.securityAlertText}>
                {!isAppLockEnabled && !isCardLockEnabled && !isIDLockEnabled
                  ? "App Lock, Card View, and ID View are disabled. Enable them to secure your data."
                  : !isAppLockEnabled
                    ? "App Lock is disabled. Enable it to prevent unauthorized access."
                    : !isCardLockEnabled && !isIDLockEnabled
                      ? "Card View and ID View are disabled. Enable them to protect your sensitive documents."
                      : !isIDLockEnabled
                        ? "ID View Lock is disabled. Enable it to protect your Personal IDs."
                        : "Card View Lock is disabled. Enable it to protect card details."}
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
    [avatarSource, profileName, isAppLockEnabled, isCardLockEnabled, isIDLockEnabled, router, handleProfilePress]
  );

  // Dynamic tabs + content header: Unified as a "Wrapper" unit
  const DynamicHeader = useMemo(
    () => (
      <View style={styles.headerWrapper}>
        {/* Main Tab Unit */}
        <View
          style={styles.tabContainer}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View style={[styles.tabIndicator, viewModeIndicatorStyle, { backgroundColor: palette.primary }]} />

          <Pressable
            style={styles.tab}
            onPress={() => handleTabSwitch("cards")}
            hitSlop={5}
          >
            <Animated.View style={[styles.tabContent]}>
              <Ionicons
                name={viewMode === "cards" ? "card" : "card-outline"}
                size={22}
                color={viewMode === "cards" ? palette.primary : palette.icon}
                style={styles.tabIcon}
              />
              <ThemedText
                style={[
                  styles.tabText,
                  viewMode === "cards" && styles.activeTabText,
                  { color: viewMode === "cards" ? palette.primary : palette.icon }
                ]}
              >
                Cards
              </ThemedText>
            </Animated.View>
          </Pressable>

          <Pressable
            style={styles.tab}
            onPress={() => handleTabSwitch("ids")}
            hitSlop={5}
          >
            <Animated.View style={[styles.tabContent]}>
              <Ionicons
                name={viewMode === "ids" ? "document-text" : "document-text-outline"}
                size={22}
                color={viewMode === "ids" ? palette.primary : palette.icon}
                style={styles.tabIcon}
              />
              <ThemedText
                style={[
                  styles.tabText,
                  viewMode === "ids" && styles.activeTabText,
                  { color: viewMode === "ids" ? palette.primary : palette.icon }
                ]}
              >
                IDs
              </ThemedText>
            </Animated.View>
          </Pressable>
        </View>

        {/* Contextual Sub-Header with Controls */}
        <View style={styles.subHeader}>
          <View style={styles.subHeaderTitleRow}>
            <ThemedText type="defaultSemiBold" style={styles.subHeaderTitle}>
              {viewMode === "cards" ? "Manage Your Cards" : "Personal IDs"}
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
              style={styles.infoIcon}
            >
              <Ionicons
                name={showWarning ? "information-circle" : "information-circle-outline"}
                size={20}
                color={showWarning ? palette.primary : palette.icon}
              />
            </Pressable>
          </View>

          {viewMode === "cards" && (
            <View style={styles.othersToggleContainer}>
              <ThemedText style={[styles.othersLabel, { color: palette.icon }]}>
                {activeTab === "self" ? "Self" : "Others"}
              </ThemedText>
              <Switch
                value={activeTab === "other"}
                onValueChange={(val: boolean) => handleSubTabSwitch(val ? "other" : "self")}
                trackColor={{ false: "#ccc", true: palette.primary }}
                ios_backgroundColor="#eee"
                style={{ transform: [{ scale: 0.8 }] }}
              />
            </View>
          )}
        </View>

        {/* Universal Tooltip Modal (Shared between Modes) */}
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
              {viewMode === "cards"
                ? "Your cards are stored only on this device. If you delete the app or clear its data, all saved cards will be lost permanently."
                : "Your personal IDs are encrypted and stored locally. No one, including the app developer, can access them without your master key."}
            </ThemedText>
          </View>
        </Modal>
      </View>
    ),
    [
      activeTab,
      containerWidth,
      showWarning,
      tooltipTop,
      tooltipLeft,
      viewMode,
      viewModeIndicatorStyle,
      palette,
      handleTabSwitch,
      handleSubTabSwitch,
    ]
  );

  const ListHeader = DynamicHeader;

  const filteredCards = React.useMemo(() => {
    const base = cards.filter((card) => {
      if (activeTab === "self") {
        return !card.cardUser || card.cardUser === "self";
      }
      return card.cardUser === "other";
    });

    // Inject ads
    const withAds: any[] = [];
    base.forEach((item, index) => {
      if (index > 0 && index % 5 === 0) {
        withAds.push({ id: `ad-${index}`, isAd: true });
      }
      withAds.push(item);
    });
    return withAds;
  }, [cards, activeTab]);

  const filteredIDs = React.useMemo(() => {
    const withAds: any[] = [];
    ids.forEach((item, index) => {
      // For 2-column IDs, we inject ad every 6 items (3 rows)
      if (index > 0 && index % 6 === 0) {
        withAds.push({ id: `ad-id-${index}`, isAd: true });
      }
      withAds.push(item);
    });
    return withAds;
  }, [ids]);

  const renderCardItem = React.useCallback(({ item }: { item: any }) => {
    if (item.isAd) {
      return <NativeAd />;
    }

    return (
      <View style={{ paddingHorizontal: 8 }}>
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
    );
  }, [handlePinChange]);

  const renderIDItem = React.useCallback(({ item }: { item: any }) => {
    if (item.isAd) {
      return (
        <View style={{ width: (windowWidth - 16) / 2 - 16, margin: 8 }}>
          <NativeAd />
        </View>
      );
    }

    return (
      <View style={{ width: (windowWidth - 16) / 2 }}>
        <IDGridItem item={item} onPress={handleIDPress} />
      </View>
    );
  }, [windowWidth, handleIDPress]);

  const ListEmptyComponent = React.useMemo(() => {
    if (viewMode === "ids" && isIdsLoading && ids.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <ThemedText style={[styles.loadingText, { color: palette.icon, marginTop: 12 }]}>
            Fetching your IDs...
          </ThemedText>
        </View>
      );
    }

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
  }, [cards.length, ids.length, viewMode, activeTab, isIdsLoading, palette]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={["top"]}>
      {/* Profile + security alerts — rendered outside FlatList so they never re-render on tab switch */}
      {StaticHeader}

      <Animated.View style={[{ flex: 1 }, animatedContentStyle]}>
        <FlatList
          data={viewMode === "cards" ? filteredCards : filteredIDs}
          renderItem={viewMode === "cards" ? renderCardItem : renderIDItem}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === "cards" ? 1 : 2}
          key={viewMode}
          columnWrapperStyle={viewMode === "ids" ? { justifyContent: "flex-start" } : undefined}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 80 + insets.bottom }
          ]}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmptyComponent}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      {/* Floating Action Button - Only show if list is not empty */}
      {(viewMode === "cards" ? cards.length > 0 : ids.length > 0) && (
        <View style={[styles.stickyButtonContainer, { bottom: 16 + insets.bottom }]}>
          <AppButton
            title={viewMode === "cards" ? "Add New Card" : "Add New ID"}
            onPress={() => router.push(viewMode === "cards" ? "/add-card" : "/add-id")}
            icon={viewMode === "cards" ? "add-circle-outline" : "document-text-outline"}
            style={styles.footerButton}
          />
        </View>
      )}

      <Modal
        visible={showQuotaModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQuotaModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowQuotaModal(false)}
        >
          <Pressable
            style={[styles.quotaModalContent, { backgroundColor: palette.card }]}
            onPress={(e: any) => e.stopPropagation()}
          >
            <View style={[styles.quotaIconContainer, { backgroundColor: `${palette.primary}15` }]}>
              <MaterialIcons name="security" size={40} color={palette.primary} />
            </View>

            <ThemedText type="subtitle" style={styles.quotaTitle}>Daily Limit Reached</ThemedText>

            <ThemedText style={styles.quotaDescription}>
              You've used your 5 free ID views for today. To keep Cardy Wall free and secure for everyone, please watch a short video to unlock this view.
            </ThemedText>

            <View style={styles.quotaInfoBox}>
              <MaterialIcons name="info-outline" size={16} color={palette.icon} />
              <ThemedText style={styles.quotaInfoText}>
                Your data remains encrypted locally. Ads help us maintain the infrastructure.
              </ThemedText>
            </View>

            <View style={styles.quotaActions}>
              <AppButton
                title={isAdLoading ? "Loading Ad..." : "Watch Video to Unlock"}
                onPress={handleWatchAd}
                disabled={isAdLoading}
                icon="play-circle-outline"
              />

              <Pressable
                style={styles.premiumButton}
                onPress={() => {
                  Toast.show({
                    type: "info",
                    text1: "Coming Soon!",
                    text2: "Premium for unlimited access is in development.",
                  });
                }}
              >
                <ThemedText style={[styles.premiumText, { color: palette.primary }]}>
                  Go Premium (Coming Soon)
                </ThemedText>
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                onPress={() => setShowQuotaModal(false)}
              >
                <ThemedText style={styles.cancelText}>Maybe Later</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
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
    // Removed AdBanner
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    paddingTop: 12,
    zIndex: 99,
    elevation: 5,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tabIcon: {
    marginTop: -1,
  },
  tabIndicator: {
    position: "absolute",
    height: 3,
    bottom: 0,
    left: 0,
  },
  subHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    paddingHorizontal: 4,
    minHeight: 40, // Stabilize height to prevent text shift when switch is hidden
  },
  subHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  infoIcon: {
    padding: 4,
  },
  othersToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    backgroundColor: "rgba(0,0,0,0.03)",
    paddingVertical: 4,
    paddingHorizontal: 0,
    borderRadius: 20,
  },
  othersLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  activeTabText: {
    fontWeight: "800",
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  quotaModalContent: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  quotaIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  quotaTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  quotaDescription: {
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 22,
    marginBottom: 20,
  },
  quotaInfoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  quotaInfoText: {
    fontSize: 12,
    flex: 1,
    opacity: 0.6,
  },
  quotaActions: {
    width: '100%',
    gap: 12,
  },
  premiumButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  premiumText: {
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    opacity: 0.5,
  },
});
