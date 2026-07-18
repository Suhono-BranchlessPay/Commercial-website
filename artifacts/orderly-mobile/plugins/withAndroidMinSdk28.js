/**
 * Square In-App Payments (card-entry 1.6.x) declares minSdk 28.
 * Expo defaults to 24 → EAS Android release fails at processReleaseMainManifest.
 */
const { withGradleProperties } = require("expo/config-plugins");

function withAndroidMinSdk28(config) {
  return withGradleProperties(config, (cfg) => {
    const key = "android.minSdkVersion";
    const props = cfg.modResults;
    const existing = props.find(
      (item) => item.type === "property" && item.key === key,
    );
    if (existing) {
      existing.value = "28";
    } else {
      props.push({ type: "property", key, value: "28" });
    }
    return cfg;
  });
}

module.exports = withAndroidMinSdk28;
