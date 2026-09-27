import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.indelify.app',
  appName: 'Indelify',
  webDir: 'dist',
  // Serve the app from https://localhost inside the WebView (not file://) so
  // Supabase auth cookies/storage and CORS behave like a normal https origin.
  server: {
    androidScheme: 'https',
  },
  // Only for local dev builds pointed at an http:// backend (e.g. the Android
  // emulator hitting http://10.0.2.2:8000) — the https WebView origin above
  // otherwise blocks that as mixed content. Never set this for a real build.
  android: {
    allowMixedContent: process.env.CAPACITOR_ALLOW_MIXED_CONTENT === '1',
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#100A0D',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
