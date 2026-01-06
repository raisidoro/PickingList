import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',  
  appName: 'PickingList',
  webDir: 'dist',

  server: {
    androidScheme: 'http',
    cleartext: true
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  },

  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true  
  }
};

export default config;
