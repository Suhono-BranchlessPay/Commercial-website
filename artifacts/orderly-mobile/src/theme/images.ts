import { Image } from "expo-image";
import { tenant } from "../tenant";

/** Bundled Martinsville food photos (Samurai Project assets). */
const MARTINSVILLE_MENU = {
  "omg-roll.jpeg": require("../../tenants/samurai-martinsville/assets/menu/omg-roll.jpeg"),
  "sushi-platter.jpg": require("../../tenants/samurai-martinsville/assets/menu/sushi-platter.jpg"),
  "sweet-heart.jpeg": require("../../tenants/samurai-martinsville/assets/menu/sweet-heart.jpeg"),
  "beef-bento.jpeg": require("../../tenants/samurai-martinsville/assets/menu/beef-bento.jpeg"),
  "bento-box.jpeg": require("../../tenants/samurai-martinsville/assets/menu/bento-box.jpeg"),
  "beef-hibachi.jpeg": require("../../tenants/samurai-martinsville/assets/menu/beef-hibachi.jpeg"),
  "hibachi-chicken.jpeg": require("../../tenants/samurai-martinsville/assets/menu/hibachi-chicken.jpeg"),
  "crab-rangoon.jpeg": require("../../tenants/samurai-martinsville/assets/menu/crab-rangoon.jpeg"),
  "kani-salad.jpeg": require("../../tenants/samurai-martinsville/assets/menu/kani-salad.jpeg"),
  "seaweed-salad.jpeg": require("../../tenants/samurai-martinsville/assets/menu/seaweed-salad.jpeg"),
  "vegetable-roll.jpeg": require("../../tenants/samurai-martinsville/assets/menu/vegetable-roll.jpeg"),
  "chicken-bento.jpeg": require("../../tenants/samurai-martinsville/assets/menu/chicken-bento.jpeg"),
} as const;

const LOGOS = {
  "samurai-martinsville": require("../../tenants/samurai-martinsville/assets/brand/logo.png"),
  "samurai-linton": require("../../tenants/samurai-linton/assets/brand/logo.png"),
  kirin: require("../../tenants/kirin/assets/brand/logo.png"),
} as const;

export function tenantLogo() {
  return LOGOS[tenant.appId as keyof typeof LOGOS] ?? LOGOS["samurai-martinsville"];
}

export function resolveMenuImage(itemName: string, remoteUrl?: string | null) {
  if (remoteUrl) return { uri: remoteUrl };
  const file = tenant.menuImageMap[itemName];
  if (file && file in MARTINSVILLE_MENU) {
    return MARTINSVILLE_MENU[file as keyof typeof MARTINSVILLE_MENU];
  }
  return null;
}

export { Image };
