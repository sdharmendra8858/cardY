// app/profile.tsx
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProfileScreen() {
  // Dummy profile data
  const user = {
    name: "John Doe",
    avatar: "https://i.pravatar.cc/150?img=12", // placeholder image
  };

  const navigation = useNavigation();
  const router = useRouter();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Profile" });
  }, [navigation]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {}}
            style={styles.editIcon}
          >
            <MaterialIcons name="edit" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>{user.name}</Text>
      </View>

      <View style={styles.menuCard}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push("/settings")}
        >
          <View style={styles.menuLeft}>
            <MaterialIcons name="settings" size={22} color="#3b82f6" />
            <Text style={styles.menuText}>Settings</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#bbb" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => router.push("/support")}
        >
          <View style={styles.menuLeft}>
            <MaterialIcons name="support-agent" size={22} color="#3b82f6" />
            <Text style={styles.menuText}>Support</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#bbb" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push({ pathname: "/settings/TermsScreen" })}
        >
          <View style={styles.menuLeft}>
            <MaterialIcons name="description" size={22} color="#3b82f6" />
            <Text style={styles.menuText}>Terms & Conditions</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#bbb" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() =>
            router.push({ pathname: "/settings/PrivacyPolicyScreen" })
          }
        >
          <View style={styles.menuLeft}>
            <MaterialIcons name="gavel" size={22} color="#3b82f6" />
            <Text style={styles.menuText}>Legal & Privacy</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#bbb" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f2" },
  profileHeader: {
    alignItems: "center",
    marginVertical: 32,
    padding: 0,
    backgroundColor: "transparent",
    borderRadius: 0,
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    elevation: 0,
  },
  avatarContainer: {
    width: 128,
    height: 128,
    marginBottom: 16,
    position: "relative",
    backgroundColor: "#eaf6ff",
    borderRadius: 64,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  editIcon: {
    position: "absolute",
    right: 6,
    bottom: 6,
    backgroundColor: "#3b82f6",
    borderRadius: 14,
    padding: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 3,
  },
  name: { fontSize: 24, fontWeight: "bold" },
  menuCard: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuText: { fontSize: 16 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e5e5e5",
  },
});
