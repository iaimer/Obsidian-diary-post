import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.iaimer.litchijournal',
  appName: '荔枝日记',
  webDir: 'dist',
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      style: 'LIGHT',
      hidden: false,
      animation: 'NONE'
    }
  }
};

export default config;
