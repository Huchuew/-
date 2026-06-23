import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tuduk.rpg',
  appName: '투닥투닥RPG 2.0',
  webDir: 'dist',
  android: {
    backgroundColor: '#140a28',
  },
  ios: {
    backgroundColor: '#140a28',
    contentInset: 'automatic',
    scrollEnabled: false,
  },
  server: process.env.CAP_SERVER_URL
    ? { url: process.env.CAP_SERVER_URL, cleartext: true }
    : { androidScheme: 'https' },
};

export default config;
