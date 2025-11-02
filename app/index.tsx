import AppButton from "@/components/AppButton";
import CardItem from "@/components/CardItem";
import InfoBox from "@/components/InfoBox";
import NoCards from "@/components/NoCards";
import { ThemedText } from "@/components/themed-text";
import { getAvatarById } from "@/constants/avatars";
import { Colors } from "@/constants/theme";
import { useAlert } from "@/context/AlertContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { maskAndFormatCardNumber } from "@/utils/mask";
import { DEFAULT_PROFILE, getProfile } from "@/utils/profileStorage";
import {
  getCards as secureGetCards,
  removeCard as secureRemoveCards,
} from "@/utils/secureStorage";
import { Image } from "expo-image";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
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
    }[]
  >([]);

  const router = useRouter();
  const [profileName, setProfileName] = useState<string>(DEFAULT_PROFILE.name);
  const [avatarSource, setAvatarSource] = useState<any>(
    (DEFAULT_PROFILE.avatarId && getAvatarById(DEFAULT_PROFILE.avatarId)) ||
      DEFAULT_PROFILE.avatarUrl
  );

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

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.surface }]}
      edges={["top", "bottom"]}
    >
      {/* Profile Section */}
      <View style={styles.profileContainer}>
        <Pressable onPress={() => router.push("/profile")}>
          <Image
            source={avatarSource}
            style={styles.avatar}
            contentFit="cover"
          />
        </Pressable>
        <View
          style={[
            styles.profileText,
            {
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            },
          ]}
        >
          <View>
            <ThemedText style={styles.greeting}>Hello,</ThemedText>
            <ThemedText type="title" style={styles.name}>
              {profileName}
            </ThemedText>
          </View>
        </View>
      </View>

      {cards.length !== 0 && (
        <View>
          <ThemedText type="title" style={styles.title}>
            Your Cards
          </ThemedText>
          <InfoBox
            message="⚠️ Please note: Your cards are stored only on this device. If you delete the app or clear its data, all saved cards will be lost permanently."
            type="warning"
            style={{ marginHorizontal: 16 }}
          />
        </View>
      )}

      {cards.length === 0 ? (
        <NoCards />
      ) : (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, flex: 1 }}>
          <FlatList
            data={cards}
            keyExtractor={(item) => item.id}
            renderItem={({
              item,
            }: {
              item: {
                id: string;
                cardNumber: string;
                cardHolder: string;
                expiry: string;
                cardName?: string;
                bank?: string;
              };
            }) => (
              <CardItem
                id={item.id}
                cardName={item.bank || item.cardName || `Unknown Bank`}
                cardNumber={maskAndFormatCardNumber(item.cardNumber)}
                cardHolder={item.cardHolder}
                expiry={item.expiry}
                onDelete={handleRemoveCard}
              />
            )}
          />
        </View>
      )}

      {/* Navigate to Add Card */}
      {cards.length !== 0 && (
        <Link href="/add-card" asChild>
          <AppButton
            title="Add New Card"
            fullWidth
            style={{ marginHorizontal: 16 }}
          />
        </Link>
      )}
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
  profileText: {
    marginLeft: 12,
  },
  greeting: {
    fontSize: 17,
    color: "#666",
  },
  name: {
    fontSize: 25,
    fontWeight: "bold",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cardContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  deleteButton: {
    marginTop: 8,
    alignSelf: "flex-end",
    backgroundColor: "#ff4d4f",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  deleteText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
