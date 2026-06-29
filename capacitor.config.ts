import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.glikocontrol.app',
  appName: 'GlikoControl',
  webDir: 'dist',
  backgroundColor: '#00000000',
  plugins: {
    PushNotifications: {
      presentationOptions: [
        'badge',
        'sound',
        'alert'
      ]
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: [
        'google.com'
      ]
    },
    CapacitorUpdater: {
      autoUpdate: 'none',
      appId: 'com.glikocontrol.app',
      version: '0.0.0'
    }
  }
};

export default config;
