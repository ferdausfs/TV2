import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor wrapper (feature 17): the SPA is bundled into the APK and served
 * from the device via the https scheme (so service-worker/secure-context APIs
 * behave like the hosted app). No live-reload server — the app is fully
 * client-side and talks straight to the Binance public endpoints.
 */
const config: CapacitorConfig = {
  appId: "com.ferdausfs.tv2",
  appName: "TV.2",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
