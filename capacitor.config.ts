import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'seu.app.id',
  appName: 'PickingList',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false
  },
  plugins: {
    CapacitorHttp: {
      enabled: true 
    }
  }
};

export default config;
