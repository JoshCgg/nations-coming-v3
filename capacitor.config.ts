import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.globalgates.prayforthecup',
  appName: 'Pray for the Cup',
  webDir: 'build',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  server: {
    allowNavigation: ['prayforthecup.com', '*.prayforthecup.com'],
    androidScheme: 'https',
  },
};

export default config;
