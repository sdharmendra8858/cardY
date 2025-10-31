import { ImageSource } from "expo-image";

export type AvatarCatalogItem = {
  id: string;
  source: ImageSource; // can be a remote URI string or a local require()
};

// To use local GIFs:
// 1) Place files under assets/avatars/
// 2) Replace the corresponding `source` entries below with require("../assets/avatars/<file>.gif")

export const AVATAR_CATALOG: AvatarCatalogItem[] = [
  { id: "ben-10", source: require("../assets/avatars/ben-10.gif") },
  { id: "cat-space", source: require("../assets/avatars/cat-space.gif") },
  { id: "gwen-stacy", source: require("../assets/avatars/gwen-stacy.gif") },
  {
    id: "ninja-hattori",
    source: require("../assets/avatars/ninja-hattori.gif"),
  },
  { id: "sensei-no", source: require("../assets/avatars/sensei-no.gif") },
  { id: "voy-de", source: require("../assets/avatars/voy-de.gif") },
];

export function getAvatarById(id: string): ImageSource | undefined {
  return AVATAR_CATALOG.find((x) => x.id === id)?.source;
}
