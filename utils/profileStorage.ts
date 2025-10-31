import * as SecureStore from "expo-secure-store";
import { AVATAR_CATALOG } from "../constants/avatars";
import { generateRandomName } from "./random";

export type UserProfile = {
  name: string;
  avatarId?: string;
  avatarUrl?: string;
};

const PROFILE_KEY = "user_profile";

function getRandomAvatarId(): string | undefined {
  if (!AVATAR_CATALOG.length) return undefined;
  const idx = Math.floor(Math.random() * AVATAR_CATALOG.length);
  return AVATAR_CATALOG[idx]?.id ?? AVATAR_CATALOG[0]?.id;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: generateRandomName(),
  avatarId: getRandomAvatarId(),
};

export async function getProfile(): Promise<UserProfile> {
  try {
    const value = await SecureStore.getItemAsync(PROFILE_KEY, {
      keychainService: PROFILE_KEY,
    });
    if (!value) {
      const first = DEFAULT_PROFILE;
      await setProfile(first);
      return first;
    }
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      const name =
        typeof parsed.name === "string" ? parsed.name : DEFAULT_PROFILE.name;
      const avatarUrl =
        typeof parsed.avatarUrl === "string"
          ? parsed.avatarUrl
          : DEFAULT_PROFILE.avatarUrl;
      let avatarId =
        typeof parsed.avatarId === "string" ? parsed.avatarId : undefined;
      let didUpdate = false;
      if (!avatarId && !avatarUrl) {
        avatarId = getRandomAvatarId();
        didUpdate = true;
      }
      const result: UserProfile = { name, avatarUrl, avatarId };
      if (didUpdate) {
        await setProfile(result);
      }
      return result;
    }
    return DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function setProfile(profile: UserProfile): Promise<void> {
  const safeProfile: UserProfile = {
    name: profile.name?.trim() || DEFAULT_PROFILE.name,
    avatarUrl: profile.avatarUrl || DEFAULT_PROFILE.avatarUrl,
    avatarId: profile.avatarId,
  };
  await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(safeProfile), {
    keychainService: PROFILE_KEY,
  });
}
