import AppButton from "@/components/AppButton";
import CardItem from "@/components/CardItem";
import InfoBox from "@/components/InfoBox";
import NoCards from "@/components/NoCards";
import { ThemedText } from "@/components/themed-text";
import { getAvatarById } from "@/constants/avatars";
import { SECURITY_SETTINGS_KEY } from "@/constants/storage";
import { Colors } from "@/constants/theme";
import { useAlert } from "@/context/AlertContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useScreenProtection } from "@/hooks/useScreenProtection";
import { maskAndFormatCardNumber } from "@/utils/mask";
import { DEFAULT_PROFILE, getProfile } from "@/utils/profileStorage";
import {
  getCards as secureGetCards,
  removeCard as secureRemoveCards,
} from "@/utils/secureStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  useScreenProtection();
  const { showAlert } = useAlert();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
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
    }[]
  >([]);

  const router = useRouter();
  const [profileName, setProfileName] = useState<string>(DEFAULT_PROFILE.name);
  const [avatarSource, setAvatarSource] = useState<any>(
    (DEFAULT_PROFILE.avatarId && getAvatarById(DEFAULT_PROFILE.avatarId)) ||
    DEFAULT_PROFILE.avatarUrl
  );

  const [isAppLockEnabled, setIsAppLockEnabled] = useState(true);
  const [isCardLockEnabled, setIsCardLockEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<"self" | "other">("self");
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

  const fetchCards = async () => {
    try {
      const cardList = await secureGetCards();

      setCards(cardList.map((c: any) => ({ id: c.id, ...c })));
    } catch (err) {
      console.error("Failed to load cards", err);
    }
  };

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

  // Load saved cards and profile
  useFocusEffect(
    useCallback(() => {
      fetchCards();
      fetchProfile();
      checkSecuritySettings();
    }, [])
  );

  const handleRemoveCard = (id: string) => {
    showAlert({
      title: "Remove Card",
      message: "Are you sure you want to delete this card?",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await secureRemoveCards(id);
            await fetchCards();
          },
        },
      ],
    });
  };

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
          <Pressable onPress={() => router.push("/profile")}>
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
            <ThemedText type="title" style={styles.title}>
              Your Cards
            </ThemedText>
            <InfoBox
              message="⚠️ Please note: Your cards are stored only on this device. If you delete the app or clear its data, all saved cards will be lost permanently."
              type="warning"
              style={{ marginHorizontal: 16, marginBottom: 12 }}
            />
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
    ]
  );

  const renderFooter = () => null;

  const filteredCards = cards.filter((card) => {
    if (activeTab === "self") {
      return !card.cardUser || card.cardUser === "self";
    }
    return card.cardUser === "other";
  });

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.surface }]}
      edges={["top", "bottom"]}
    >
      <View style={{ flex: 1 }}>
        <FlatList
          data={filteredCards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16 }}>
              <CardItem
                id={item.id}
                cardName={item.bank || item.cardName || `Unknown Bank`}
                cardNumber={maskAndFormatCardNumber(item.cardNumber)}
                cardHolder={item.cardHolder}
                expiry={item.expiry}
                onDelete={handleRemoveCard}
                cardKind={item.cardKind}
                cobrandName={item.cobrandName}
                cardUser={item.cardUser}
                dominantColor={item.dominantColor}
                cardExpiresAt={item.cardExpiresAt}
              />
            </View>
          )}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={() => (
            <NoCards
              message={
                cards.length === 0
                  ? "No cards listed yet."
                  : `No cards found in ${activeTab === "self" ? "Self" : "Others"}.`
              }
            />
          )}
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
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginBottom: 12,
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
